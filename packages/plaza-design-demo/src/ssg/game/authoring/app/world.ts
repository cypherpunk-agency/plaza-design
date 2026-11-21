/** World editing in the viewport: world members, joined chunks and dragging them. */
import { compileWorldComposition } from '../../world/compositions';
import { worldCompositionContext } from '../../world/compiled-world';
import { pendingRegistry } from '../pending-registry';
import {
  worldMemberAt,
  addressForChunk,
  moveWorldMember,
  type WorldMemberAddress,
} from '../world-members';
import {
  workspaceSource,
  renderWorldConnections,
  type WorldWorkspaceControls,
} from '../world-workspace-controls';
import { validationSnapshot } from '../validation-snapshot';
import { workspaceZoom } from '../viewport-navigation';
import { element, button } from '../controls';
import { compositionWorkspaces } from '../workspace';
import type { EditorDocument } from '../contracts';
import { message, type Composer } from './context';

export function worldArea(
  app: Composer,
): Pick<
  Composer,
  | 'syncWorldState'
  | 'worldState'
  | 'selectWorldMember'
  | 'worldControls'
  | 'startWorldDrag'
  | 'fitJoined'
  | 'placeJoined'
> {
  /** The chosen saved world state, if any; its values override the preview environment on every draw. */
  function syncWorldState() {
    const state = worldState();
    if (state) Object.assign(app.environment, state.environment);
  }
  function worldState() {
    const scene = app.viewScene();
    if (!app.config.worldStates || !scene || app.current()?.kind !== 'composition')
      return undefined;
    if (app.activeCheckpointId !== undefined)
      return app.config.worldStates
        .list('', app.documentsForView())
        .find((s) => s.id === app.activeCheckpointId);
    const id = app.config.worldStates.selected(scene, app.documentsForView());
    return id
      ? app.config.worldStates.list(scene, app.documentsForView()).find((state) => state.id === id)
      : undefined;
  }
  function selectWorldMember(address: WorldMemberAddress) {
    if (app.workspaceId !== address.composition) {
      const workspace = compositionWorkspaces(app.documentsForView()).find(
        (w) => w.id === address.composition,
      );
      if (!workspace?.chunks.length) return;
      app.openDocument(workspace.chunks[0].id, address.composition);
    }
    app.editorSelection.world = address;
    app.editorSelection.chunk = undefined;
    app.editorSelection.timeline = undefined;
    app.editorSelection.instance = '';
    app.editorSelection.document = '';
    app.refreshRight();
    for (const row of app.left.querySelectorAll<HTMLElement>('[data-world-member]'))
      row.setAttribute(
        'aria-pressed',
        String(
          row.dataset.worldMember === address.member && row.dataset.worldChild === address.child,
        ),
      );
    void app.draw();
  }
  function worldControls(
    documents: () => readonly EditorDocument[] = app.documentsForView,
  ): WorldWorkspaceControls {
    return {
      openRenderingSource: app.openRenderingSource,
      inspect: app.openInspector,
      activeInspector: () => app.inspectorDraft?.request.id,
      registry: app.config.registry,
      documents,
      composition: () => app.workspaceId,
      selection: () => app.editorSelection.world,
      select: selectWorldMember,
      openChunk: app.openScene,
      apply: (label, source) => {
        app.model.edit('world-compositions', label, () => source);
        if (!app.numericScrubbing) {
          app.thumbnailDocuments = undefined;
          app.thumbnails?.invalidate();
        }
      },
      changed: () => {
        app.outlineSnapshot = undefined;
        app.refresh();
      },
    };
  }
  function startWorldDrag(event: PointerEvent, address: WorldMemberAddress) {
    if (event.button !== 0 || app.cameraPreview || !app.playHost.hidden) return;
    event.preventDefault();
    event.stopPropagation();
    selectWorldMember(address);
    app.cancelWorldDrag?.();
    const source = workspaceSource(app.documentsForView()),
      at = { ...worldMemberAt(source, address).member.placement },
      rect = app.canvas.getBoundingClientRect();
    app.worldDrag = {
      source,
      address,
      at,
      x: event.clientX,
      y: event.clientY,
      scale: ((app.painting.result?.workspaceScale ?? 1) * rect.width) / app.canvas.width,
    };
    // Document listeners survive replacing the overlay on each real-engine render.
    const cancel = () => {
      app.cancelWorldDrag = undefined;
      app.worldDrag = undefined;
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', cancel);
      void app.draw();
    };
    const context = worldCompositionContext(
      pendingRegistry(validationSnapshot(app.documentsForView())),
    );
    const linked = event.shiftKey;
    const move = (e: PointerEvent) => {
      if (!app.worldDrag) return;
      const dx = (e.clientX - app.worldDrag.x) / app.worldDrag.scale,
        dh = (app.worldDrag.y - e.clientY) / app.worldDrag.scale;
      const quantize = (value: number) =>
        app.snap ? Math.round(value / app.snap) * app.snap : value;
      try {
        const candidate = moveWorldMember(
          source,
          address,
          { x: quantize(at.x + dx), h: quantize(at.h + dh) },
          linked,
        );
        // Drawing consumes only the latest pointer sample per animation frame; the native
        // preview validates its graph and the final edit passes full ComposerModel validation.
        compileWorldComposition(candidate, address.composition, context);
        app.worldDrag.pending = candidate;
        if (app.placementIssue) {
          app.placementIssue = undefined;
          app.refreshRight();
        }
        app.notice('Release to move chunk.');
        app.dragPreviewDirty = true;
      } catch (e) {
        app.worldDrag.pending = undefined;
        app.placementIssue = { address, reason: message(e) };
        app.inspectorError = '';
        app.refreshRight();
        app.right.scrollTop = 0;
        app.notice('Move blocked · see inspector');
        app.dragPreviewDirty = true;
      }
    };
    const up = () => {
      const pending = app.worldDrag?.pending;
      cancel();
      if (pending)
        app.run(() => app.model.edit('world-compositions', 'Drag world member', () => pending));
    };
    app.cancelWorldDrag = cancel;
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up, { once: true });
    document.addEventListener('pointercancel', cancel, { once: true });
  }
  /** Fit the actual prepared chunk regions using the shared workspace navigation. */
  function fitJoined() {
    app.stopFollowing();
    const regions = app.painting.result?.regions;
    if (!regions?.length || app.cameraPreview) return;
    const left = Math.min(...regions.map((r) => r.x)),
      right = Math.max(...regions.map((r) => r.x + r.width)),
      top = Math.min(...regions.map((r) => r.y)),
      bottom = Math.max(...regions.map((r) => r.y + r.height)),
      scale = app.painting.result?.workspaceScale ?? 1;
    app.sequenceNav.x += ((left + right) / 2 - app.canvas.width / 2) / scale;
    app.sequenceNav.y -= ((top + bottom) / 2 - app.canvas.height / 2) / scale;
    app.sequenceNav.zoom = workspaceZoom(
      app.sequenceNav.zoom *
        Math.min(
          app.canvas.width / Math.max(1, right - left),
          app.canvas.height / Math.max(1, bottom - top),
        ) *
        0.94,
    );
    app.refreshViewportTools();
    void app.draw();
  }
  /** A tag over each joined scene in the preview: its name, which side it joins on, and a button that opens it. */
  function placeJoined() {
    if (app.restoredScroll) {
      app.stage.scrollLeft = app.restoredScroll.x;
      app.stage.scrollTop = app.restoredScroll.y;
      app.restoredScroll = undefined;
    }
    app.joinedLayer.replaceChildren();
    app.placeDrawingBoundary();
    if (app.navigable()) {
      const rect = app.canvas.getBoundingClientRect(),
        frame = app.stageWrap.getBoundingClientRect(),
        scale = rect.width / app.canvas.width;
      if (app.painting.result?.camera) {
        const camera = app.painting.result.camera,
          box = element('div', 'sequence-camera-guide');
        const pick = button(
          'Camera · ' + camera.label,
          () => app.selectTimeline({ kind: 'camera' }),
          'Select the game camera',
        );
        pick.setAttribute('aria-label', 'Select game camera');
        pick.style.pointerEvents = 'auto';
        pick.setAttribute('aria-pressed', String(app.cameraSelected()));
        box.append(pick);
        for (const edge of ['top', 'right', 'bottom', 'left']) {
          const handle = button(
            '',
            () => app.selectTimeline({ kind: 'camera' }),
            'Select the game camera',
          );
          handle.className = 'camera-border-hit ' + edge;
          handle.setAttribute('aria-label', 'Select camera ' + edge + ' border');
          box.append(handle);
        }
        Object.assign(box.style, {
          left: rect.left - frame.left + camera.x * scale + 'px',
          top: rect.top - frame.top + camera.y * scale + 'px',
          width: camera.width * scale + 'px',
          height: camera.height * scale + 'px',
        });
        app.joinedLayer.append(box);
      }
      for (const group of app.left.querySelectorAll('.outline-source.active-scene'))
        group.classList.remove('active-scene');
      for (const region of app.painting.result?.regions ?? []) {
        app.left
          .querySelector<HTMLElement>(`.outline-source[data-document="${region.document}"]`)
          ?.classList.toggle('active-scene', region.active);
        if (!app.showSceneBounds) continue;
        const box = element(
          'div',
          'scene-boundary' +
            (region.active ? ' active' : '') +
            (app.inspectorDraft?.request.highlightChunks?.includes(region.scene)
              ? ' connection-endpoint'
              : ''),
        );
        const address = app.workspaceId
          ? addressForChunk(workspaceSource(app.documentsForView()), app.workspaceId, region.scene)
          : undefined;
        const caption = button(
          region.label + (app.showChunkStatus ? ' · Prepared for editing' : ''),
          () => (address ? selectWorldMember(address) : app.inspectChunk(region.scene)),
          'Select chunk; drag to move, Shift-drag moves connected members together',
        );
        caption.className = 'chunk-boundary-label';
        caption.style.pointerEvents = 'auto';
        if (address) {
          caption.setAttribute(
            'aria-pressed',
            String(
              app.editorSelection.world?.member === address.member &&
                app.editorSelection.world?.child === address.child,
            ),
          );
          caption.onpointerdown = (event) => startWorldDrag(event, address);
        }
        box.append(caption);
        if (address?.child) {
          const parent = { composition: address.composition, member: address.member },
            group = button(
              'Group · ' + address.member,
              () => selectWorldMember(parent),
              'Select or drag the containing group; Shift-drag moves connected groups together',
            );
          group.className = 'chunk-boundary-label';
          group.style.pointerEvents = 'auto';
          group.onpointerdown = (event) => startWorldDrag(event, parent);
          box.append(group);
        }
        Object.assign(box.style, {
          left: rect.left - frame.left + region.x * scale + 'px',
          top: rect.top - frame.top + region.y * scale + 'px',
          width: region.width * scale + 'px',
          height: region.height * scale + 'px',
        });
        app.joinedLayer.append(box);
      }
      if (app.showSceneBounds && app.workspaceId && app.painting.result)
        renderWorldConnections(
          app.joinedLayer,
          worldControls(() => app.model.interactionPreview()?.documents ?? app.documentsForView()),
          app.painting.result,
          { x: rect.left - frame.left, y: rect.top - frame.top, scale },
        );
      const cameraOwner =
        app.painting.result?.camera && app.outlineSceneOwners.get(app.painting.result.camera.scene);
      if (cameraOwner)
        app.left
          .querySelector<HTMLElement>(`.outline-source[data-document="${cameraOwner}"]`)
          ?.classList.add('active-scene');
      app.updateRenderStatus();
      return;
    }
  }
  return {
    syncWorldState,
    worldState,
    selectWorldMember,
    worldControls,
    startWorldDrag,
    fitJoined,
    placeJoined,
  };
}
