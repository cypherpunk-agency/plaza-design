/** The right dock: inspector, presets, linked properties, the asset picker and keyed fields. */
import { fieldUnit } from '../../art/core/fields';
import { inspectorTask, type InspectorTask } from '../inspector-task';
import { worldMemberAt, linkedWorldMembers } from '../world-members';
import {
  workspaceSource,
  editMemberConnection,
  renderWorldMemberInspector,
} from '../world-workspace-controls';
import { keyframeControl } from '../keyframe-control';
import { preparedChunkStatus } from '../../runtime/chunk-status';
import { renderChunkStatus } from '../chunk-status';
import { element, button, select, label } from '../controls';
import { renderTimelineInspector } from '../temporal-inspector';
import { perfBegin, perfEnd } from '../../runtime/diagnostics/performance';
import {
  type ChunkDocument,
  type AssetInstance,
  type Field,
  type Properties,
} from '../../art/core/composition';
import { evaluateTimeline, targetComposition, type Target } from '../../art/core/timeline';
import { mountAssetBrowser, type AssetEntry, type AssetPreset } from '../asset-browser';
import {
  PRESETS_DOCUMENT,
  presetId,
  presetProps,
  presetsFor,
  type KitPreset,
  type KitPresets,
} from '../kit-presets';
import type { WorkbenchContext, WorkbenchHandle } from '../contracts';
import { copy, flatten, message, type Composer } from './context';

export function inspectorArea(
  app: Composer,
): Pick<
  Composer,
  | 'mountArtwork'
  | 'liveContext'
  | 'inspectorContext'
  | 'openInspector'
  | 'renderInspectorMessages'
  | 'refreshRight'
  | 'renderPresets'
  | 'propertyLinkSignature'
  | 'guardLinkedProperties'
  | 'syncLinkedProperties'
  | 'openPicker'
  | 'closePicker'
  | 'renderPicker'
  | 'presetsDoc'
  | 'presetFamily'
  | 'addAtView'
  | 'editArray'
  | 'inspectorFrame'
  | 'animatedControl'
  | 'keyField'
  | 'cameraSelected'
> {
  /** The artwork browser, shared by Library › Artwork and the Scene view's Add asset picker (same filters, same session). */
  function mountArtwork(
    host: HTMLElement,
    scene: string,
    add: (entry: AssetEntry) => void,
    addPreset: (kit: AssetEntry, settings: Properties, children?: AssetInstance[]) => void,
  ) {
    return mountAssetBrowser(
      host,
      {
        registry: app.config.registry,
        documents: app.documentsForView(),
        openUsage(usage) {
          closePicker();
          app.openInstance(usage.document, usage.instance);
        },
        preview: (canvas, entry, usage, zoom, overrides) =>
          app.config.assetPreview!(canvas, entry, usage, app.documentsForView(), {
            time: app.time,
            reduced: app.reduced,
            environment: { ...app.environment, renderScale: zoom },
            ...overrides,
          }),
        fieldControl: app.fieldInput,
        ...(app.config.assetDistricts
          ? { districts: app.config.assetDistricts(app.documentsForView()) }
          : {}),
        ...(app.thumbnails
          ? { thumbnail: (entry: AssetEntry) => app.thumbnails!.thumbnail(entry) }
          : {}),
        ...(scene ? { useInScene: { label: `Add to ${app.sceneName(scene)}`, run: add } } : {}),
        ...(presetsDoc()
          ? {
              presets: {
                of: (kit: AssetEntry) =>
                  presetsFor(presetsDoc(), kit.id).map((pr) => ({
                    id: pr.id,
                    label: pr.label,
                    note: pr.note,
                    family: presetFamily(pr, kit),
                  })),
                add: (kit: AssetEntry, preset: AssetPreset) => {
                  const pr = presetsFor(presetsDoc(), kit.id).find((x) => x.id === preset.id);
                  if (pr) addPreset(kit, pr.props, pr.children);
                },
              },
            }
          : {}),
      },
      app.assetSession,
    );
  }
  /** Sections read the live documents, so a section's own refresh always sees the latest edit. */
  const liveContext = (scene: string): WorkbenchContext => ({
    get documents() {
      return app.documentsForView();
    },
    scene,
    get checkpoint() {
      return app.activeCheckpointId || app.worldState()?.id;
    },
    openCheckpoint: app.openCheckpoint,
    editCheckpoint: app.editCheckpoint,
    openScene: app.openScene,
    openInstance: app.openInstance,
    openConversation: app.openConversation,
    openRenderingSource: app.openRenderingSource,
    cityDistrict: app.cityDistrict,
    inspect: openInspector,
    authoring: app.authoringApi(),
  });
  const inspectorContext = () =>
    JSON.stringify([app.currentId, app.workspaceId, app.editorSelection]);
  function openInspector(request: InspectorTask) {
    app.showLayout();
    if (
      request.id &&
      app.inspectorDraft?.request.id === request.id &&
      app.inspectorDraft.selection === inspectorContext() &&
      app.inspectorDraft.version === app.model.sourceVersion
    ) {
      refreshRight();
      return;
    }
    app.inspectorError = '';
    const draft = {
      request,
      host: element('section'),
      selection: inspectorContext(),
      version: app.model.sourceVersion,
    };
    draft.host = inspectorTask(request, () => {
      if (app.inspectorDraft === draft) app.inspectorDraft = undefined;
      app.inspectorError = '';
      refreshRight();
      app.placeJoined();
    });
    app.inspectorDraft = draft;
    refreshRight();
    app.right.scrollTop = 0;
    app.placeJoined();
  }
  function renderInspectorMessages() {
    if (app.placementIssue) {
      const { address, reason } = app.placementIssue,
        source = workspaceSource(app.documentsForView());
      if (address.composition !== app.workspaceId) {
        app.placementIssue = undefined;
        return;
      }
      let location;
      try {
        location = worldMemberAt(source, address);
      } catch {
        app.placementIssue = undefined;
        return;
      }
      const { definition, member } = location,
        connections = definition.connections.filter(
          (c) => c.a.member === member.id || c.b.member === member.id,
        ),
        warning = element('section', 'inspector-warning');
      warning.setAttribute('role', 'alert');
      warning.append(
        element('h3', '', 'Move blocked · ' + member.id),
        element(
          'p',
          '',
          connections.length
            ? 'This member is connected to ' +
                linkedWorldMembers(definition, member.id)
                  .filter((id) => id !== member.id)
                  .join(', ') +
                '. Moving it alone would separate the connected endpoints. Your placement was not changed.'
            : 'This placement conflicts with a world constraint. Your placement was not changed.',
        ),
        element(
          'p',
          '',
          'Hold Shift while dragging to move connected members together, or edit a connection before rearranging them.',
        ),
      );
      if (address.child)
        warning.append(
          button('Select containing group', () =>
            app.selectWorldMember({ composition: address.composition, member: address.member }),
          ),
        );
      for (const connection of connections)
        warning.append(
          button('Select connection · ' + connection.id, () =>
            editMemberConnection(app.worldControls(), address, connection),
          ),
        );
      const details = element('details');
      details.append(element('summary', '', 'Technical details'), element('p', '', reason));
      warning.append(
        details,
        button('Dismiss warning', () => {
          app.placementIssue = undefined;
          refreshRight();
        }),
      );
      app.right.append(warning);
    } else if (app.inspectorError) {
      const warning = element('section', 'inspector-warning');
      warning.setAttribute('role', 'alert');
      warning.append(
        element('h3', '', 'Edit blocked'),
        element('p', '', app.inspectorError),
        button('Dismiss message', () => {
          app.inspectorError = '';
          refreshRight();
        }),
      );
      app.right.append(warning);
    }
  }
  function refreshRight() {
    app.updateCrumb();
    if (app.numericScrubbing) return;
    if (app.root.dataset.tool !== 'scene') {
      app.layoutDirty = true;
      app.propertyUpdates = [];
      app.chunkInspectorHandle?.();
      app.chunkInspectorHandle = undefined;
      app.disposeInspector();
      app.right.replaceChildren();
      return;
    }
    app.propertyUpdates = [];
    app.chunkInspectorHandle?.();
    app.chunkInspectorHandle = undefined;
    const node = app.selected(),
      scene = app.sceneId(),
      doc = app.compositionDocument();
    app.right.replaceChildren();
    if (!app.playHost.hidden && !app.editorSelection.chunk) {
      app.disposeInspector();
      app.right.append(app.playSettings);
      return;
    }
    renderInspectorMessages();
    if (
      app.inspectorDraft &&
      (app.inspectorDraft.selection !== inspectorContext() ||
        app.inspectorDraft.version !== app.model.sourceVersion)
    )
      app.inspectorDraft = undefined;
    if (app.inspectorDraft) {
      app.disposeInspector();
      app.right.append(app.inspectorDraft.host);
      return;
    }
    if (app.editorSelection.world) {
      const address = app.editorSelection.world,
        source = workspaceSource(app.documentsForView()),
        row = source.compositions[address.composition]?.members.find(
          (m) => m.id === address.member,
        );
      if (
        !row ||
        (address.child &&
          (!row.group || !source.groups[row.group].members.some((m) => m.id === address.child)))
      )
        app.editorSelection.world = undefined;
    }
    if (app.editorSelection.world) {
      app.disposeInspector();
      renderWorldMemberInspector(app.right, app.worldControls(), app.editorSelection.world);
      const source = worldMemberAt(
        workspaceSource(app.documentsForView()),
        app.editorSelection.world,
      ).member.chunk;
      if (source) {
        const sections =
            app.config
              .inspector?.(source, undefined, app.documentsForView())
              .filter((s) => s.id === 'chunk-connections' || s.id === 'scene') ?? [],
          handles: WorkbenchHandle[] = [];
        for (const section of sections) {
          const host = element('section');
          app.right.append(host);
          handles.push(section.mount(host, liveContext(source)));
        }
        app.chunkInspectorHandle = () => {
          for (const handle of handles) handle();
        };
      }
      return;
    }
    if (app.editorSelection.chunk) {
      const id = app.editorSelection.chunk,
        row =
          app.liveChunkRows?.find((r) => r.id === id) ??
          (!app.liveChunkRows ? preparedChunkStatus(id, app.sceneName(id)) : undefined);
      app.disposeInspector();
      if (row)
        renderChunkStatus(
          app.right,
          row,
          () => {
            app.editorSelection.chunk = undefined;
            refreshRight();
          },
          app.playHost.hidden
            ? () => {
                app.editorSelection.chunk = undefined;
                app.openScene(id);
              }
            : undefined,
        );
      else
        app.right.append(
          element('p', 'muted', 'Waiting for this chunk in the next runtime snapshot.'),
        );
      return;
    }
    if (app.editorSelection.timeline?.kind === 'camera' && !app.sequence()) {
      app.disposeInspector();
      app.right.append(
        element('h2', '', 'Game camera'),
        element(
          'p',
          'muted',
          'Base preview camera. This is distinct from editor pan/zoom. Normal gameplay follows the player; a selected sequence can direct this same frame. These preview settings do not author a new camera entity.',
        ),
      );
      for (const [key, name] of [
        ['cameraX', 'Camera X'],
        ['cameraH', 'Camera Y'],
      ] as const) {
        const input = app.numberInput(Number(app.environment[key] ?? 0), (value) => {
          app.environment[key] = value;
          void app.draw();
        });
        input.setAttribute('aria-label', name);
        app.right.append(label(name, input));
      }
      const zoom = app.numberInput(
        Number(app.environment.zoom ?? 1),
        (value) => {
          app.environment.zoom = value;
          void app.draw();
        },
        0.1,
      );
      zoom.max = '8';
      zoom.setAttribute('aria-label', 'Game camera zoom');
      app.right.append(label('Game camera zoom', zoom));
      app.right.append(
        element('p', 'muted', 'Logical frame: ' + app.baseWidth + ' × ' + app.baseHeight),
        button('Locate camera', app.locateCamera),
        button(app.cameraPreview ? 'Return to Workspace' : 'Look through camera', () => {
          app.cameraPreview = !app.cameraPreview;
          app.refreshOptions();
          app.refreshViewportTools();
          refreshRight();
          void app.draw();
        }),
      );
      return;
    }
    if (
      app.editorSelection.timeline &&
      renderTimelineInspector(app.right, {
        selection: app.editorSelection.timeline,
        sequence: app.sequence(),
        commandTargets: app.commandTargets(),
        time: app.time,
        playing: app.playing,
        fieldInput: app.fieldInput,
        numberInput: app.numberInput,
        keyField,
        keyValue: app.keyValue,
        editTimeline: app.editTimeline,
        addKey: app.addKey,
        animatedControl,
        selectTimeline: app.selectTimeline,
        seekTime: app.seekTime,
        notice: app.notice,
        setSelection: (value) => {
          app.editorSelection.timeline = value;
        },
        close: () => {
          app.editorSelection.timeline = undefined;
          refreshRight();
          app.refreshTimeline();
        },
        getFrame: () =>
          evaluateTimeline(
            app.currentTimeline()!,
            app.sequenceId,
            app.time,
            app.evaluationContext(),
            { reduced: app.reduced },
          ),
      })
    ) {
      app.disposeInspector();
      return;
    }
    app.inspector.render(app.right, {
      node,
      scene,
      doc,
      sceneName: app.sceneName(scene),
      sharedSource:
        !!app.editorSelection.document && app.editorSelection.document !== app.currentId,
      registry: app.config.registry,
      duplicate: () =>
        app.run(() => {
          app.editorSelection.instance = app.model.duplicate(doc!.id, app.editorSelection.instance);
        }),
      remove: app.deleteSelected,
      deselect: () => app.select_(''),
      openSource: () => app.openDocument(app.editorSelection.document),
      refresh: refreshRight,
      resolved: () => {
        const data = app.resolvedArtwork(doc!.id, node?.id ?? '');
        return data && node ? { ...data, authored: node.placement } : undefined;
      },
      visibility: {
        missingReason: () =>
          app.hiddenIn(doc!.id).has(node?.id ?? '')
            ? 'Hidden with the outline eye. Use its eye button to show it again.'
            : undefined,
        showBoundary: () => app.showDrawingBoundary(),
      },
      sections: () =>
        scene && app.config.inspector
          ? app.config.inspector(scene, node, app.documentsForView())
          : [],
      context: () => liveContext(scene),
      appearance: app.renderAppearance,
    });
  }
  /** Save this kit piece's settings as a named preset, or update, rename and delete this kit's presets. */
  function renderPresets(host: HTMLElement, node: AssetInstance) {
    const doc = presetsDoc()!,
      mine = presetsFor(doc, node.type),
      settings = presetProps(
        app.config.registry,
        node.type,
        app.config.registry.properties(node.type, node.props),
      );
    const editPresets = (labelText: string, change: (d: KitPresets) => void) =>
      app.run(() =>
        app.model.edit(PRESETS_DOCUMENT, labelText, (value) => {
          const next = copy(value) as KitPresets;
          change(next);
          return next;
        }),
      );
    const children = node.type === 'assembly.group' ? node.children : undefined;
    const same = mine.find(
      (p) =>
        JSON.stringify(
          presetProps(
            app.config.registry,
            node.type,
            app.config.registry.properties(node.type, p.props),
          ),
        ) === JSON.stringify(settings) && JSON.stringify(p.children) === JSON.stringify(children),
    );
    host.append(
      element(
        'p',
        'muted',
        same
          ? `These settings are the preset “${same.label}”.`
          : 'A preset saves these settings under a name; Add asset lists it under this kit.',
      ),
    );
    const name = element('input');
    name.type = 'text';
    name.placeholder = 'Preset name';
    name.setAttribute('aria-label', 'Preset name');
    host.append(
      label('Name', name),
      button('Save as new preset', () => {
        const text = name.value.trim();
        if (!text) {
          app.notice('Give the preset a name first.', true);
          return;
        }
        editPresets('Save preset', (d) => {
          d.presets.push({
            id: presetId(d, text),
            label: text,
            kit: node.type,
            props: settings,
            ...(children ? { children: copy(children) } : {}),
          });
        });
      }),
    );
    if (!mine.length) return;
    let chosen = same?.id ?? mine[0].id;
    const pick = select(
      mine.map((p) => ({ value: p.id, label: p.label })),
      chosen,
      (v) => {
        chosen = v;
      },
    );
    host.append(label('Existing preset', pick));
    const row = element('div', 'row');
    row.append(
      button(
        'Update with these settings',
        () =>
          editPresets('Update preset', (d) => {
            const p = d.presets.find((p) => p.id === chosen)!;
            p.props = settings;
            if (children) p.children = copy(children);
            else delete p.children;
          }),
        'Replace the chosen preset’s settings with this piece’s',
      ),
      button(
        'Rename',
        () => {
          const text = name.value.trim();
          if (!text) {
            app.notice('Type the new name in Name first.', true);
            return;
          }
          editPresets('Rename preset', (d) => {
            d.presets.find((p) => p.id === chosen)!.label = text;
          });
        },
        'Give the chosen preset the name typed above',
      ),
      button(
        'Delete',
        () =>
          editPresets('Delete preset', (d) => {
            d.presets = d.presets.filter((p) => p.id !== chosen);
          }),
        'Delete the chosen preset (pieces placed from it stay as they are)',
      ),
    );
    host.append(row);
  }
  function propertyLinkSignature(node: AssetInstance) {
    const fields = app.config.registry.get(node.type).fields,
      values = app.resolvedArtwork(
        app.compositionDocument()?.id ?? app.currentId,
        node.id,
      )?.properties;
    return JSON.stringify(
      Object.entries(fields)
        .filter(([, f]) => f.stateOverride)
        .map(([key]) => [key, !!values?.[key]?.readOnly, values?.[key]?.source ?? null]),
    );
  }
  function guardLinkedProperties(
    document: string,
    node: AssetInstance,
    before: Properties,
    bindings: AssetInstance['bindings'],
  ) {
    const values = app.resolvedArtwork(document, node.id)?.properties;
    for (const [key, field] of Object.entries(app.config.registry.get(node.type).fields))
      if (
        field.stateOverride &&
        values?.[key]?.readOnly &&
        (before[key] ?? field.default) !== (node.props[key] ?? field.default) &&
        node.bindings?.[field.stateOverride.state] === bindings?.[field.stateOverride.state]
      )
        throw Error(field.label + ' is linked. Edit its shared source parameter instead.');
  }
  function syncLinkedProperties() {
    const node = app.selected();
    if (
      !node ||
      !Object.values(app.config.registry.get(node.type).fields).some((f) => f.stateOverride)
    )
      return;
    if (propertyLinkSignature(node) !== app.displayedPropertyLinks) {
      refreshRight();
      return;
    }
    const values = app.resolvedArtwork(
      app.compositionDocument()?.id ?? app.currentId,
      node.id,
    )?.properties;
    for (const output of app.right.querySelectorAll<HTMLOutputElement>(
      'output[data-linked-property]',
    )) {
      const key = output.dataset.linkedProperty!,
        unit = fieldUnit(app.config.registry.get(node.type).fields[key]),
        value = values?.[key]?.value;
      if (value === undefined) continue;
      const text = String(value) + (unit ? ' ' + unit : '');
      if (output.textContent !== text) output.textContent = text;
    }
  }
  function openPicker() {
    if (app.current()?.kind !== 'composition' || !app.config.assetPreview) return;
    app.picker.style.setProperty(
      '--picker-top',
      `${Math.round(app.workspace.getBoundingClientRect().top + 8)}px`,
    );
    app.picker.hidden = false;
    renderPicker();
    app.picker.querySelector<HTMLInputElement>('input[type=search]')?.focus();
  }
  function closePicker() {
    if (app.picker.hidden) return;
    app.picker.hidden = true;
    app.cleanupPicker?.();
    app.cleanupPicker = undefined;
    app.picker.replaceChildren();
    app.thumbnails?.prune();
  }
  /** Add asset shows the Library's browser over the stage: pick with its button or a double-click on a card. */
  function renderPicker() {
    const scene = app.sceneId(),
      head = element('div', 'picker-head'),
      body = element('div', 'picker-browser');
    head.append(
      element('strong', '', `Add asset to ${app.sceneName(scene)}`),
      element('span', 'muted', 'Double-click a piece, or select it and use Add'),
      button('✕', closePicker, 'Close (Esc)'),
    );
    app.picker.replaceChildren(head, body);
    app.cleanupPicker?.();
    app.cleanupPicker = mountArtwork(
      body,
      scene,
      (entry) => {
        closePicker();
        void addAtView(entry.id);
      },
      (kit, settings, children) => {
        closePicker();
        void addAtView(kit.id, settings, children);
      },
    );
  }
  /** The editable kit presets document, when this editor has one. */
  const presetsDoc = () =>
    app.documentsForView().find((d) => d.id === PRESETS_DOCUMENT)?.value as KitPresets | undefined;
  /** A people-kit preset is a human, an animal or a robot by its body kind; other presets share their kit's kind. */
  const presetFamily = (preset: KitPreset, kit: AssetEntry) =>
    kit.id !== 'character.resident'
      ? kit.family
      : preset.props.kind === undefined || preset.props.kind === 'human'
        ? 'Human'
        : ['cat', 'pigeon', 'gull', 'crab'].includes(String(preset.props.kind))
          ? 'Animal'
          : 'Robot';
  async function addAtView(
    type: string,
    settings?: Properties,
    children?: AssetInstance[],
    clientX?: number,
  ) {
    const token = perfBegin('editor.add');
    try {
      const doc = app.compositionDocument();
      if (!doc || app.current()?.kind !== 'composition') {
        app.notice('Open a chunk to add assets.', true);
        return;
      }
      let x = 0;
      try {
        // Draw the new piece once off-screen at x = 0, then move it by its measured distance to the centre of the view.
        const draft = app.model.draftAdd(doc.id, type, settings, children),
          probe = element('canvas');
        probe.width = app.canvas.width;
        probe.height = app.canvas.height;
        const result = await app.config.preview.render(
            probe,
            app.previewRequest(draft.composition, false),
          ),
          box = result.bounds.find((b) => b.id === draft.instanceId);
        if (box && result.deltaToLocal) {
          const rect = app.canvas.getBoundingClientRect(),
            view = app.stage.getBoundingClientRect(),
            centre =
              (((clientX ??
                (Math.max(rect.left, view.left) + Math.min(rect.right, view.right)) / 2) -
                rect.left) *
                app.canvas.width) /
              Math.max(1, rect.width);
          x = result.deltaToLocal(draft.instanceId, centre - (box.x + box.width / 2), 0).x;
        }
      } catch {
        x = 0;
      }
      x = app.snap ? Math.round(x / app.snap) * app.snap : Math.round(x);
      let added = false;
      app.run(() => {
        app.editorSelection.instance = app.model.add(doc.id, type, { x, h: 0 }, settings, children);
        app.inspector.appearance();
        added = true;
      });
      if (added) {
        app.notice(
          `Added ${app.config.registry.get(type).label}. Drag it into place or set its position in the inspector.`,
        );
      }
    } finally {
      perfEnd(token);
    }
  }
  function editArray<T>(
    container: HTMLElement,
    title: string,
    value: T,
    apply: (v: T) => void,
    help?: string,
  ) {
    const details = element('details');
    details.append(element('summary', '', title));
    if (help) details.append(element('p', 'muted', help));
    const input = element('textarea');
    input.value = JSON.stringify(value, null, 2);
    input.setAttribute('aria-label', title + ' JSON');
    details.append(
      input,
      button('Apply ' + title.toLowerCase(), () => {
        try {
          apply(JSON.parse(input.value) as T);
        } catch (e) {
          app.notice(`Invalid ${title.toLowerCase()}: ${message(e)}`, true);
        }
      }),
    );
    container.append(details);
  }
  function inspectorFrame() {
    if (
      !app.cachedInspectorFrame ||
      app.cachedInspectorFrame.document !== app.currentId ||
      app.cachedInspectorFrame.time !== app.time ||
      app.cachedInspectorFrame.version !== app.model.sourceVersion ||
      app.cachedInspectorFrame.sequence !== app.sequenceId ||
      app.cachedInspectorFrame.reduced !== app.reduced
    )
      app.cachedInspectorFrame = {
        document: app.currentId,
        time: app.time,
        version: app.model.sourceVersion,
        sequence: app.sequenceId,
        reduced: app.reduced,
        frame: evaluateTimeline(
          app.currentTimeline()!,
          app.sequenceId,
          app.time,
          app.evaluationContext(),
          {
            reduced: app.reduced,
          },
        ),
      };
    return app.cachedInspectorFrame.frame;
  }
  function animatedControl(control: HTMLElement, target: Target, name: string) {
    return keyframeControl(control, target, name, {
      sequence: () => app.sequence()!,
      time: () => app.time,
      playing: () => app.playing,
      value: () => app.keyValue(inspectorFrame(), target).value,
      addKey: app.addKey,
      seekTime: app.seekTime,
      editTimeline: app.editTimeline,
      update: (fn) => app.propertyUpdates.push(fn),
    });
  }
  function keyField(target: Target): Field {
    if (target.kind === 'property' || target.kind === 'state' || target.kind === 'clip') {
      const source = targetComposition(
          app.evaluationContext(),
          app.viewCompositionDocument()!.value as ChunkDocument,
          target,
        ),
        node = flatten(source).find((n) => n.node.id === target.instance)!.node,
        entry = app.config.registry.get(node.type);
      if (target.kind === 'clip')
        return {
          kind: 'select',
          label: 'Clip',
          default: '',
          options: [...(app.config.clips?.[node.type] ?? [])],
        };
      return (target.kind === 'property' ? entry.fields : entry.visualFields!)[target.property];
    }
    if (target.kind === 'instance' && target.property === 'visible')
      return { kind: 'boolean', label: 'Visible', default: true };
    if (target.kind === 'instance' && target.property === 'facing')
      return { kind: 'select', label: 'Facing', default: 1, options: [-1, 1] };
    return {
      kind: 'number',
      label:
        target.kind === 'camera'
          ? target.property === 'h'
            ? 'Camera Y'
            : target.property === 'x'
              ? 'Camera X'
              : 'Camera zoom'
          : target.property === 'x'
            ? 'X'
            : target.property === 'h'
              ? 'Y'
              : 'Value',
      default: 0,
      ...(target.property === 'zoom' || target.property === 'scale'
        ? { min: 0.0001 }
        : target.property === 'opacity'
          ? { min: 0, max: 1 }
          : {}),
    };
  }
  function cameraSelected(): boolean {
    if (app.editorSelection.timeline?.kind === 'camera') return true;
    if (
      app.editorSelection.timeline?.kind === 'track' ||
      app.editorSelection.timeline?.kind === 'key'
    )
      return (
        app
          .sequence()
          ?.tracks.find((t) => t.id === (app.editorSelection.timeline as { track: string }).track)
          ?.target.kind === 'camera'
      );
    return false;
  }
  return {
    mountArtwork,
    liveContext,
    inspectorContext,
    openInspector,
    renderInspectorMessages,
    refreshRight,
    renderPresets,
    propertyLinkSignature,
    guardLinkedProperties,
    syncLinkedProperties,
    openPicker,
    closePicker,
    renderPicker,
    presetsDoc,
    presetFamily,
    addAtView,
    editArray,
    inspectorFrame,
    animatedControl,
    keyField,
    cameraSelected,
  };
}
