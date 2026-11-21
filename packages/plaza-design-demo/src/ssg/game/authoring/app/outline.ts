/** The left dock: scene outline, library and city map. */
import { renderWorldMembers } from '../world-workspace-controls';
import { element, button } from '../controls';
import { outlineDocuments } from '../outline-documents';
import { workspaceDocuments } from '../workspace';
import { perfMeasure } from '../../runtime/diagnostics/performance';
import { type ChunkDocument, type AssetInstance } from '../../art/core/composition';
import { KIND_HINTS, LAYER_ROLES, layerRole } from '../layer-roles';
import { LAYER_HINTS, LAYER_LABELS, VISUAL_LAYERS, isPlayerRow, layerRows } from '../layer-stack';
import type { Layer } from '../../art/core/composition';
import type { EditorDocument } from '../contracts';
import { BARRIER_ICON, flatten, type Composer } from './context';

export function outlineArea(
  app: Composer,
): Pick<
  Composer,
  | 'refreshLibrary'
  | 'refreshLibraryContent'
  | 'refreshMap'
  | 'leftDockHead'
  | 'renderLibraryDock'
  | 'refreshLeft'
  | 'renderOutlineDocument'
> {
  function refreshLibrary() {
    return perfMeasure('editor.library', refreshLibraryContent);
  }
  function refreshLibraryContent() {
    app.cleanupAssets?.();
    app.cleanupAssets = undefined;
    app.assetPanel.replaceChildren();
    app.thumbnails?.prune();
    if (!app.config.assetPreview || !app.assetHost.open) return;
    const scene = app.current()?.kind === 'composition' ? app.sceneId() : '';
    app.cleanupAssets = app.mountArtwork(
      app.assetPanel,
      scene,
      (entry) => {
        app.showLayout();
        void app.addAtView(entry.id);
      },
      (kit, settings, children) => {
        app.showLayout();
        void app.addAtView(kit.id, settings, children);
      },
    );
  }
  function refreshMap() {
    app.cleanupWorld?.();
    app.cleanupWorld = undefined;
    app.mapPanel.replaceChildren();
    if (app.config.worldPanel && app.mapHost.open)
      app.cleanupWorld = app.config.worldPanel(
        app.mapPanel,
        app.openScene,
        app.documentsForView(),
        app.sceneId(),
        app.liveContext(app.sceneId()),
      );
    app.cityDistrict = undefined;
  }
  function leftDockHead() {
    const head = element('div', 'dock-head');
    head.setAttribute('role', 'tablist');
    head.setAttribute('aria-label', 'Left dock');
    for (const [id, text] of [
      ['outline', 'Outline'],
      ['library', 'Library'],
    ] as const) {
      const tab = button(text, () => {
        if (app.leftTab === 'library' && id !== 'library') {
          app.cleanupDockLibrary?.();
          app.cleanupDockLibrary = undefined;
        }
        app.leftTab = id;
        app.outlineVersion = '';
        app.outlineSnapshot = undefined;
        app.outlineView = '';
        app.left.replaceChildren();
        refreshLeft();
      });
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', String(app.leftTab === id));
      head.append(tab);
    }
    return head;
  }
  function renderLibraryDock() {
    app.cleanupDockLibrary?.();
    app.cleanupDockLibrary = undefined;
    const body = element('div', 'library-dock'),
      browser = element('div', 'library-browser'),
      list = element('ul', 'library-list');
    if (app.config.assetPreview && app.current()?.kind === 'composition') {
      body.append(
        element(
          'div',
          'library-hint',
          'Drag a piece into the scene, or double-click to add it in view.',
        ),
        browser,
      );
      app.cleanupDockLibrary = app.mountArtwork(
        browser,
        app.sceneId(),
        (entry) => void app.addAtView(entry.id),
        (kit, settings, children) => void app.addAtView(kit.id, settings, children),
      );
    }
    for (const item of app.panels.filter((p) => p.group === 'library')) {
      const row = element('li'),
        open = button(item.label, () => app.openPanel(item.details), item.title);
      row.append(open);
      list.append(row);
    }
    body.append(element('h3', '', 'Library screens'), list);
    return body;
  }
  function refreshLeft() {
    app.workbenches.forEach((item) => app.refreshWorkbench(item, true));
    {
      const docs = app.documentsForView(),
        library = [docs, app.sceneId(), app.assetHost.open, app.current()?.kind],
        map = [docs, app.sceneId(), app.mapHost.open, app.cityDistrict];
      if (!app.sameDocuments(library, app.libraryShown)) {
        app.libraryShown = library;
        refreshLibrary();
      }
      if (!app.sameDocuments(map, app.mapShown)) {
        app.mapShown = map;
        refreshMap();
      }
    }
    if (app.root.dataset.tool !== 'scene') {
      app.layoutDirty = true;
      return;
    }
    if (app.leftTab === 'library') {
      if (app.left.querySelector('.library-dock') && app.outlineView === app.currentId) return;
      app.outlineVersion = '';
      app.outlineSnapshot = undefined;
      app.outlineView = app.currentId;
      app.left.replaceChildren(leftDockHead(), renderLibraryDock());
      return;
    }
    if (app.outlineSnapshot === app.model.sourceVersion && app.outlineView === app.currentId) {
      app.updateOutlineSelection();
      return;
    }
    app.outlineSnapshot = app.model.sourceVersion;
    app.outlineView = app.currentId;
    const docs = app.documentsForView(),
      sources = app.workspaceId
        ? [
            ...new Map(
              [
                ...(app.currentTimeline()
                  ? outlineDocuments(app.viewCompositionDocument(), docs)
                  : []),
                ...workspaceDocuments(app.workspaceId, docs),
                ...workspaceDocuments(
                  app.workspaceId,
                  docs,
                  app.worldState()?.checkpoint?.membership,
                ),
              ].map((d) => [d.id, d]),
            ).values(),
          ]
        : outlineDocuments(
            app.viewCompositionDocument(),
            docs,
            app.config.joinedScenes?.(app.viewScene(), docs).map((r) => r.zone) ?? [],
          );
    app.outlineSceneOwners.clear();
    for (const source of sources)
      app.outlineSceneOwners.set((source.value as ChunkDocument).scene, source.id);
    const version =
      (app.workspaceId
        ? JSON.stringify(docs.find((d) => d.id === 'world-compositions')?.value)
        : '') +
      JSON.stringify(sources, (key, value) =>
        key === 'sequence'
          ? !!value
          : key === 'placement'
            ? { ...value, x: undefined, h: undefined, scale: undefined, facing: undefined }
            : value,
      ) +
      JSON.stringify(
        sources.flatMap((source) =>
          (app.config.sceneDocuments?.((source.value as ChunkDocument).scene, docs) ?? []).map(
            (id) => docs.find((d) => d.id === id),
          ),
        ),
      );
    if (version === app.outlineVersion) {
      app.updateOutlineSelection();
      return;
    }
    app.outlineVersion = version;
    app.left.replaceChildren();
    app.left.append(leftDockHead(), app.sceneContext, app.runtimeOutline);
    const updates: (() => void)[] = [],
      filters: (() => void)[] = [];
    if (app.workspaceId) {
      renderWorldMembers(app.left, app.worldControls());
      updates.push(() => {
        for (const row of app.left.querySelectorAll<HTMLElement>('[data-world-member]'))
          row.setAttribute(
            'aria-pressed',
            String(
              row.dataset.worldMember === app.editorSelection.world?.member &&
                row.dataset.worldChild === app.editorSelection.world?.child,
            ),
          );
      });
    }
    if (!sources.length)
      app.left.append(element('p', 'muted', 'Open a scene to inspect its assets.'));
    if (app.navigable()) {
      const camera = button(
        'Camera',
        () => app.selectTimeline({ kind: 'camera' }),
        'Inspect the authored game camera',
      );
      camera.setAttribute('aria-label', 'Camera in outline');
      app.left.append(camera);
      updates.push(() => camera.setAttribute('aria-pressed', String(app.cameraSelected())));

      const tools = element('div', 'layer-tools'),
        search = element('input'),
        sort = element('div', 'segmented');
      sort.setAttribute('role', 'group');
      sort.setAttribute('aria-label', 'Arrange the outline');
      search.type = 'search';
      search.placeholder = 'Filter all sources';
      search.value = app.layerQuery;
      search.setAttribute('aria-label', 'Filter the outline');
      search.oninput = () => {
        app.layerQuery = search.value;
        filters.forEach((render) => render());
      };
      for (const mode of ['kind', 'order'] as const) {
        const pick = button(mode === 'kind' ? 'Kind' : 'Order', () => {
          app.layerSort = mode;
          for (const child of sort.children)
            child.setAttribute(
              'aria-pressed',
              String((child as HTMLElement).dataset.mode === mode),
            );
          filters.forEach((render) => render());
        });
        pick.dataset.mode = mode;
        pick.setAttribute('aria-pressed', String(app.layerSort === mode));
        sort.append(pick);
      }
      tools.append(search, sort);
      app.left.append(tools);
    }
    for (const source of sources) {
      const group = element('details', 'outline-source'),
        composition = source.value as ChunkDocument;
      group.dataset.document = source.id;
      group.open = app.outlineSourceOpen.get(source.id) ?? false;
      const summary = element(
        'summary',
        '',
        source.id === app.viewCompositionDocument()?.id
          ? app.currentTimeline() && sources.length > 1
            ? 'Sequence controls'
            : app.sceneName(composition.scene)
          : source.id.startsWith('backdrop-')
            ? 'Shared backdrop · ' + source.id.slice(9)
            : app.sceneName(composition.scene),
      );
      summary.title = source.id;

      if (app.workspaceId) {
        summary.title = source.id + ' · double-click to frame this chunk';
        summary.ondblclick = (event) => {
          event.preventDefault();
          event.stopPropagation();
          const region = app.painting.result?.regions?.find((r) => r.document === source.id);
          if (region) {
            app.stopFollowing();
            app.sequenceNav.x +=
              (region.x + region.width / 2 - app.canvas.width / 2) /
              (app.painting.result?.workspaceScale ?? 1);
            app.editorSelection.world = undefined;
            app.editorSelection.document = source.id;
            app.editorSelection.instance = '';
            app.editorSelection.chunk = composition.scene;
            app.refreshRight();
            app.refreshViewportTools();
            void app.draw();
          }
        };
      }
      const container = element('div');
      group.append(summary, container);
      app.left.append(group);
      group.ontoggle = () => {
        if (!app.layerQuery.trim()) {
          app.outlineSourceOpen.set(source.id, group.open);
          app.saveFolds();
        }
      };
      const handle = renderOutlineDocument(source, container);
      filters.push(() => {
        handle.filter();
        if (app.layerQuery.trim()) group.open = true;
        else group.open = app.outlineSourceOpen.get(source.id) ?? false;
      });
      updates.push(() => {
        if (app.compositionDocument()?.id === source.id && app.editorSelection.instance) {
          group.open = true;
          app.outlineSourceOpen.set(source.id, true);
        }
        handle.selection();
      });
    }
    app.updateOutlineSelection = () => updates.forEach((update) => update());
    app.updateOutlineSelection();
  }
  function renderOutlineDocument(
    doc: EditorDocument,
    container: HTMLElement,
  ): { selection: () => void; filter: () => void } {
    const composition = doc.value as ChunkDocument,
      rows = flatten(composition),
      parents = new Map<string, string>();
    const visit = (nodes: AssetInstance[], parent?: string) =>
      nodes.forEach((node) => {
        if (parent) parents.set(node.id, parent);
        visit(node.children ?? [], node.id);
      });
    visit(composition.instances);
    const within = (id: string, ancestor: string) => {
      for (let at = parents.get(id); at; at = parents.get(at)) if (at === ancestor) return true;
      return false;
    };
    const art = (node: AssetInstance) => app.config.registry.get(node.type);
    // Actor looks from the scene's own documents decide Human / Animal / Robot for characters.
    const docs = app.documentsForView(),
      looks = new Map<string, unknown>();
    for (const id of app.config.sceneDocuments?.(composition.scene, docs) ?? []) {
      const actors = (
        docs.find((d) => d.id === id)?.value as
          { actors?: { id: string; instance?: string; look?: unknown }[] } | undefined
      )?.actors;
      for (const a of Array.isArray(actors) ? actors : []) looks.set(a.instance ?? a.id, a.look);
    }
    const kind = (node: AssetInstance) =>
      layerRole(node.type, art(node).label, art(node).category, looks.get(node.id));
    const matches = (node: AssetInstance) => {
      const query = app.layerQuery.trim().toLowerCase();
      return (
        (app.compositionDocument()?.id === doc.id && node.id === app.editorSelection.instance) ||
        !query ||
        `${node.id} ${node.type} ${art(node).label}`.toLowerCase().includes(query)
      );
    };
    const listHost = element('div');
    container.append(listHost);
    const hidden = app.hiddenIn(doc.id),
      allIds = rows.map((r) => r.node.id);
    /** Click hides or shows; Alt-click shows only these (Alt-click again shows everything). */
    const eye = (ids: () => string[], label: string) => {
      const node = element('button', 'eye'),
        set = ids(),
        off = set.length > 0 && set.every((id) => hidden.has(id));
      node.type = 'button';
      node.title = `${off ? 'Show' : 'Hide'} ${label} in the preview (Alt-click: show only this)`;
      node.dataset.off = String(off);
      node.setAttribute('aria-label', node.title);
      node.innerHTML = off
        ? '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" fill="none" stroke="currentColor" opacity=".5"/><path d="M2 14 14 2" stroke="currentColor"/></svg>'
        : '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" fill="none" stroke="currentColor"/><circle cx="8" cy="8" r="2.2" fill="currentColor"/></svg>';
      node.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        const chosen = ids();
        if (event.altKey) {
          const others = allIds.filter((id) => !chosen.includes(id)),
            soloed =
              others.length > 0 &&
              others.every((id) => hidden.has(id)) &&
              chosen.every((id) => !hidden.has(id));
          hidden.clear();
          if (!soloed) others.forEach((id) => hidden.add(id));
        } else if (chosen.every((id) => hidden.has(id))) chosen.forEach((id) => hidden.delete(id));
        else chosen.forEach((id) => hidden.add(id));
        renderLayers();
        void app.draw();
      };
      return node;
    };
    // Hovering a row outlines the artwork in the preview, the same box the preview shows on hover.
    const item = (node: AssetInstance, depth: number) => {
      const key = JSON.stringify([doc.id, node.id]),
        active = () =>
          app.compositionDocument()?.id === doc.id && node.id === app.editorSelection.instance;
      const li = element('li'),
        pick = button(
          '',
          () => {
            if (active()) app.select_('');
            else {
              app.editorSelection.world = undefined;
              app.editorSelection.chunk = undefined;
              app.editorSelection.timeline = undefined;
              app.editorSelection.document = doc.id;
              app.editorSelection.instance = node.id;
              app.timelineView.collapsed.delete(node.id);
              app.refreshRight();
              app.updateOutlineSelection();
              app.refreshTimeline();
              void app.draw();
            }
          },
          `${art(node).label} · ${node.type} · ${LAYER_LABELS[node.layer]}${parents.has(node.id) ? ` · in ${parents.get(node.id)}` : ''}`,
        );
      const selectRow = pick.onclick!;
      pick.onclick = (event) => {
        if (event.detail < 2) selectRow.call(pick, event);
      };
      pick.ondblclick = (event) => {
        event.preventDefault();
        if (!active()) selectRow.call(pick, event);
        void app.focusArtwork(doc.id, node.id);
      };
      pick.title += ' · Double-click to frame asset';
      pick.onmouseenter = pick.onfocus = () => {
        app.viewport.hoverId = app.painting.result?.sources?.[key]
          ? key
          : doc.id === app.currentId
            ? node.id
            : key;
        app.placeHover();
      };
      pick.onmouseleave = pick.onblur = () => {
        if (app.viewport.hoverId === key || app.viewport.hoverId === node.id) {
          app.viewport.hoverId = '';
          app.placeHover();
        }
      };
      const parallax = node.placement.parallax ?? 1;
      if (node.type === 'level.barrier') {
        const mark = element('span', 'layer-badge');
        mark.innerHTML = BARRIER_ICON;
        mark.title = 'Barrier: select it to edit who may pass (Access)';
        pick.append(mark);
      }
      pick.append(
        element('span', 'layer-name', node.id),
        element(
          'span',
          'layer-kind',
          (parallax !== 1 && app.layerSort === 'order' ? `×${parallax} · ` : '') + kind(node),
        ),
      );
      pick.style.paddingLeft = `${10 + depth * 14}px`;
      pick.dataset.instance = node.id;
      pick.dataset.document = doc.id;
      pick.setAttribute('aria-pressed', String(active()));
      if (hidden.has(node.id)) li.classList.add('is-hidden');
      li.append(
        pick,
        eye(() => [node.id], node.id),
      );
      return li;
    };
    /** A new selection (often picked in the preview) unfolds the section that holds it, so the row can be scrolled to. */
    const reveal = () => {
      if (
        app.compositionDocument()?.id !== doc.id ||
        !app.editorSelection.instance ||
        JSON.stringify([doc.id, app.editorSelection.instance]) === app.revealed
      )
        return false;
      const node = rows.find((row) => row.node.id === app.editorSelection.instance)?.node;
      if (!node) return false;
      app.revealed = JSON.stringify([doc.id, app.editorSelection.instance]);
      let top = node;
      for (let at = parents.get(node.id); at; at = parents.get(at))
        top = rows.find((row) => row.node.id === at)?.node ?? top;
      const layer = node.layer ?? top.layer;
      if (app.layerSort === 'kind') app.roleOpen.set(kind(top), true);
      else if (layer === 'logic') app.roleOpen.set('logic-layer', true);
      else if (layer) app.roleOpen.set('stack:' + layer, true);
      return true;
    };
    function renderLayers() {
      const scroll = app.left.scrollTop;
      reveal();
      listHost.replaceChildren();
      let shown = 0;
      if (hidden.size) {
        const reveal = button(
          `Show all (${hidden.size})`,
          () => {
            hidden.clear();
            renderLayers();
            void app.draw();
          },
          'Show everything hidden with the eyes',
        );
        reveal.className = 'show-all';
        listHost.append(reveal);
      }
      if (app.layerSort === 'order') shown = renderStack();
      else
        for (const role of LAYER_ROLES) {
          const list = element('ul', 'hierarchy');
          let count = 0;
          for (const top of rows.filter(
            (row) => !parents.has(row.node.id) && kind(row.node) === role,
          )) {
            const nested = rows.filter((row) => within(row.node.id, top.node.id));
            if (!matches(top.node) && !nested.some((row) => matches(row.node))) continue;
            list.append(item(top.node, 0));
            count++;
            for (const row of nested)
              if (matches(row.node) || matches(top.node))
                list.append(item(row.node, row.depth - top.depth));
          }
          if (!count) continue;
          shown += count;
          const group = element('details', 'layer-group');
          group.open = app.layerQuery.trim() ? true : (app.roleOpen.get(role) ?? false);
          group.ontoggle = () => {
            if (!app.layerQuery.trim()) app.roleOpen.set(role, group.open);
            app.saveFolds();
          };
          const summary = element('summary', '', `${role} · ${count}`);
          summary.title = KIND_HINTS[role];
          group.append(summary, list);
          listHost.append(group);
        }
      if (!shown)
        listHost.append(
          element(
            'p',
            'muted',
            app.layerQuery.trim()
              ? 'Nothing matches this filter.'
              : 'This scene has no assets yet. Use ＋ Add asset in the toolbar.',
          ),
        );
      app.left.scrollTop = scroll;
      // Selection never scrolls the outline; the user owns its scroll position.
    }
    /** Front at the top, like a paint program's layer list. */
    function renderStack() {
      let shown = 0,
        dragged = '';
      const stack = element('div', 'layer-stack');
      const drop = (
        target: HTMLElement,
        place: (event: DragEvent) => { layer: Layer; index: number } | undefined,
      ) => {
        target.ondragover = (event) => {
          if (!dragged || !place(event)) return;
          event.preventDefault();
          target.classList.add('drop-target');
        };
        target.ondragleave = () => target.classList.remove('drop-target');
        target.ondrop = (event) => {
          event.preventDefault();
          target.classList.remove('drop-target');
          const at = place(event);
          if (!at || !dragged) return;
          const id = dragged;
          dragged = '';
          app.run(() => app.model.restack(doc!.id, id, at.layer, at.index));
        };
      };
      const draggedNode = () => rows.find((r) => r.node.id === dragged)?.node;
      const accepts = (layer: Layer) => {
        const node = draggedNode();
        if (!node) return false;
        const e = art(node);
        return isPlayerRow(node)
          ? layer === 'playfield'
          : e.role === 'group'
            ? layer !== 'logic'
            : (e.parts.length === 0) === (layer === 'logic');
      };
      const row = (node: AssetInstance) => {
        const li = item(node, 0);
        if (isPlayerRow(node)) li.classList.add('player-row');
        li.draggable = true;
        li.ondragstart = (event) => {
          dragged = node.id;
          event.dataTransfer?.setData('text/plain', node.id);
          li.classList.add('dragging');
        };
        li.ondragend = () => {
          dragged = '';
          li.classList.remove('dragging');
        };
        drop(li, (event) => {
          const layer = node.layer!;
          if (!accepts(layer) || dragged === node.id) return;
          const others = layerRows(composition, layer).filter((n) => n.id !== dragged),
            box = li.getBoundingClientRect(),
            front = event.clientY < box.top + box.height / 2;
          return { layer, index: others.indexOf(node) + (front ? 1 : 0) };
        });
        return li;
      };
      const section = (layer: Layer, body: (list: HTMLElement) => number) => {
        const box = element('section', 'stack-layer'),
          head = element('div', 'stack-head'),
          list = element('ul', 'hierarchy'),
          key = 'stack:' + layer,
          open = !!app.layerQuery.trim() || (app.roleOpen.get(key) ?? false);
        const toggleLayer = () => {
          app.roleOpen.set(key, !open);
          app.saveFolds();
          renderLayers();
        };
        const fold = button(
          open ? '▾' : '▸',
          toggleLayer,
          `${open ? 'Collapse' : 'Expand'} the ${LAYER_LABELS[layer]} layer`,
        );
        fold.className = 'fold';
        fold.setAttribute('aria-expanded', String(open));
        list.hidden = !open;
        const count = body(list);
        shown += count;
        const ids = () => layerRows(composition, layer).map((n) => n.id);
        const name = button(
          LAYER_LABELS[layer],
          toggleLayer,
          `${open ? 'Collapse' : 'Expand'} the ${LAYER_LABELS[layer]} layer`,
        );
        name.className = 'stack-name';
        name.setAttribute('aria-expanded', String(open));
        head.append(
          fold,
          name,
          element('span', 'muted', String(ids().length)),
          ...(ids().length
            ? [eye(ids, `the ${LAYER_LABELS[layer]} layer`)]
            : [element('span', 'eye-space')]),
        );
        head.title = LAYER_HINTS[layer];
        drop(head, () =>
          accepts(layer)
            ? { layer, index: layerRows(composition, layer).filter((n) => n.id !== dragged).length }
            : undefined,
        );
        box.append(head, list);
        stack.append(box);
      };
      const list = (target: HTMLElement, nodes: AssetInstance[]) => {
        let n = 0;
        for (const node of [...nodes].reverse())
          if (matches(node)) {
            target.append(row(node));
            n++;
          }
        return n;
      };
      for (const layer of [...VISUAL_LAYERS].reverse()) {
        section(layer, (target) => list(target, layerRows(composition, layer)));
      }
      const logic = element('details', 'layer-group logic-group');
      logic.open = app.roleOpen.get('logic-layer') ?? false;
      logic.ontoggle = () => {
        app.roleOpen.set('logic-layer', logic.open);
        app.saveFolds();
      };
      const logicList = element('ul', 'hierarchy');
      shown += list(logicList, layerRows(composition, 'logic'));
      const logicIds = () => layerRows(composition, 'logic').map((n) => n.id),
        summary = element('summary', '', `${LAYER_LABELS.logic} · ${logicIds().length}`);
      if (logicIds().length) summary.append(eye(logicIds, 'the Logic layer'));
      logic.append(summary, logicList);
      logic.title = LAYER_HINTS.logic;
      listHost.append(stack, logic);
      return shown;
    }
    const updateSelection = () => {
      const fresh = reveal();
      let selectedRow: HTMLElement | undefined;
      container.querySelectorAll<HTMLElement>('[data-instance]').forEach((row) => {
        const active =
          row.dataset.document === app.compositionDocument()?.id &&
          row.dataset.instance === app.editorSelection.instance;
        row.setAttribute('aria-pressed', String(active));
        if (active) selectedRow = row;
      });
      if (fresh && !selectedRow) {
        renderLayers();
        return;
      }
      if (
        fresh &&
        selectedRow &&
        (selectedRow.closest('details:not([open])') || selectedRow.closest('[hidden]'))
      ) {
        renderLayers();
        return;
      }
    };
    renderLayers();

    return { selection: updateSelection, filter: renderLayers };
  }
  return {
    refreshLibrary,
    refreshLibraryContent,
    refreshMap,
    leftDockHead,
    renderLibraryDock,
    refreshLeft,
    renderOutlineDocument,
  };
}
