/** The inspector's appearance section for the selected artwork. */
import { PROPERTY_GROUPS, fieldUnit } from '../../art/core/fields';
import { keyframeState } from '../keyframe-control';
import { renderWorldDirectionAuthoring } from '../world-direction-authoring';
import { clippingControls, peopleControls } from '../mobile-controls';
import { element, button, select, label } from '../controls';
import {
  type ChunkDocument,
  type AssetInstance,
  type Field,
  type Value,
} from '../../art/core/composition';
import { type Target } from '../../art/core/timeline';
import { LAYER_HINTS, LAYER_LABELS, VISUAL_LAYERS, isPlayerRow, layerRows } from '../layer-stack';
import type { Layer } from '../../art/core/composition';
import { copy, flatten, type Composer } from './context';

export function appearanceArea(app: Composer): Pick<Composer, 'renderAppearance'> {
  function renderAppearance(host: HTMLElement, node: AssetInstance) {
    app.displayedPropertyLinks = app.propertyLinkSignature(node);
    const art = app.config.registry.get(node.type),
      part = (title: string, open: boolean) => {
        const box = element('details', 'inspector-part'),
          inner = element('div'),
          key = node.type + ':' + title;
        box.open = app.inspectorFolds.get(key) ?? open;
        box.append(element('summary', '', title), inner);
        box.addEventListener('toggle', () => {
          if (!box.isConnected) return;
          app.inspectorFolds.set(key, box.open);
          try {
            localStorage.setItem(
              'access-denied.editor.inspector-folds',
              JSON.stringify([...app.inspectorFolds]),
            );
          } catch {
            /* Optional workspace preference. */
          }
        });
        host.append(box);
        return inner;
      };
    const canAnimate = !!app.sequence();
    const qualify = (target: Target): Target =>
      target.kind === 'camera' ||
      app.compositionDocument()?.id === app.viewCompositionDocument()?.id
        ? target
        : { ...target, scene: (app.compositionDocument()!.value as ChunkDocument).scene };
    host.append(
      element(
        'p',
        'muted',
        canAnimate
          ? 'Use the diamond to add or remove a key at the playhead. Colored diamonds indicate animation. Arrows jump between keys.'
          : 'Y is height above the floor; positive values move upward.',
      ),
    );
    const propertyRow = (
      parent: HTMLElement,
      name: string,
      target: Target,
      field: Field,
      base: Value,
      apply: (v: Value) => void,
    ) => {
      target = qualify(target);
      const track = canAnimate ? keyframeState(app.sequence()!, target, app.time).track : undefined;
      const value = canAnimate ? app.keyValue(app.inspectorFrame(), target).value : base;
      const control = app.fieldInput(field, value, (v) =>
        track ? app.addKey(target, v) : apply(v),
      );
      control.setAttribute('aria-label', name);
      if (target.kind === 'property') control.dataset.assetProperty = target.property;
      if (canAnimate) parent.append(label(name, app.animatedControl(control, target, name)));
      else {
        const row = element('div', 'animated-property'),
          icon = button('◇', () => {}, 'Animatable property: open a sequence to add keyframes');
        icon.className = 'property-key';
        icon.disabled = true;
        icon.setAttribute('aria-label', name + ' supports animation in a sequence');
        row.append(control, icon);
        parent.append(label(name, row));
      }
    };
    const position = part('Position', true);
    for (const [key, name, value, min] of [
      ['x', 'X', node.placement.x, undefined],
      ['h', 'Y', node.placement.h, undefined],
      ['scale', 'Scale', node.placement.scale ?? 1, 0.0001],
      ['parallax', 'Parallax', node.placement.parallax ?? 1, 0],
    ] as const) {
      propertyRow(
        position,
        name,
        { kind: 'instance', instance: node.id, property: key },
        { kind: 'number', label: name, default: value, ...(min !== undefined ? { min } : {}) },
        value,
        (v) =>
          app.editInstance('Change ' + key, (n) => (n.placement[key] = v as number), 'artwork'),
      );
    }
    propertyRow(
      position,
      'Facing',
      { kind: 'instance', instance: node.id, property: 'facing' },
      { kind: 'select', label: 'Facing', default: 1, options: [-1, 1] },
      node.placement.facing ?? 1,
      (v) =>
        app.editInstance('Change facing', (n) => (n.placement.facing = v as 1 | -1), 'artwork'),
    );
    if (canAnimate)
      for (const property of ['visible', 'opacity'] as const)
        propertyRow(
          position,
          property === 'visible' ? 'Visible' : 'Opacity',
          { kind: 'instance', instance: node.id, property },
          app.keyField({ kind: 'instance', instance: node.id, property }),
          property === 'visible' ? true : 1,
          (value) => app.addKey({ kind: 'instance', instance: node.id, property }, value),
        );
    const composed = app.compositionDocument()!;
    const drawn = art.parts.length > 0 || art.role === 'group',
      choices: Layer[] =
        art.framePhase === 'sky'
          ? ['distance']
          : isPlayerRow(node)
            ? ['playfield']
            : drawn
              ? [...VISUAL_LAYERS]
              : ['logic'];
    const pick = select(
      choices.map((v) => ({ value: v, label: LAYER_LABELS[v] })),
      node.layer,
      (v) =>
        app.run(() =>
          app.model.restack(
            composed.id,
            node.id,
            v as Layer,
            layerRows(composed.value as ChunkDocument, v as Layer).length,
          ),
        ),
    );
    if (choices.length < 2) (pick as HTMLSelectElement).disabled = true;
    pick.title = LAYER_HINTS[node.layer];
    position.append(label('Layer', pick));
    if (drawn)
      clippingControls(
        part('Visibility at chunk boundaries', false),
        node,
        app.editInstance,
        app.numberInput,
      );
    if (art.spatial?.reason) host.append(element('p', 'muted', art.spatial.reason));
    if (node.type === 'character.flow')
      peopleControls(
        part('People · spawn, route and sink', true),
        node,
        app
          .documentsForView()
          .filter((d) => d.kind === 'composition' && !(d.value as ChunkDocument).sequence)
          .map((d) => (d.value as ChunkDocument).scene),
        app.editInstance,
        app.numberInput,
      );
    const siblings = layerRows(composed.value as ChunkDocument, node.layer),
      at = siblings.findIndex((n) => n.id === node.id),
      stepper = element('div', 'row');
    const forward = button(
        'Bring forward',
        () => app.run(() => app.model.restack(composed.id, node.id, node.layer, at + 1)),
        'Draw in front of the next item in this layer',
      ),
      backward = button(
        'Send backward',
        () => app.run(() => app.model.restack(composed.id, node.id, node.layer!, at - 1)),
        'Draw behind the previous item in this layer',
      );
    forward.disabled = at >= siblings.length - 1;
    backward.disabled = at <= 0;
    stepper.append(backward, forward);
    position.append(stepper);
    if (node.type === 'sequence.world-control')
      renderWorldDirectionAuthoring(
        part('World direction', true),
        node,
        app.documentsForView(),
        app.editInstance,
        (e) => app.notice(String(e), true),
      );
    const fields = Object.entries(art.fields).filter(
      ([key]) =>
        node.type !== 'sequence.world-control' ||
        !['origin', 'zones', 'worldComposition'].includes(key),
    );
    if (fields.length) {
      const shown = app.config.registry.properties(node.type, node.props);
      for (const group of PROPERTY_GROUPS) {
        const entries = fields.filter(([, field]) => field.semantics?.group === group);
        if (!entries.length) continue;
        const section = part(group, true);
        for (const [key, field] of entries) {
          if (
            (node.type === 'character.flow' && (key === 'flow' || key === 'exit')) ||
            (field.showIf && !field.showIf(shown))
          )
            continue;
          const value = node.props[key] ?? field.default,
            name = field.label + (fieldUnit(field) ? ` (${fieldUnit(field)})` : '');
          const linked = app.resolvedArtwork(
            app.compositionDocument()?.id ?? app.currentId,
            node.id,
          )?.properties[key];
          if (linked?.readOnly) {
            const row = element('div', 'linked-property'),
              output = element(
                'output',
                '',
                String(linked.value) + (fieldUnit(field) ? ' ' + fieldUnit(field) : ''),
              );
            output.dataset.linkedProperty = key;
            output.setAttribute('aria-label', field.label + ' · linked value');
            row.append(label(field.label, output));
            const source = linked.source,
              owner =
                source &&
                app
                  .documentsForView()
                  .find(
                    (d) =>
                      d.kind === 'composition' && (d.value as ChunkDocument).scene === source.scene,
                  );
            if (source && owner)
              row.append(
                button(
                  'Edit shared ' + field.label,
                  () => {
                    if (owner.id !== app.compositionDocument()?.id) {
                      app.openInstance(owner.id, source.instance);
                      return;
                    }
                    app.editorSelection.document = owner.id;
                    app.editorSelection.instance = source.instance;
                    app.editorSelection.timeline = undefined;
                    app.refreshRight();
                    app.updateOutlineSelection();
                    void app.draw();
                  },
                  'Select ' + source.instance + ' · ' + source.property,
                ),
              );
            else
              row.append(
                element(
                  'p',
                  'muted',
                  'Controlled by ' +
                    (linked.binding ?? field.stateOverride?.state ?? 'prepared input') +
                    '.',
                ),
              );
            section.append(row);
            continue;
          }
          if (field.animatable)
            propertyRow(
              section,
              name,
              { kind: 'property', instance: node.id, property: key },
              field,
              value,
              (v) =>
                app.editInstance(
                  `Change ${field.label}`,
                  (n) => (n.props[key] = v),
                  art.spatial?.fields.includes(key) ? 'artwork' : 'all',
                ),
            );
          else {
            const control = app.fieldInput(field, value, (v) =>
              app.editInstance(
                `Change ${field.label}`,
                (n) => (n.props[key] = v),
                art.spatial?.fields.includes(key) ? 'artwork' : 'all',
              ),
            );
            control.dataset.assetProperty = key;
            section.append(label(name, control));
          }
          // A value set away from its default is marked, with a reset back to the default.
          if (
            node.props[key] !== undefined &&
            JSON.stringify(node.props[key]) !== JSON.stringify(field.default) &&
            section.lastElementChild
          ) {
            const row = section.lastElementChild,
              reset = button(
                '↺',
                () =>
                  app.editInstance(
                    `Reset ${field.label}`,
                    (n) => (n.props[key] = copy(field.default)),
                    art.spatial?.fields.includes(key) ? 'artwork' : 'all',
                  ),
                `Reset ${field.label} to its default`,
              );
            reset.className = 'reset-field';
            reset.setAttribute('aria-label', `Reset ${field.label}`);
            row.classList.add('changed');
            row.append(reset);
          }
        }
      }
      if (art.derived) {
        const section = part('Derived geometry', true);
        for (const value of Object.values(art.derived(shown))) {
          const output = element(
            'output',
            '',
            String(value.value) + (value.unit ? ' ' + value.unit : ''),
          );
          section.append(label(value.label, output));
        }
      }
    }
    if (canAnimate) {
      const fields = Object.entries(art.visualFields ?? {}).filter(([, field]) => field.animatable);
      if (fields.length) {
        const state = part('Animated state', true);
        for (const [property, field] of fields) {
          const target: Target = qualify({ kind: 'state', instance: node.id, property });
          state.append(
            label(
              field.label,
              app.animatedControl(
                app.fieldInput(field, app.keyValue(app.inspectorFrame(), target).value, (value) =>
                  app.addKey(target, value),
                ),
                target,
                field.label,
              ),
            ),
          );
        }
      }
    }
    if (art.libraryUse === 'reusable' && app.presetsDoc())
      app.renderPresets(part('Preset', false), node);
    const composition = app.compositionDocument()!.value as ChunkDocument,
      anchorDetails = part('Attachment and anchors', !!node.attach);
    const all = flatten(composition).filter((x) => x.node.id !== node.id),
      candidates = all.map((x) => x.node);
    // Generated parts of assemblies (windows, bays, trims) stay out of the list unless asked for or already chosen.
    const listed = all
        .filter(
          (x) => x.depth === 0 || app.showInternalAttach || x.node.id === node.attach?.instance,
        )
        .map((x) => x.node),
      internal = all.length - all.filter((x) => x.depth === 0).length;
    if (internal) {
      const box = element('input');
      box.type = 'checkbox';
      box.checked = app.showInternalAttach;
      box.onchange = () => {
        app.showInternalAttach = box.checked;
        app.refreshRight();
      };
      anchorDetails.append(label(`Show ${internal} internal parts`, box));
    }
    const attachTo = select(
      [
        { value: '', label: 'None / parent origin' },
        ...listed.map((n) => ({ value: n.id, label: n.id })),
      ],
      node.attach?.instance ?? '',
      (v) =>
        app.editInstance('Change attachment', (n) => {
          if (!v) {
            delete n.attach;
            return;
          }
          const owner = candidates.find((x) => x.id === v)!;
          const anchors = app.config.registry
            .get(owner.type)
            .anchors(app.config.registry.properties(owner.type, owner.props), {});
          const anchor = Object.keys(anchors)[0];
          if (!anchor) throw new Error('The selected owner exposes no anchors');
          n.attach = { instance: v, anchor };
        }),
    );
    anchorDetails.append(label('Attach to', attachTo));
    if (node.attach) {
      const owner = candidates.find((n) => n.id === node.attach!.instance);
      if (owner) {
        const anchors = app.config.registry
          .get(owner.type)
          .anchors(app.config.registry.properties(owner.type, owner.props), {});
        anchorDetails.append(
          label(
            'Owner anchor',
            select(
              Object.keys(anchors).map((v) => ({ value: v, label: `${v} · ${anchors[v].role}` })),
              node.attach.anchor,
              (v) => app.editInstance('Change anchor', (n) => (n.attach!.anchor = v)),
            ),
          ),
        );
      }
    }
    const ownAnchors = art.anchors(app.config.registry.properties(node.type, node.props), {});
    for (const [name, anchor] of Object.entries(ownAnchors))
      anchorDetails.append(
        element('p', 'muted', `${name}: (${anchor.x}, ${anchor.h}) · ${anchor.role}`),
      );
    anchorDetails.append(
      element(
        'p',
        'muted',
        'Attachment offsets are local. Changing an owner keeps the existing local offset; review the preview before saving.',
      ),
    );
    if (Object.keys(node.bindings ?? {}).length) {
      const choices =
          art.bindingIdentity === 'presentation' ? art.bindingChoices?.(composition) : undefined,
        binding = part(choices ? 'Visual inputs' : 'Gameplay bindings · read-only', false);
      for (const [key, value] of Object.entries(node.bindings ?? {})) {
        const sources = choices?.[key];
        if (sources) {
          binding.append(
            label(
              art.visualFields?.[key]?.label ?? key,
              select(
                sources.map((value) => ({ value, label: value })),
                value,
                (source) =>
                  app.editInstance('Rebind ' + key, (n) => {
                    n.bindings![key] = source;
                  }),
              ),
            ),
          );
        } else {
          const row = element('p', 'binding-row');
          row.append(element('span', 'muted', key), element('code', '', value));
          binding.append(row);
        }
      }
    }
  }
  return { renderAppearance };
}
