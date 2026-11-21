/** The viewport: preview requests, drawing, hit testing, hover and selection boxes, drawing boundaries, zoom and the viewport tools. */
import { fieldUnit } from '../../art/core/fields';
import { windowEdges, framingBounds } from '../visibility';
import { worldChunkPlacements } from '../../world/compositions';
import { workspaceSource } from '../world-workspace-controls';
import { validationSnapshot } from '../validation-snapshot';
import { hitTestArtwork, hitsAt } from '../selection';
import { canvasPoint } from '../../art/core/geometry';
import { zoomWorkspace, workspaceZoom, resizeWorkspace } from '../viewport-navigation';
import { element, button } from '../controls';
import { workspaceDocuments } from '../workspace';
import { perfMeasure } from '../../runtime/diagnostics/performance';
import { type ChunkDocument, type AssetInstance } from '../../art/core/composition';
import { type TimelineFrame } from '../../art/core/timeline';
import type { PreviewRequest, PreviewResult } from '../contracts';
import { copy, flatten, type Composer } from './context';

export function viewportArea(
  app: Composer,
): Pick<
  Composer,
  | 'frameSelection'
  | 'workspaceNavigation'
  | 'gameViewport'
  | 'dynamicWorkspace'
  | 'previewSize'
  | 'stopFollowing'
  | 'locateCamera'
  | 'previewRequest'
  | 'resolvedArtwork'
  | 'editDrawingBoundary'
  | 'showDrawingBoundary'
  | 'placeDrawingBoundary'
  | 'draw'
  | 'refresh'
  | 'compareOptions'
  | 'comparing'
  | 'sizeCanvas'
  | 'coordinates'
  | 'hitTest'
  | 'hitsUnder'
  | 'isSelectedHit'
  | 'hitLabel'
  | 'cycleAt'
  | 'listAt'
  | 'spatialFeedback'
  | 'placeHover'
  | 'placeObjectLabel'
  | 'updateRenderStatus'
  | 'zoomTo'
  | 'focusArtwork'
  | 'fit'
  | 'refreshViewportTools'
> {
  function frameSelection() {
    const doc = app.compositionDocument();
    if (app.editorSelection.instance && doc)
      void focusArtwork(app.editorSelection.document || doc.id, app.editorSelection.instance);
    else fit();
  }
  function workspaceNavigation(transient = true) {
    // Rendering uses chunk-local coordinates; membership moves must not move the editor view.
    let originDelta = { x: 0, h: 0 };
    if (app.workspaceId) {
      const pending =
          (transient ? app.worldDrag?.pending : undefined) ??
          workspaceSource(app.documentsForView()),
        origin = app.viewScene(),
        at = worldChunkPlacements(pending, app.workspaceId).find((c) => c.chunk === origin),
        key = app.currentId + ':' + app.workspaceId + ':' + origin;
      if (at) {
        if (app.workspaceOrigin?.key !== key) app.workspaceOrigin = { key, x: at.x, h: at.h };
        originDelta = { x: at.x - app.workspaceOrigin.x, h: at.h - app.workspaceOrigin.h };
      }
    } else app.workspaceOrigin = undefined;
    return {
      x: app.sequenceNav.x - originDelta.x,
      h: app.sequenceNav.y - originDelta.h,
      zoom: app.sequenceNav.zoom,
    };
  }
  function gameViewport(directed = !!app.sequence()) {
    const scale = Number(app.environment.renderScale ?? 1),
      zoom = directed ? 1 : Number(app.environment.zoom ?? 1);
    return {
      width: app.baseWidth,
      height: app.baseHeight,
      scale: scale * zoom,
      ...(zoom === 1 ? {} : { ground: (app.baseHeight / scale - 54) / zoom }),
    };
  }
  function dynamicWorkspace() {
    return app.navigable() && !app.cameraPreview && !comparing();
  }
  function previewSize() {
    return dynamicWorkspace()
      ? {
          width: Math.max(120, Math.round(app.stage.clientWidth - 16)),
          height: Math.max(120, Math.round(app.stage.clientHeight - 16)),
        }
      : { width: app.baseWidth, height: app.baseHeight };
  }
  function stopFollowing() {
    app.focusMotion = undefined;
    if (app.followCamera) {
      app.followCamera = false;
      refreshViewportTools();
      app.rememberView();
    }
  }
  function locateCamera() {
    const focus = app.painting.result?.camera?.focus;
    if (app.cameraPreview || !focus) {
      app.cameraPreview = false;
      app.locateCameraPending = true;
      refreshViewportTools();
      app.refreshOptions();
      void draw();
      return;
    }
    app.sequenceNav.x = focus.x;
    app.sequenceNav.y = focus.h;
    app.sequenceNav.zoom = focus.zoom;
    refreshViewportTools();
    app.refreshOptions();
    void draw();
  }
  function previewRequest(
    composition: ChunkDocument,
    overlay: boolean,
    frame?: TimelineFrame,
  ): PreviewRequest {
    return perfMeasure('editor.preview-request', () => {
      const interaction = app.model.interactionPreview(),
        timeline = app.currentTimeline(),
        documents = app.worldDrag?.pending
          ? app.model.previewDocuments('world-compositions', app.worldDrag.pending)
          : app.viewport.dragging && app.editorSelection.document
            ? app.model.previewDocuments(
                app.editorSelection.document,
                app.viewport.dragging.pending,
              )
            : validationSnapshot(app.documentsForView());
      return {
        viewport: gameViewport(),
        direction: app.currentTimeline() ? 'sequence' : 'base',
        checkpoint: app.worldState()?.checkpoint,
        scope: app.workspaceId
          ? {
              composition: app.workspaceId,
              origin: app.viewScene(),
              chunks: workspaceDocuments(
                app.workspaceId,
                app.documentsForView(),
                app.worldState()?.checkpoint?.membership,
              ).map((d) => (d.value as ChunkDocument).scene),
            }
          : undefined,
        workspace:
          app.navigable() && !app.cameraPreview
            ? {
                ...workspaceNavigation(),
                followCamera: app.followCamera,
                ...(app.painting.workspaceAnchor?.document === app.currentId
                  ? {
                      anchorX: app.painting.workspaceAnchor.x,
                      anchorH: app.painting.workspaceAnchor.h,
                    }
                  : {}),
              }
            : undefined,
        sourceVersion:
          app.worldDrag?.pending ?? interaction?.sourceVersion ?? app.model.sourceVersion,
        transient:
          interaction?.transient ??
          (app.viewport.dragging
            ? {
                document: app.compositionDocument()!.id,
                composition: app.viewport.dragging.pending,
              }
            : undefined),
        documents,
        composition: copy(composition),
        frame,
        timeline,
        sequenceId: timeline ? app.sequenceId : undefined,
        time: app.time,
        ambientTime: app.time + app.ambientOffset + Number(app.environment.titleOffset ?? 0),
        reduced: app.reduced,
        overlays: overlay,
        objectOutlines: overlay && app.showObjectOutlines,
        selectedId:
          Object.entries(app.painting.result?.sources ?? {}).find(
            ([, source]) =>
              source.document === app.compositionDocument()?.id &&
              source.instance === app.editorSelection.instance,
          )?.[0] ?? app.editorSelection.instance,
        player: true,
        hidden: [...app.hiddenIn(app.compositionDocument()?.id)],
        environment: { ...app.environment },
      };
    });
  }
  function resolvedArtwork(document: string, id: string, result = app.painting.result) {
    const key = Object.keys(result?.resolved ?? {}).find((k) =>
      result?.sources?.[k]
        ? result.sources[k].document === document && result.sources[k].instance === id
        : document === app.currentId && k === id,
    );
    return key ? result?.resolved?.[key] : undefined;
  }
  function editDrawingBoundary(field?: string) {
    const a = resolvedArtwork(
        app.compositionDocument()?.id ?? app.currentId,
        app.editorSelection.instance,
      ),
      key = field ?? a?.drawingWindow?.from;
    app.inspector.appearance();
    app.refreshRight();
    const label = key && a?.properties[key]?.label;
    if (label)
      queueMicrotask(() => {
        const input = [...app.right.querySelectorAll<HTMLInputElement>('input[aria-label]')].find(
          (e) => e.getAttribute('aria-label') === label,
        );
        input?.focus({ preventScroll: true });
        input?.scrollIntoView({ block: 'nearest' });
      });
  }
  function showDrawingBoundary() {
    const doc = app.compositionDocument()?.id ?? app.currentId,
      id = app.editorSelection.instance,
      a = resolvedArtwork(doc, id);
    if (!a?.drawingWindow) return;
    const key = JSON.stringify([doc, id]);
    if (app.boundaryFor === key) {
      app.boundaryFor = '';
      app.placeJoined();
      return;
    }
    app.boundaryFor = key;
    stopFollowing();
    const x = windowEdges(a)[0].x;
    if (!app.cameraPreview && (x < 40 || x > app.canvas.width - 40)) {
      app.sequenceNav.x += (x - app.canvas.width / 2) / (app.painting.result?.workspaceScale ?? 1);
      void draw();
    } else app.placeJoined();
  }
  function placeDrawingBoundary() {
    if (
      !app.overlays ||
      app.boundaryFor !==
        JSON.stringify([
          app.compositionDocument()?.id ?? app.currentId,
          app.editorSelection.instance,
        ])
    )
      return;
    const a = resolvedArtwork(
      app.compositionDocument()?.id ?? app.currentId,
      app.editorSelection.instance,
    );
    if (!a?.drawingWindow) return;
    const rect = app.canvas.getBoundingClientRect(),
      frame = app.stageWrap.getBoundingClientRect(),
      scale = rect.width / app.canvas.width,
      left = rect.left - frame.left,
      top = rect.top - frame.top,
      w = a.drawingWindow.bounds;
    const lo = Math.max(0, w.x),
      hi = Math.min(app.canvas.width, w.x + w.width);
    if (hi > lo) {
      const area = element('div');
      area.dataset.visibilityArea = '';
      Object.assign(area.style, {
        position: 'absolute',
        pointerEvents: 'none',
        left: left + lo * scale + 'px',
        top: top + 'px',
        width: (hi - lo) * scale + 'px',
        height: rect.height + 'px',
        background: 'rgba(80,210,230,.07)',
      });
      app.joinedLayer.append(area);
    }
    for (const edge of windowEdges(a)) {
      if (edge.x < 0 || edge.x > app.canvas.width) continue;
      const line = element('div');
      line.dataset.visibilityBoundary = edge.field;
      Object.assign(line.style, {
        position: 'absolute',
        pointerEvents: 'none',
        left: left + edge.x * scale + 'px',
        top: top + 'px',
        height: rect.height + 'px',
        borderLeft: '2px dashed #50d2e6',
      });
      const label = button(
        (edge.field === a.drawingWindow.from ? 'Drawing starts' : 'Drawing ends') +
          ' · X ' +
          String(a.properties[edge.field]?.value),
        () => editDrawingBoundary(edge.field),
        'Select this drawing boundary to edit its value in the inspector',
      );
      Object.assign(label.style, {
        position: 'absolute',
        pointerEvents: 'auto',
        left: '4px',
        top: '40px',
        whiteSpace: 'nowrap',
      });
      line.append(label);
      app.joinedLayer.append(line);
    }
  }
  function draw(advance = false) {
    return app.previewRenderer.draw(advance);
  }
  function refresh() {
    if (app.numericScrubbing) {
      void draw();
      return;
    }
    return app.withViewDocuments(() => {
      if (app.disposed) return;
      if (app.workspaceId) {
        const members = workspaceDocuments(
          app.workspaceId,
          app.documentsForView(),
          app.worldState()?.checkpoint?.membership,
        );
        if (members.length && !members.some((d) => d.id === app.currentId)) {
          const next = members[0],
            at = app.painting.result?.projectChunk?.((next.value as ChunkDocument).scene, 0, 0),
            previous = app.painting.result?.projectChunk?.(app.viewScene(), 0, 0),
            scale = app.painting.result?.workspaceScale ?? 1;
          if (at && previous && !app.currentTimeline()) {
            app.sequenceNav.x -= (at.x - previous.x) / scale;
            app.sequenceNav.y += (at.y - previous.y) / scale;
          }
          app.currentId = next.id;
          app.painting.workspaceAnchor = undefined;
        }
      }
      if (app.currentId && !app.documentsForView().some((d) => d.id === app.currentId)) {
        app.currentId = app.documentsForView().find((d) => d.kind === 'composition')?.id ?? '';
        app.editorSelection.instance = '';
        app.editorSelection.document = '';
        app.stopPlay();
      }
      const timeline = app.currentTimeline();
      if (timeline && !timeline.sequences.some((s) => s.id === app.sequenceId))
        app.sequenceId = timeline.sequences[0]?.id ?? '';
      const seq = app.sequence();
      if (seq) {
        app.time = Math.max(0, Math.min(app.time, seq.duration));
        app.loopTo = Math.min(app.loopTo || seq.duration, seq.duration);
        if (app.loopFrom >= app.loopTo) app.loopFrom = 0;
      }
      perfMeasure('editor.header', app.refreshHeader);
      perfMeasure('editor.options', app.refreshOptions);
      refreshViewportTools();
      perfMeasure('editor.outline', app.refreshLeft);
      app.playHandle?.refresh?.();
      perfMeasure('editor.inspector', app.refreshRight);
      perfMeasure('editor.timeline', app.refreshTimeline);
      void draw();
    });
  }
  function compareOptions() {
    const doc = app.compositionDocument();
    return doc && app.config.compareWith
      ? app.config.compareWith((doc.value as ChunkDocument).scene, app.documentsForView())
      : [];
  }
  function comparing() {
    return (
      !!app.compareId &&
      !app.workspaceId &&
      !app.currentTimeline() &&
      compareOptions().some((o) => o.id === app.compareId)
    );
  }
  function sizeCanvas(width: number, height: number) {
    if (app.canvas.width !== width || app.canvas.height !== height) {
      if (
        dynamicWorkspace() &&
        app.painting.resultDocument === app.currentId &&
        app.painting.result?.workspaceScale
      ) {
        Object.assign(
          app.sequenceNav,
          resizeWorkspace(
            app.sequenceNav,
            app.canvas,
            { width, height },
            app.painting.result.workspaceScale,
          ),
        );
        app.rememberView();
      }
      app.canvas.width = width;
      app.canvas.height = height;
    }
    app.canvas.style.setProperty('--ratio', String(width / height));
    app.canvas.style.setProperty('--fit-ratio', String(width / height));
  }
  const coordinates = (event: { clientX: number; clientY: number }) => {
    return canvasPoint(
      event,
      app.canvas.getBoundingClientRect(),
      app.canvas.width,
      app.canvas.height,
    );
  };
  /** Small artwork gets a minimum target; the smallest box under the pointer wins over the room behind it. */
  const hitTest = (point: { x: number; y: number }) =>
    hitTestArtwork(
      app.painting.result,
      point,
      (16 * app.canvas.width) / Math.max(1, app.canvas.getBoundingClientRect().width),
    );
  const hitsUnder = (point: { x: number; y: number }) =>
    hitsAt(
      app.painting.result,
      point,
      (16 * app.canvas.width) / Math.max(1, app.canvas.getBoundingClientRect().width),
    );
  const isSelectedHit = (id: string) => {
    const source = app.painting.result?.sources?.[id];
    return source
      ? source.instance === app.editorSelection.instance &&
          source.document === app.compositionDocument()?.id
      : id === app.editorSelection.instance;
  };
  const hitLabel = (id: string) => app.painting.result?.sources?.[id]?.instance ?? id;
  function cycleAt(point: { x: number; y: number }) {
    const hits = hitsUnder(point),
      index = hits.findIndex((hit) => isSelectedHit(hit.id));
    if (hits.length < 2 || index < 0) return;
    const next = hits[(index + 1) % hits.length];
    app.select_(next.id);
    app.notice(
      `${hitLabel(next.id)} · ${((index + 1) % hits.length) + 1} of ${hits.length} here · click again for the next`,
    );
  }
  function listAt(point: { x: number; y: number }, client: { clientX: number; clientY: number }) {
    const hits = hitsUnder(point);
    if (!hits.length) return;
    const box = app.stageWrap.getBoundingClientRect();
    app.pickList.replaceChildren(
      element('div', 'pick-head', `${hits.length} here`),
      ...hits.map((hit) => {
        const item = button(hitLabel(hit.id), () => {
          app.pickList.hidden = true;
          app.select_(hit.id);
        });
        item.setAttribute('role', 'menuitem');
        item.setAttribute('aria-pressed', String(isSelectedHit(hit.id)));
        return item;
      }),
    );
    app.pickList.style.left = `${Math.min(client.clientX - box.left, box.width - 240)}px`;
    app.pickList.style.top = `${Math.min(client.clientY - box.top, box.height - 40)}px`;
    app.pickListOpened = performance.now();
    app.pickList.hidden = false;
    (app.pickList.querySelector('button:not([aria-pressed=true])') as HTMLElement | null)?.focus();
  }
  /** Presentation only: candidate values belong to the viewport gesture, committed values to ComposerModel. */
  function spatialFeedback(
    phase: 'start' | 'preview' | 'finish' | 'cancel',
    fields: readonly string[],
    node?: AssetInstance,
  ) {
    if (phase === 'start') {
      const changed = app.inspector.selectSection('appearance'),
        timeline = !!app.editorSelection.timeline;
      app.editorSelection.timeline = undefined;
      if (changed || timeline) app.refreshRight();
    }
    if (phase === 'start' || phase === 'finish' || phase === 'cancel') {
      for (const row of app.right.querySelectorAll<HTMLElement>('[data-spatial-active]'))
        delete row.dataset.spatialActive;
      const controls = [...app.right.querySelectorAll<HTMLElement>('[data-asset-property]')].filter(
        (control) => fields.includes(control.dataset.assetProperty!),
      );
      if (phase !== 'cancel')
        for (const control of controls) {
          const row = control.closest<HTMLElement>('label') ?? control;
          row.dataset.spatialActive = 'true';
          let parent: HTMLElement | null = control;
          while (parent && parent !== app.right) {
            if (parent instanceof HTMLDetailsElement) parent.open = true;
            parent = parent.parentElement;
          }
        }
      if (phase === 'finish') {
        const control = controls[0];
        if (control) {
          const area = app.right.getBoundingClientRect(),
            at = control.getBoundingClientRect();
          if (at.top < area.top) app.right.scrollTop += at.top - area.top - 12;
          else if (at.bottom > area.bottom) app.right.scrollTop += at.bottom - area.bottom + 12;
          control.focus({ preventScroll: true });
        }
      }
    }
    app.resizeFeedback.hidden = phase === 'finish' || phase === 'cancel' || !node;
    if (!app.resizeFeedback.hidden && node) {
      const schema = app.config.registry.get(node.type).fields;
      app.resizeFeedback.textContent = fields
        .map((key) => {
          const field = schema[key],
            value = node.props[key] ?? field.default,
            shown = typeof value === 'number' ? String(Number(value.toFixed(3))) : String(value);
          return field.label + ' ' + shown + (fieldUnit(field) ? ' ' + fieldUnit(field) : '');
        })
        .join(' · ');
    }
  }
  function placeHover() {
    const selected = app.painting.result?.bounds.find((box) => {
      const source = app.painting.result?.sources?.[box.id];
      return source
        ? source.document === app.editorSelection.document &&
            source.instance === app.editorSelection.instance
        : box.id === app.editorSelection.instance;
    });
    app.spatialHandles.update(app.painting.result?.handles, app.overlays && app.playHost.hidden);
    placeObjectLabel(app.selectionBox, app.overlays ? selected : undefined);
    placeObjectLabel(
      app.hoverBox,
      app.viewport.hoverId !== selected?.id
        ? app.painting.result?.bounds.find((box) => box.id === app.viewport.hoverId)
        : undefined,
    );
  }
  function placeObjectLabel(target: HTMLElement, box: PreviewResult['bounds'][number] | undefined) {
    target.hidden = !box;
    if (!box) return;
    // Hover and selection share CSS sizing, independent of canvas resolution and zoom.
    const frame = app.stageWrap.getBoundingClientRect(),
      at = app.canvas.getBoundingClientRect(),
      scale = at.width / app.canvas.width;
    const source = app.painting.result?.sources?.[box.id],
      document = source ? app.model.get(source.document) : app.compositionDocument();
    const node =
      document &&
      flatten(document.value as ChunkDocument).find(
        (x) => x.node.id === (source?.instance ?? box.id),
      )?.node;
    const left = at.left - frame.left + box.x * scale,
      top = at.top - frame.top + box.y * scale;
    Object.assign(target.style, {
      left: `${left}px`,
      top: `${top}px`,
      width: `${box.width * scale}px`,
      height: `${box.height * scale}px`,
    });
    target.dataset.label = node
      ? `${node.id} · ${app.config.registry.get(node.type).label}`
      : (source?.instance ?? box.id);
    target.toggleAttribute('data-below', top < 22);
    target.toggleAttribute('data-right', left > frame.width * 0.6);
  }
  function updateRenderStatus() {
    app.renderStatus.hidden = !app.playHost.hidden;
    if (app.renderStatus.hidden) return;
    const now = performance.now();
    if (now - app.statusUpdatedAt < 250) return;
    app.statusUpdatedAt = now;
    if (now - app.renderWindow >= 500) {
      app.renderFps = (app.painting.renderCount * 1000) / (now - app.renderWindow);
      app.painting.renderCount = 0;
      app.renderWindow = now;
    }
    const scene =
      app.painting.result?.camera ?? app.painting.result?.regions?.find((region) => region.active);
    app.renderStatus.textContent =
      (scene ? 'Chunk: ' + scene.label + ' · ' : '') +
      (!(app.playing || app.animating || app.viewport.dragging?.armed)
        ? 'Paused'
        : app.renderFps.toFixed(0) + ' render fps') +
      ' · ' +
      app.painting.lastPaintMs.toFixed(1) +
      ' ms';
    app.renderStatus.title =
      'Completed editor renders per second and CPU render submission time; not GPU/display FPS';
  }
  function zoomTo(next: number, anchor?: { clientX: number; clientY: number }) {
    stopFollowing();
    if (app.navigable()) {
      if (app.cameraPreview) return;
      const rect = app.canvas.getBoundingClientRect(),
        point = anchor ?? {
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2,
        };
      Object.assign(
        app.sequenceNav,
        zoomWorkspace(
          app.sequenceNav,
          next,
          {
            x: point.clientX - rect.left - rect.width / 2,
            y: point.clientY - rect.top - rect.height / 2,
          },
          app.canvas.width / rect.width / (app.painting.result?.workspaceScale ?? 1),
        ),
      );
      refreshViewportTools();
      void draw();
      return;
    }
  }
  /** Explicit framing never changes the authored game camera or timeline. */
  async function focusArtwork(documentId: string, id: string) {
    if (!app.navigable() || !app.playHost.hidden) return;
    stopFollowing();
    if (app.cameraPreview) {
      app.cameraPreview = false;
      refreshViewportTools();
      app.refreshOptions();
    }
    const rootDocument = app.currentId;
    await draw();
    if (app.disposed || app.currentId !== rootDocument) return;
    let result = app.painting.result,
      a = resolvedArtwork(documentId, id);
    if (!a) {
      const doc = app
          .documentsForView()
          .find((d) => d.id === documentId && d.kind === 'composition'),
        at = doc && result?.projectChunk?.((doc.value as ChunkDocument).scene, 0, 0);
      if (at) {
        const scale = result?.workspaceScale ?? 1;
        app.sequenceNav.x += (at.x - app.canvas.width / 2) / scale;
        app.sequenceNav.y -= (at.y - app.canvas.height / 2) / scale;
        await draw();
        if (app.disposed || app.currentId !== rootDocument) return;
        result = app.painting.result;
        a = resolvedArtwork(documentId, id);
      }
    }
    const box = a ? framingBounds(a) : undefined;
    if (!box || box.width <= 0 || box.height <= 0) return;
    const scale = result?.workspaceScale ?? 1;
    const target = {
      x: app.sequenceNav.x + (box.x + box.width / 2 - app.canvas.width / 2) / scale,
      y: app.sequenceNav.y - (box.y + box.height / 2 - app.canvas.height / 2) / scale,
      zoom: workspaceZoom(
        app.sequenceNav.zoom *
          Math.min(
            app.canvas.width / Math.max(80, box.width),
            app.canvas.height / Math.max(80, box.height),
          ) *
          0.8,
      ),
    };
    if (app.reduced) {
      Object.assign(app.sequenceNav, target);
      refreshViewportTools();
      void draw();
    } else
      app.focusMotion = {
        from: { ...app.sequenceNav },
        to: target,
        elapsed: 0,
        document: app.currentId,
      };
  }
  function fit() {
    stopFollowing();
    app.sequenceNav.zoom = 1;
    app.sequenceNav.x = 0;
    app.sequenceNav.y = 0;
    refreshViewportTools();
    void draw();
  }
  function refreshViewportTools() {
    app.canvas.style.imageRendering = app.compareCanvas.style.imageRendering = app.pixelatedScaling
      ? 'pixelated'
      : 'auto';
    app.stage.classList.toggle('workspace-view', dynamicWorkspace());
    const zoomReadout = button(
      Math.round(app.sequenceNav.zoom * 100) + '%',
      () => fit(),
      'Fit (F)',
    );
    zoomReadout.dataset.workspaceZoom = '';
    const toggle = (text: string, on: boolean, act: () => void, title?: string) => {
      const item = button(text, act, title);
      item.className = 'toggle';
      item.setAttribute('aria-pressed', String(on));
      return item;
    };
    const follow = toggle(
      'Follow camera',
      app.followCamera,
      () => {
        app.followCamera = !app.followCamera;
        refreshViewportTools();
        app.rememberView();
        void draw();
      },
      'Keep the game camera centred with a margin during playback and scrubbing. Pan or zoom to stop following.',
    );
    const objectBounds = toggle(
      'Object outlines',
      app.showObjectOutlines,
      () => {
        app.showObjectOutlines = !app.showObjectOutlines;
        try {
          localStorage.setItem(
            'access-denied.editor.object-outlines',
            String(app.showObjectOutlines),
          );
        } catch {
          /* optional preview preference */
        }
        refreshViewportTools();
        void draw();
      },
      'Show bounds of all visible objects; the selected outline remains visible',
    );
    app.viewportTools.hidden = app.viewMenus.hidden = !app.navigable();
    if (!app.navigable()) return;
    const boundaries = toggle('Chunk borders', app.showSceneBounds, () => {
      app.showSceneBounds = !app.showSceneBounds;
      app.placeJoined();
      refreshViewportTools();
    });
    const statuses = toggle(
      'Chunk status',
      app.showChunkStatus,
      () => {
        app.showChunkStatus = !app.showChunkStatus;
        app.placeJoined();
        refreshViewportTools();
      },
      'Show editing preparation labels beside scene borders; runtime loading is shown in the Play outline',
    );
    const look = toggle(
      'Look through game camera',
      app.cameraPreview,
      () => {
        app.cameraPreview = !app.cameraPreview;
        refreshViewportTools();
        app.refreshOptions();
        void draw();
      },
      'Camera preview looks through the authored game camera; the workspace keeps independent pan and zoom.',
    );
    app.cameraMenu.panel.replaceChildren(
      look,
      ...(app.cameraPreview
        ? []
        : [
            button(
              'Locate camera',
              locateCamera,
              'Frame the game camera without changing its properties',
            ),
            follow,
          ]),
    );
    app.showMenu.panel.replaceChildren(boundaries, statuses, objectBounds, app.showSlot);
    if (app.cameraPreview) {
      app.viewportTools.replaceChildren(
        button('Back to workspace', () => {
          app.cameraPreview = false;
          refreshViewportTools();
          app.refreshOptions();
          void draw();
        }),
      );
      return;
    }
    app.viewportTools.replaceChildren(
      button('−', () => zoomTo(app.sequenceNav.zoom / 1.25), 'Zoom out'),
      zoomReadout,
      button('+', () => zoomTo(app.sequenceNav.zoom * 1.25), 'Zoom in'),
      button('Frame', fit, 'Frame the scene (F)'),
    );
  }
  return {
    frameSelection,
    workspaceNavigation,
    gameViewport,
    dynamicWorkspace,
    previewSize,
    stopFollowing,
    locateCamera,
    previewRequest,
    resolvedArtwork,
    editDrawingBoundary,
    showDrawingBoundary,
    placeDrawingBoundary,
    draw,
    refresh,
    compareOptions,
    comparing,
    sizeCanvas,
    coordinates,
    hitTest,
    hitsUnder,
    isSelectedHit,
    hitLabel,
    cycleAt,
    listAt,
    spatialFeedback,
    placeHover,
    placeObjectLabel,
    updateRenderStatus,
    zoomTo,
    focusArtwork,
    fit,
    refreshViewportTools,
  };
}
