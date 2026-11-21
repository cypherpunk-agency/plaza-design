/** Sequences and the timeline: playhead, keys, drags, rendering sources and the frame tick. */
import { assetPictureLimits } from '../../world/render-settings';
import { renderSettingsAuthoring } from '../render-settings-authoring';
import { renderPolicy } from '../../world/render-policy';
import type { CitySource } from '../../world/city';
import { fieldIsContinuous } from '../../art/core/fields';
import { worldChunkPlacements } from '../../world/compositions';
import { pendingRegistry } from '../pending-registry';
import { workspaceSource, openCompositionRendering } from '../world-workspace-controls';
import { validationSnapshot } from '../validation-snapshot';
import { keyframeState, setKeyAtPlayhead } from '../keyframe-control';
import { renderSequenceCommandsAuthoring } from '../sequence-commands-authoring';
import { element, button, select, label } from '../controls';
import { mountTimelineGrid, moveKey, type TimelineSelection } from '../timeline-view';
import { sequenceProgram } from '../../art/core/sequence';
import { type ChunkDocument, type Value } from '../../art/core/composition';
import {
  evaluateTimeline,
  timelineArtwork,
  targetComposition,
  type TimelineProgram,
  type TimelineFrame,
  type Sequence,
  type Target,
} from '../../art/core/timeline';
import { copy, flatten, type Composer } from './context';

export function timelineArea(
  app: Composer,
): Pick<
  Composer,
  | 'currentTimeline'
  | 'editTimeline'
  | 'syncSequence'
  | 'seekTime'
  | 'toggleAnimation'
  | 'selectTimeline'
  | 'openRenderingSource'
  | 'openSequenceRendering'
  | 'refreshTimeline'
  | 'thisTargets'
  | 'keyValue'
  | 'addKey'
  | 'validateDrag'
  | 'commitDrag'
  | 'updateTime'
  | 'tick'
  | 'step'
> {
  const currentTimeline = () => {
    const doc = app.directionDocument();
    if (!(doc?.kind === 'composition' && (doc.value as ChunkDocument).sequence)) return undefined;
    if (!Object.isFrozen(doc.value))
      return sequenceProgram({ [doc.id]: doc.value as ChunkDocument });
    let program = app.timelines.get(doc.value as object);
    if (!program) {
      program = sequenceProgram({ [doc.id]: doc.value as ChunkDocument });
      app.timelines.set(doc.value as object, program);
    }
    return program;
  };
  const editTimeline = (name: string, action: (doc: TimelineProgram) => void) => {
    app.playing = false;
    app.run(() =>
      app.model.edit(app.viewCompositionDocument()!.id, name, (value) => {
        const composition = value as ChunkDocument,
          program = sequenceProgram({ [app.viewCompositionDocument()!.id]: composition });
        action(program);
        const { composition: reference, ...sequence } = program.sequences[0];
        composition.sequence = sequence;
        return composition;
      }),
    );
  };
  function syncSequence() {
    const doc = currentTimeline();
    if (!doc?.sequences.some((s) => s.id === app.sequenceId))
      app.sequenceId = doc?.sequences[0]?.id ?? '';
    const seq = app.sequence();
    app.time = Math.min(app.time, seq?.duration ?? app.time);
    app.loopFrom = 0;
    app.loopTo = seq?.duration ?? 0;
  }
  function seekTime(seconds: number) {
    const wasPlaying = app.playing || app.animating;
    app.playing = false;
    app.animating = false;
    app.time = Math.max(0, Math.min(app.sequence()?.duration ?? Infinity, seconds));
    updateTime();
    if (
      app.editorSelection.timeline?.kind === 'track' ||
      app.editorSelection.timeline?.kind === 'camera'
    )
      app.refreshRight();
    if (wasPlaying) app.refreshOptions();
    void app.draw();
  }
  function toggleAnimation() {
    if (app.sequence()) {
      app.animating = false;
      app.playing = !app.playing;
      if (app.playing && app.time >= app.sequence()!.duration)
        app.time = app.loop ? app.loopFrom : 0;
      refreshTimeline();
    } else {
      app.playing = false;
      app.animating = !app.animating;
    }
    app.refreshOptions();
    if (
      app.editorSelection.timeline?.kind === 'track' ||
      app.editorSelection.timeline?.kind === 'camera'
    )
      app.refreshRight();
  }
  function selectTimeline(selection: TimelineSelection | undefined, target?: Target) {
    app.editorSelection.world = undefined;
    app.editorSelection.chunk = undefined;
    app.editorSelection.timeline = selection;
    app.playing = false;
    app.animating = false;
    if (selection?.kind === 'camera') {
      app.editorSelection.document = '';
      app.editorSelection.instance = '';
      app.timelineView.collapsed.delete('Camera');
    }
    if (target) {
      app.editorSelection.document =
        target.kind !== 'camera' && target.scene
          ? (app
              .documentsForView()
              .find(
                (d) =>
                  d.kind === 'composition' && (d.value as ChunkDocument).scene === target.scene,
              )?.id ?? '')
          : '';
      app.editorSelection.instance = target.kind === 'camera' ? '' : target.instance;
    }
    if ((selection?.kind === 'key' || selection?.kind === 'track') && target)
      app.timelineView.collapsed.delete(
        target.kind === 'camera'
          ? 'Camera'
          : target.scene
            ? JSON.stringify([target.scene, target.instance])
            : target.instance,
      );
    app.refreshLeft();
    app.refreshRight();
    refreshTimeline();
    void app.draw();
  }
  function openRenderingSource(source: import('../../world/render-settings').RenderSource) {
    app.inspectorDraft = undefined;
    app.refreshRight();
    if (source.kind === 'district') {
      app.cityDistrict = source.id;
      app.mapHost.open = true;
      app.refreshMap();
      return;
    }
    if (source.kind === 'chunk') {
      app.openScene(source.id);
      return;
    }
    if (source.kind === 'sequence' || source.kind === 'sequence-member') {
      app.openSequence(source.id);
      openSequenceRendering();
      return;
    }
    if (source.kind === 'composition') {
      app.openComposition(source.id);
      openCompositionRendering(app.worldControls());
      return;
    }
    if (source.kind === 'member') {
      if (app.workspaceId !== source.composition) app.openComposition(source.composition);
      app.selectWorldMember({
        composition: source.composition,
        member: source.member,
        ...(source.child ? { child: source.child } : {}),
      });
      return;
    }
    if (source.kind === 'group') {
      const world = workspaceSource(app.documentsForView());
      for (const [composition, definition] of Object.entries(world.compositions)) {
        const member = definition.members.find((m) => m.group === source.id);
        if (member) {
          if (app.workspaceId !== composition) app.openComposition(composition);
          app.selectWorldMember({ composition, member: member.id });
          return;
        }
      }
    }
  }
  function openSequenceRendering() {
    const sequenceSource = app.sequence();
    if (!sequenceSource) return;
    app.openInspector({
      title: 'Sequence rendering · ' + sequenceSource.id,
      build: (body, form) => {
        const draft = structuredClone(sequenceSource),
          documents = validationSnapshot(app.documentsForView()),
          city = documents.get('city-source') as CitySource,
          world = documents.get(
            'world-compositions',
          ) as import('../../world/compositions').WorldCompositions,
          scenes = pendingRegistry(documents);
        const worldDirected = (
          app.viewCompositionDocument()!.value as ChunkDocument
        ).instances.some((n) => n.type === 'sequence.world-control');
        const available = worldDirected
          ? app.workspaceId
            ? worldChunkPlacements(world, app.workspaceId).map((c) => c.chunk)
            : Object.keys(scenes)
          : [];
        let target = '';
        const render = () => {
          body.replaceChildren();
          form.select(body, 'Rendering target', ['', ...available], target, (value) => {
            target = value;
            render();
          });
          const note = element(
            'p',
            'muted',
            'The empty target applies to the whole picture. A named chunk overrides only that member. Inherit removes this sequence override.',
          );
          body.append(note);
          const local = target ? draft.memberRendering?.[target] : draft.rendering,
            scene = scenes[target || app.painting.result?.activeScene || app.viewScene()] ?? {
              id: target || app.viewScene(),
            };
          body.append(
            element(
              'p',
              'muted',
              'Effective values shown for ' +
                (scene.name ?? scene.id) +
                '. Other members may inherit different settings.',
            ),
          );
          const effective = renderPolicy(
            scene,
            city,
            world,
            draft,
            app.workspaceId || undefined,
            worldDirected ? undefined : assetPictureLimits,
          );
          renderSettingsAuthoring(
            form,
            body,
            local,
            (value) => {
              if (target) {
                if (value) (draft.memberRendering ??= {})[target] = value;
                else {
                  delete draft.memberRendering?.[target];
                  if (!Object.keys(draft.memberRendering ?? {}).length)
                    delete draft.memberRendering;
                }
              } else if (value) draft.rendering = value;
              else delete draft.rendering;
              render();
            },
            effective,
            'Rendering',
            openRenderingSource,
          );
        };
        render();
        return () =>
          editTimeline('Edit sequence rendering', (program) => {
            const index = program.sequences.findIndex((s) => s.id === draft.id);
            program.sequences[index] = draft;
          });
      },
    });
  }
  function refreshTimeline() {
    app.timelineGrid?.dispose();
    app.timelineGrid = undefined;
    app.timelineHost.replaceChildren();
    app.timeLabel = undefined;
    app.transportPlay = undefined;
    const seq = app.sequence();
    if (!seq || !app.playHost.hidden) {
      app.timelineHost.hidden = true;
      return;
    }
    app.timelineHost.hidden = false;
    app.timelineHost.classList.toggle('collapsed', app.timelineCollapsed);
    app.timelineHost.style.height = app.timelineCollapsed ? '42px' : app.timelineHeight + 'px';
    const resize = element('div', 'timeline-resize');
    resize.tabIndex = 0;
    resize.setAttribute('role', 'separator');
    resize.setAttribute('aria-label', 'Resize timeline');
    resize.setAttribute('aria-orientation', 'horizontal');
    let drag: { y: number; height: number } | undefined;
    resize.onpointerdown = (e) => {
      drag = { y: e.clientY, height: app.timelineHost.clientHeight };
      resize.setPointerCapture(e.pointerId);
    };
    resize.onpointermove = (e) => {
      if (!drag) return;
      app.timelineHeight = Math.max(
        150,
        Math.min(app.center.clientHeight - 200, drag.height + drag.y - e.clientY),
      );
      app.timelineHost.style.height = app.timelineHeight + 'px';
    };
    resize.onpointerup = (e) => {
      drag = undefined;
      if (resize.hasPointerCapture(e.pointerId)) resize.releasePointerCapture(e.pointerId);
    };
    resize.onkeydown = (e) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        app.timelineHeight = Math.max(150, app.timelineHeight + (e.key === 'ArrowUp' ? 30 : -30));
        app.timelineHost.style.height = app.timelineHeight + 'px';
      }
    };
    app.timelineHost.append(resize);
    const transport = element('div', 'timeline-transport');
    app.transportPlay = button(
      app.playing ? 'Pause' : 'Play',
      toggleAnimation,
      'Space: play / pause',
    );
    transport.append(
      button(app.timelineCollapsed ? '▸ Timeline' : '▾ Timeline', () => {
        app.timelineCollapsed = !app.timelineCollapsed;
        refreshTimeline();
      }),
      app.transportPlay,
      button(
        '−1 frame',
        () => seekTime((Math.round(app.time * 60) - 1) / 60),
        'Comma: previous frame',
      ),
      button(
        '+1 frame',
        () => seekTime((Math.round(app.time * 60) + 1) / 60),
        'Period: next frame',
      ),
    );
    app.timeLabel = element('span', 'time');
    transport.append(app.timeLabel);
    app.timelineHost.append(transport);
    updateTime();
    if (app.timelineCollapsed) return;
    const zoom = app.numberInput(
      app.timelineView.zoom,
      (value) => {
        app.timelineView.zoom = Math.max(1, Math.min(16, value));
        refreshTimeline();
      },
      1,
    );
    const speed = app.speedControl();
    speed.setAttribute('aria-label', 'Playback speed');
    transport.append(speed);
    zoom.max = '16';
    zoom.setAttribute('aria-label', 'Timeline zoom');
    transport.append(label('Zoom', zoom));
    const settings = element('details', 'timeline-settings'),
      dataPanel = element('div');
    settings.append(element('summary', '', 'Settings'), dataPanel);
    transport.append(
      settings,
      button(
        'Rendering',
        openSequenceRendering,
        'Inspect sequence overrides and their inherited source',
      ),
    );
    const trackSelect = select(
      [{ value: '', label: 'Add keyframe…' }, ...thisTargets()],
      '',
      (value) => {
        if (value) addKey(JSON.parse(value) as Target);
      },
    );
    trackSelect.setAttribute('aria-label', 'Add keyframe target');
    transport.append(trackSelect);
    app.timelineGrid = mountTimelineGrid(app.timelineHost, {
      sequence: seq,
      state: app.timelineView,
      time: app.time,
      onZoom: (value) => (zoom.value = String(Math.round(value * 100) / 100)),
      selected: app.editorSelection.timeline,
      instance: app.editorSelection.document
        ? JSON.stringify([
            (app.compositionDocument()!.value as ChunkDocument).scene,
            app.editorSelection.instance,
          ])
        : app.editorSelection.instance,
      label: (id) => {
        let scene = '',
          instance = id;
        if (id.startsWith('[')) {
          [scene, instance] = JSON.parse(id) as string[];
        }
        const doc = scene
            ? app
                .documentsForView()
                .find((d) => d.kind === 'composition' && (d.value as ChunkDocument).scene === scene)
            : app.viewCompositionDocument(),
          node =
            doc && flatten(doc.value as ChunkDocument).find((n) => n.node.id === instance)?.node;
        return (
          (scene ? app.sceneName(scene) + ' / ' : '') +
          instance +
          (node ? ' · ' + app.config.registry.get(node.type).label : '')
        );
      },
      select: selectTimeline,
      seek: seekTime,
      moveKey: (track, index, seconds) => {
        editTimeline('Move keyframe', (d) => {
          app.editorSelection.timeline = {
            kind: 'key',
            track,
            index: moveKey(d.sequences[0], track, index, seconds),
          };
        });
        refreshTimeline();
        app.refreshRight();
      },
    });
    // Settings is folded by default: its forms are built when it is first opened, and it stays open across refreshes.
    let settingsBuilt = false;
    const buildSettings = () => {
      if (settingsBuilt) return;
      settingsBuilt = true;
      dataPanel.append(
        label(
          'Duration',
          app.numberInput(
            seq.duration,
            (value) => editTimeline('Change duration', (d) => (d.sequences[0].duration = value)),
            1 / 60,
          ),
        ),
      );
      const loopInput = element('input');
      loopInput.type = 'checkbox';
      loopInput.checked = app.loop;
      loopInput.onchange = () => (app.loop = loopInput.checked);
      dataPanel.append(
        label('Loop range', loopInput),
        label(
          'From',
          app.numberInput(
            app.loopFrom,
            (v) => {
              if (v >= (app.loopTo || seq.duration)) {
                app.notice('Loop start must precede loop end.', true);
                return;
              }
              app.loopFrom = v;
            },
            0,
          ),
        ),
        label(
          'To',
          app.numberInput(
            app.loopTo || seq.duration,
            (v) => {
              if (v <= app.loopFrom || v > seq.duration) {
                app.notice('Loop end must follow its start and remain within the sequence.', true);
                return;
              }
              app.loopTo = v;
            },
            0,
          ),
        ),
      );
      const apply = <K extends keyof Sequence>(key: K, value: Sequence[K]) =>
        editTimeline(`Edit ${key}`, (d) => {
          d.sequences.find((s) => s.id === app.sequenceId)![key] = value;
        });
      app.editArray(
        dataPanel,
        'Shots',
        seq.shots,
        (value) => apply('shots', value),
        'Ordered {id,from,to,camera:{x,h,zoom}}. Times are seconds. Shots must not overlap.',
      );
      app.editArray(
        dataPanel,
        'Text cards',
        seq.text,
        (value) => apply('text', value),
        '{id,from,to,text,x,h}. Cards are rendered by the shared preview provider.',
      );
      app.editArray(
        dataPanel,
        'Fades',
        seq.fades,
        (value) => apply('fades', value),
        '{id,from,to,color,start,end}. Opacity stays within 0–1.',
      );
      renderSequenceCommandsAuthoring(
        dataPanel,
        seq,
        app.commandTargets(),
        (label, change) =>
          editTimeline(label, (d) => change(d.sequences.find((s) => s.id === app.sequenceId)!)),
        (e) => app.notice(e instanceof Error ? e.message : String(e), true),
      );
      app.editArray(
        dataPanel,
        'Named beats',
        seq.beats,
        (value) => apply('beats', value),
        '{id,time}. Previewing these never dispatches gameplay events.',
      );
      const handoff = element('details');
      handoff.append(element('summary', '', 'Handoff destination'));
      const destinations = Object.keys(app.model.timelineContext().destinations ?? {});
      handoff.append(
        label(
          'Chunk',
          select(
            [
              { value: '', label: 'No handoff' },
              ...destinations.map((v) => ({ value: v, label: v })),
            ],
            seq.handoff?.scene ?? '',
            (v) => apply('handoff', v ? { scene: v } : undefined),
          ),
        ),
      );
      if (seq.handoff)
        handoff.append(
          label(
            'Entrance',
            select(
              [
                { value: '', label: 'Default entrance' },
                ...(app.model.timelineContext().destinations?.[seq.handoff.scene] ?? []).map(
                  (v) => ({
                    value: v,
                    label: v,
                  }),
                ),
              ],
              seq.handoff.entrance ?? '',
              (v) => apply('handoff', { scene: seq.handoff!.scene, ...(v ? { entrance: v } : {}) }),
            ),
          ),
        );
      handoff.append(element('p', 'muted', 'Preview never travels or changes player progress.'));
      dataPanel.append(handoff);
      app.editArray(
        dataPanel,
        'Sequence document',
        seq,
        (value) =>
          editTimeline('Edit sequence', (d) => {
            const i = d.sequences.findIndex((s) => s.id === app.sequenceId);
            d.sequences[i] = value;
            app.sequenceId = value.id;
          }),
        'Advanced full sequence data, including registered exact motion tracks and clips. No code is accepted.',
      );
    };
    settings.open = app.timelineSettingsOpen;
    if (settings.open) buildSettings();
    settings.ontoggle = () => {
      app.timelineSettingsOpen = settings.open;
      if (settings.open) buildSettings();
    };
  }
  function thisTargets(): { value: string; label: string }[] {
    const result: { value: string; label: string }[] = [];
    const add = (target: Target, text: string) =>
      result.push({
        value: JSON.stringify(
          target.kind === 'camera' ||
            app.compositionDocument()?.id === app.viewCompositionDocument()?.id
            ? target
            : { ...target, scene: (app.compositionDocument()!.value as ChunkDocument).scene },
        ),
        label: text,
      });
    for (const property of ['x', 'h', 'zoom'] as const)
      add({ kind: 'camera', property }, `Camera · ${property}`);
    const node = app.selected();
    if (node) {
      for (const property of [
        'x',
        'h',
        'scale',
        'facing',
        'parallax',
        'visible',
        'opacity',
      ] as const)
        add({ kind: 'instance', instance: node.id, property }, `${node.id} · ${property}`);
      const entry = app.config.registry.get(node.type);
      for (const [property, field] of Object.entries(entry.fields))
        if (
          field.animatable &&
          !app.resolvedArtwork(app.compositionDocument()?.id ?? app.currentId, node.id)?.properties[
            property
          ]?.readOnly
        )
          add({ kind: 'property', instance: node.id, property }, `${node.id} · ${field.label}`);
      for (const [property, field] of Object.entries(entry.visualFields ?? {})) {
        if (field.animatable)
          add({ kind: 'state', instance: node.id, property }, `${node.id} state · ${field.label}`);
        if (app.config.clips?.[node.type]?.length)
          add({ kind: 'clip', instance: node.id, property }, `${node.id} clip · ${field.label}`);
      }
    }
    return result;
  }
  function keyValue(frame: TimelineFrame, target: Target): { value: Value; discrete: boolean } {
    const source =
        target.kind === 'camera'
          ? frame
          : timelineArtwork(frame, target.scene ?? frame.composition.scene),
      composition =
        source?.composition ??
        targetComposition(app.evaluationContext(), frame.composition, target);
    const node =
      target.kind === 'camera'
        ? undefined
        : flatten(composition).find((n) => n.node.id === target.instance)?.node;
    let value: Value,
      discrete = false;
    if (target.kind === 'camera') value = frame.camera[target.property];
    else if (target.kind === 'instance') {
      value =
        target.property === 'visible'
          ? (source?.visibility[target.instance] ?? true)
          : target.property === 'opacity'
            ? (source?.opacity[target.instance] ?? 1)
            : (node!.placement[target.property] ?? 1);
      discrete = ['visible', 'facing'].includes(target.property);
    } else if (target.kind === 'property' || target.kind === 'state') {
      const entry = app.config.registry.get(node!.type),
        field = (target.kind === 'property' ? entry.fields : entry.visualFields!)[target.property];
      value =
        target.kind === 'property'
          ? (node!.props[target.property] ?? field.default)
          : (source?.state[target.instance]?.[target.property] ?? field.default);
      discrete = !fieldIsContinuous(field);
    } else {
      value =
        source?.clips[target.instance]?.[target.property] ??
        app.config.clips?.[node!.type]?.[0] ??
        '';
      discrete = true;
    }
    return { value, discrete };
  }
  function addKey(target: Target, explicitValue?: Value) {
    editTimeline('Add / update keyframe', (doc) => {
      const seq = doc.sequences.find((s) => s.id === app.sequenceId)!;
      const frame = evaluateTimeline(doc, app.sequenceId, app.time, app.evaluationContext(), {
        reduced: app.reduced,
      });
      const sampled = keyValue(frame, target),
        value = explicitValue === undefined ? sampled.value : explicitValue,
        discrete = sampled.discrete;
      setKeyAtPlayhead(seq, target, app.time, value, discrete);
    });
  }
  function validateDrag(pending: ChunkDocument) {
    const node = flatten(pending).find((n) => n.node.id === app.editorSelection.instance)?.node;
    if (!node) return;
    const base = app.selected(),
      seq = app.sequence(),
      sequenceDoc = app.viewCompositionDocument(),
      doc = app.compositionDocument();
    if (base && doc) app.guardLinkedProperties(doc.id, node, base.props, base.bindings);
    for (const property of ['x', 'h'] as const) {
      const target: Target = {
        kind: 'instance',
        instance: node.id,
        property,
        ...(doc?.id !== sequenceDoc?.id ? { scene: pending.scene } : {}),
      };
      if (
        base &&
        node.placement[property] !== base.placement[property] &&
        seq &&
        keyframeState(seq, target, app.time).track?.motion
      )
        throw Error(property + ' is controlled by procedural motion.');
    }
    for (const [property, value] of Object.entries(node.props)) {
      const target: Target = {
        kind: 'property',
        instance: node.id,
        property,
        ...(doc?.id !== sequenceDoc?.id ? { scene: pending.scene } : {}),
      };
      if (
        base &&
        value !==
          (base.props[property] ?? app.config.registry.get(node.type).fields[property]?.default) &&
        seq &&
        keyframeState(seq, target, app.time).track?.motion
      )
        throw Error(property + ' is controlled by procedural motion.');
    }
    app.config.validatePlacement?.(pending, app.documentsForView());
  }
  function commitDrag(pending: ChunkDocument) {
    app.run(
      () => {
        const doc = app.compositionDocument()!,
          sequenceDoc = app.viewCompositionDocument(),
          currentSequence = app.sequence(),
          node = flatten(pending).find((n) => n.node.id === app.editorSelection.instance)!.node;
        const base = flatten(doc.value as ChunkDocument).find((n) => n.node.id === node.id)!.node;
        const directed =
          sequenceDoc && currentSequence ? copy(sequenceDoc.value as ChunkDocument) : undefined;
        let keyed = false;
        for (const property of ['x', 'h'] as const) {
          const target: Target = {
            kind: 'instance',
            instance: node.id,
            property,
            ...(doc.id !== sequenceDoc?.id ? { scene: pending.scene } : {}),
          };
          const track = currentSequence && keyframeState(currentSequence, target, app.time).track;
          if (!track) continue;
          if (track.motion) throw Error(property + ' is controlled by procedural motion.');
          setKeyAtPlayhead(directed!.sequence!, target, app.time, node.placement[property], false);
          node.placement[property] = base.placement[property];
          keyed = true;
        }
        for (const [property, value] of Object.entries(node.props)) {
          if (
            value ===
            (base.props[property] ?? app.config.registry.get(node.type).fields[property]?.default)
          )
            continue;
          const target: Target = {
            kind: 'property',
            instance: node.id,
            property,
            ...(doc.id !== sequenceDoc?.id ? { scene: pending.scene } : {}),
          };
          const track = currentSequence && keyframeState(currentSequence, target, app.time).track;
          if (!track) continue;
          if (track.motion) throw Error(property + ' is controlled by procedural motion.');
          setKeyAtPlayhead(
            directed!.sequence!,
            target,
            app.time,
            value,
            !fieldIsContinuous(app.config.registry.get(node.type).fields[property]),
          );
          if (Object.prototype.hasOwnProperty.call(base.props, property))
            node.props[property] = base.props[property];
          else delete node.props[property];
          keyed = true;
        }
        if (keyed) {
          if (doc.id === sequenceDoc!.id) pending.sequence = directed!.sequence;
          app.model.importDocuments(
            [
              { id: doc.id, value: pending },
              ...(doc.id !== sequenceDoc!.id ? [{ id: sequenceDoc!.id, value: directed }] : []),
            ],
            'Drag artwork',
          );
        } else app.model.edit(doc.id, 'Drag artwork', () => pending);
      },
      false,
      'artwork',
    );
  }
  function updateTime() {
    app.updateContextSummary();
    for (const update of app.propertyUpdates) update();
    app.timelineGrid?.update(app.time);
    if (app.transportPlay) {
      app.transportPlay.textContent = app.playing ? 'Pause' : 'Play';
      app.transportPlay.setAttribute('aria-pressed', String(app.playing));
    }
    if (app.ambientLabel) app.ambientLabel.textContent = `${app.time.toFixed(3)} s`;
    if (app.timeLabel)
      app.timeLabel.textContent = `${app.time.toFixed(3)} / ${(app.sequence()?.duration ?? 0).toFixed(3)} s · frame ${Math.round(app.time * 60)}`;
  }
  /** The frame loop: waits for the first document load, and one failing frame never stops it. */
  const tick = (now: number) => {
    if (app.disposed) return;
    app.frameId = requestAnimationFrame(tick);
    if (!app.viewReady) {
      app.previous = now;
      return;
    }
    try {
      step(now);
    } catch (error) {
      app.reportError(error, 'Frame loop');
    }
  };
  const step = (now: number) => {
    const delta = Math.min(0.1, (now - app.previous) / 1000);
    app.previous = now;
    if (app.focusMotion) {
      const m = app.focusMotion;
      if (m.document !== app.currentId) app.focusMotion = undefined;
      else {
        m.elapsed += delta;
        const t = Math.min(1, m.elapsed / 0.32),
          ease = t * t * (3 - 2 * t);
        app.sequenceNav.x = m.from.x + (m.to.x - m.from.x) * ease;
        app.sequenceNav.y = m.from.y + (m.to.y - m.from.y) * ease;
        app.sequenceNav.zoom = Math.exp(
          Math.log(m.from.zoom) + (Math.log(m.to.zoom) - Math.log(m.from.zoom)) * ease,
        );
        if (t === 1) {
          app.focusMotion = undefined;
          app.refreshViewportTools();
        }
        void app.draw();
      }
    }
    if (now - app.lastViewSample >= 500) {
      app.lastViewSample = now;
      app.rememberView();
    }
    app.updateRenderStatus();
    if (app.dragPreviewDirty) {
      app.dragPreviewDirty = false;
      void app.draw();
    }
    const seq = app.sequence();
    if (app.animating && !seq && app.group === 'layout' && app.current()?.kind === 'composition') {
      app.time += delta * app.playbackSpeed;
      updateTime();
      void app.draw(true);
    }
    if (app.playing && seq && app.group === 'layout' && app.playHost.hidden) {
      const end = app.loop ? app.loopTo || seq.duration : seq.duration;
      app.time += delta * app.playbackSpeed;
      if (app.time >= end) {
        if (app.loop)
          app.time =
            app.loopFrom + ((app.time - app.loopFrom) % Math.max(1 / 60, end - app.loopFrom));
        else {
          app.time = seq.duration;
          app.playing = false;
          refreshTimeline();
          if (
            app.editorSelection.timeline?.kind === 'track' ||
            app.editorSelection.timeline?.kind === 'camera'
          )
            app.refreshRight();
        }
      }
      updateTime();
      void app.draw(app.playing);
    }
  };
  return {
    currentTimeline,
    editTimeline,
    syncSequence,
    seekTime,
    toggleAnimation,
    selectTimeline,
    openRenderingSource,
    openSequenceRendering,
    refreshTimeline,
    thisTargets,
    keyValue,
    addKey,
    validateDrag,
    commitDrag,
    updateTime,
    tick,
    step,
  };
}
