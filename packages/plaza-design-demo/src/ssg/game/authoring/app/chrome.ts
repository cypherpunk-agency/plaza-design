/** Editor chrome: docks and panel layout, the error log, overlay menus, command search and notices. */
import { element, button } from '../controls';
import { type SearchEntry } from '../command-search';
import { compositionWorkspaces, workspaceDocuments } from '../workspace';
import { type ChunkDocument, type Field } from '../../art/core/composition';
import type { EditorDocument } from '../contracts';
import { flatten, message, type DockState, type Workspace, type Composer } from './context';

export function chromeArea(
  app: Composer,
): Pick<
  Composer,
  | 'commandTargets'
  | 'panelHandles'
  | 'readDock'
  | 'writeDock'
  | 'renderErrors'
  | 'reportError'
  | 'onWindowError'
  | 'onRejection'
  | 'refreshDockToggles'
  | 'setDockClosed'
  | 'dockStrips'
  | 'applyDocks'
  | 'resetLayout'
  | 'toggleMaximized'
  | 'overlayMenu'
  | 'focusField'
  | 'collectSearch'
  | 'notice'
  | 'readFolds'
  | 'saveFolds'
  | 'closeMenu'
> {
  const commandTargets = () => {
    if (app.commandTargetsVersion !== app.model.sourceVersion) {
      app.commandTargetsCache = app.config.commandTargetsFor?.(app.model.inspectDocuments()) ?? {};
      app.commandTargetsVersion = app.model.sourceVersion;
    }
    return app.commandTargetsCache;
  };
  /** Drag handles on the panels' inner edges. Widths are a per-browser convenience (localStorage), never source. */
  function panelHandles() {
    const sides = [
      { side: 'left', variable: '--left-w', min: 160, max: 560 },
      { side: 'right', variable: '--right-w', min: 220, max: 680 },
    ] as const;
    return sides.map(({ side, variable, min, max }) => {
      const handle = element('div', `panel-handle ${side}`);
      handle.setAttribute('role', 'separator');
      handle.setAttribute('aria-orientation', 'vertical');
      handle.title = 'Drag to resize; double-click to reset';
      const apply = (width: number | null) => {
        if (width === null) app.workspace.style.removeProperty(variable);
        else
          app.workspace.style.setProperty(
            variable,
            `${Math.round(Math.min(max, Math.max(min, width)))}px`,
          );
      };
      handle.onpointerdown = (event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        handle.setPointerCapture(event.pointerId);
        handle.classList.add('dragging');
        const move = (e: PointerEvent) => {
          const box = app.workspace.getBoundingClientRect();
          apply(side === 'left' ? e.clientX - box.left : box.right - e.clientX);
        };
        const up = () => {
          handle.classList.remove('dragging');
          handle.removeEventListener('pointermove', move);
          handle.removeEventListener('pointerup', up);
          handle.removeEventListener('pointercancel', up);
          writeDock({
            [side]: Number.parseFloat(app.workspace.style.getPropertyValue(variable)) || undefined,
          });
        };
        handle.addEventListener('pointermove', move);
        handle.addEventListener('pointerup', up);
        handle.addEventListener('pointercancel', up);
      };
      handle.ondblclick = () => {
        apply(null);
        writeDock({ [side]: undefined });
        applyDocks(app.dockWorkspace);
        void app.draw();
      };
      return handle;
    });
  }
  const readDock = (ws: string): DockState => {
    try {
      return JSON.parse(localStorage.getItem(`composer.dock.${ws}`) ?? '{}') as DockState;
    } catch {
      return {};
    }
  };
  const writeDock = (patch: DockState) => {
    const next = { ...readDock(app.dockWorkspace), ...patch };
    try {
      localStorage.setItem(`composer.dock.${app.dockWorkspace}`, JSON.stringify(next));
    } catch {
      /* storage unavailable: layout lasts for this visit */
    }
  };
  function renderErrors() {
    const head = element('div', 'error-list-head'),
      copyAll = button(
        'Copy',
        () =>
          void navigator.clipboard?.writeText(
            app.errorLog.map((row) => `${row.where} ×${row.count}: ${row.detail}`).join('\n\n'),
          ),
        'Copy all errors with details',
      ),
      clear = button(
        'Clear',
        () => {
          app.errorLog.length = 0;
          app.errorChip.hidden = true;
          app.errorList.hidden = true;
          app.errorsTab.textContent = 'Errors';
          app.errorsTab.classList.remove('has-errors');
        },
        'Clear the error list',
      );
    head.append(
      element('strong', '', 'Editor errors'),
      element('span', 'status-spacer'),
      copyAll,
      clear,
    );
    app.errorList.replaceChildren(
      head,
      ...app.errorLog.map((row) => {
        const item = element('details', 'error-row'),
          summary = element(
            'summary',
            '',
            `${row.where}${row.count > 1 ? ` ×${row.count}` : ''} · ${row.text}`,
          );
        item.append(summary, element('pre', '', row.detail));
        return item;
      }),
    );
  }
  function reportError(error: unknown, where: string) {
    const text = message(error),
      detail = error instanceof Error && error.stack ? error.stack : text,
      row = app.errorLog.find((item) => item.text === text && item.where === where);
    if (row) row.count++;
    else {
      app.errorLog.push({ text, where, detail, count: 1 });
      if (app.errorLog.length > 20) app.errorLog.shift();
      console.error(error);
    }
    app.errorsTab.textContent = `Errors ${app.errorLog.length}`;
    app.errorsTab.classList.add('has-errors');
    app.errorChip.hidden = false;
    app.errorChip.textContent = `! ${app.errorLog.length === 1 ? 'Error' : `${app.errorLog.length} errors`} · ${text}`;
    app.errorChip.title = `${where}: ${text} (click for details)`;
    if (!app.errorList.hidden) renderErrors();
  }
  const onWindowError = (event: ErrorEvent) =>
    reportError(event.error ?? event.message, 'Uncaught error');
  const onRejection = (event: PromiseRejectionEvent) => reportError(event.reason, 'Failed promise');
  function refreshDockToggles() {
    app.dockButtons.forEach((toggle, index) =>
      toggle.setAttribute(
        'aria-pressed',
        String(!app.root.hasAttribute(`data-${index ? 'right' : 'left'}-closed`)),
      ),
    );
  }
  function setDockClosed(side: 'left' | 'right', closed: boolean) {
    app.root.toggleAttribute(`data-${side}-closed`, closed);
    writeDock(side === 'left' ? { leftClosed: closed } : { rightClosed: closed });
    refreshDockToggles();
    void app.draw();
  }
  /** A closed dock leaves a narrow strip at its edge that reopens it. */
  function dockStrips() {
    return (['left', 'right'] as const).map((side) => {
      const strip = button(
        side === 'left' ? 'Outline ▸' : '◂ Inspector',
        () => setDockClosed(side, false),
        `Open the ${side === 'left' ? 'outline' : 'inspector'}`,
      );
      strip.className = `dock-strip ${side}`;
      return strip;
    });
  }
  function applyDocks(ws: string) {
    app.dockWorkspace = ws;
    const state = { ...app.DOCK_DEFAULTS[ws], ...readDock(ws) };
    for (const side of ['left', 'right'] as const) {
      const width = state[side];
      if (width) app.workspace.style.setProperty(`--${side}-w`, `${width}px`);
      else app.workspace.style.removeProperty(`--${side}-w`);
    }
    app.root.toggleAttribute('data-left-closed', !!state.leftClosed);
    app.root.toggleAttribute('data-right-closed', !!state.rightClosed);
    if (state.max) app.root.dataset.maximized = state.max;
    else delete app.root.dataset.maximized;
    refreshDockToggles();
  }
  function resetLayout() {
    try {
      for (const key of Object.keys(localStorage))
        if (key.startsWith('composer.dock.') || key.startsWith('composer.panel.'))
          localStorage.removeItem(key);
    } catch {
      /* storage unavailable */
    }
    applyDocks(app.dockWorkspace);
    void app.draw();
  }
  function toggleMaximized() {
    const next = app.root.dataset.maximized ? undefined : app.pointerRegion;
    if (next) app.root.dataset.maximized = next;
    else delete app.root.dataset.maximized;
    writeDock({ max: next });
    void app.draw();
  }
  const overlayMenu = (text: string, title: string) => {
    const menu = element('details', 'ov-menu'),
      summary = element('summary', '', text),
      panel = element('div', 'ov-menu-panel');
    summary.title = title;
    menu.append(summary, panel);
    return { menu, panel };
  };
  /** Opens the selected artwork's Appearance and focuses one of its fields. */
  function focusField(key: string, text: string) {
    app.inspector.appearance();
    app.refreshRight();
    const control =
      app.right.querySelector<HTMLElement>(`[data-asset-property="${key}"]`) ??
      [...app.right.querySelectorAll('label')]
        .find((row) => row.querySelector('span')?.textContent?.startsWith(text))
        ?.querySelector<HTMLElement>('input,select,textarea') ??
      null;
    if (!control) return;
    let parent = control.parentElement;
    while (parent && parent !== app.right) {
      if (parent instanceof HTMLDetailsElement) parent.open = true;
      parent = parent.parentElement;
    }
    control.scrollIntoView({ block: 'center' });
    control.focus();
  }
  function collectSearch(): SearchEntry[] {
    const list: SearchEntry[] = [],
      docs = app.documentsForView(),
      command = (text: string, act: () => void, keys?: string) =>
        list.push({ group: 'Commands', label: text, run: act, keys });
    if (app.current()?.kind === 'composition') {
      const sources = app.workspaceId
        ? workspaceDocuments(app.workspaceId, docs)
        : [app.compositionDocument()].filter((doc): doc is EditorDocument => !!doc);
      for (const source of sources)
        for (const { node } of flatten(source.value as ChunkDocument)) {
          let kind = node.type;
          try {
            kind = app.config.registry.get(node.type).label;
          } catch {
            /* unknown types still list by id */
          }
          list.push({
            group: 'Objects',
            label: node.id,
            where: `${app.sceneName((source.value as ChunkDocument).scene)} · ${kind}`,
            run: () => {
              app.editorSelection.timeline = undefined;
              app.openInstance(source.id, node.id);
            },
          });
        }
    }
    command(app.config.api ? 'Save to source' : 'Download edits', () => void app.save(), 'Ctrl S');
    command('Undo', () => app.run(() => app.model.undo()), 'Ctrl Z');
    command('Redo', () => app.run(() => app.model.redo()), 'Ctrl Shift Z');
    if (app.current()?.kind === 'composition') {
      command('Add artwork', () => app.openPicker(), 'Shift A');
      command('Frame selection', app.frameSelection, 'F');
    }
    if (app.editorSelection.instance) {
      command('Duplicate selection', app.duplicateSelected, 'Ctrl D');
      command('Delete selection', app.deleteSelected, 'Delete');
      command('Deselect', () => app.select_(''), 'Esc');
    }
    app.groups
      .filter((g) => g.id !== 'library')
      .forEach((g, index) =>
        command(
          `Workspace · ${g.label}`,
          () => app.openWorkspace(g.id as Workspace),
          `Alt ${index + 1}`,
        ),
      );
    if (app.canPlay()) command('Play', app.playScene);
    command('Locate camera', app.locateCamera);
    command('Show or hide the outline dock', () =>
      setDockClosed('left', !app.root.hasAttribute('data-left-closed')),
    );
    command('Show or hide the inspector dock', () =>
      setDockClosed('right', !app.root.hasAttribute('data-right-closed')),
    );
    command('Maximise the panel under the pointer', toggleMaximized, 'Ctrl Space');
    command('Reset layout', resetLayout);
    for (const control of app.config.environmentControls ?? [])
      if (control.kind === 'boolean' && control.shortcut)
        command(
          `Preview · ${control.label}`,
          () => {
            app.environment[control.key] = !app.environment[control.key];
            app.refreshOptions();
            void app.draw();
          },
          control.shortcut.toUpperCase(),
        );
    for (const item of app.panels)
      list.push({
        group: 'Settings',
        label: item.label,
        where: `${app.groups.find((g) => g.id === item.group)?.label ?? ''} › ${item.label}`,
        run: () => app.openPanel(item.details),
      });
    for (const control of app.config.environmentControls ?? [])
      list.push({
        group: 'Settings',
        label: control.label,
        where: control.quick ? 'Scene › Preview bar' : 'Scene › Show menu',
        run: () => {
          if (control.quick)
            app.previewBar.querySelector<HTMLElement>(`[aria-label="${control.label}"]`)?.focus();
          else app.showMenu.menu.open = true;
        },
      });
    const node = app.selected();
    if (node) {
      let fields: [string, Field][] = [];
      try {
        fields = Object.entries(app.config.registry.get(node.type).fields);
      } catch {
        /* unknown type */
      }
      for (const [key, field] of fields)
        list.push({
          group: 'Settings',
          label: field.label,
          where: `Inspector › ${field.semantics?.group ?? 'Properties'} · ${node.id}`,
          run: () => focusField(key, field.label),
        });
    }
    for (const doc of app.documentsForView())
      if (doc.kind === 'composition' && !doc.id.startsWith('authored.'))
        list.push({
          group: 'Commands',
          label: `Open ${app.sceneName((doc.value as ChunkDocument).scene)}`,
          where: 'Chunk',
          run: () => app.openDocument(doc.id),
        });
    for (const row of compositionWorkspaces(app.documentsForView()))
      list.push({
        group: 'Commands',
        label: `Open ${row.name}`,
        where: 'Composition',
        run: () => app.openComposition(row.id),
      });
    if (app.current()?.kind === 'composition')
      for (const definition of app.config.registry.catalog())
        if (definition.libraryUse === 'reusable')
          list.push({
            group: 'Library',
            label: definition.label,
            where: definition.type,
            run: () => void app.addAtView(definition.type),
          });
    return list;
  }
  const notice = (text: string, error = false) => {
    if (error) {
      app.inspectorError = text;
      app.refreshRight();
      app.right.scrollTop = 0;
    }
    app.status.textContent = error ? 'Edit blocked · see inspector' : text;
    app.status.title = text;
    app.status.className = 'status' + (error ? ' error' : '');
  };
  const readFolds = (key: string) => {
    try {
      return new Map<string, boolean>(
        JSON.parse(localStorage.getItem('access-denied.editor.' + key) ?? '[]'),
      );
    } catch {
      return new Map<string, boolean>();
    }
  };
  const saveFolds = () => {
    try {
      localStorage.setItem(
        'access-denied.editor.source-folds',
        JSON.stringify([...app.outlineSourceOpen]),
      );
      localStorage.setItem('access-denied.editor.kind-folds', JSON.stringify([...app.roleOpen]));
    } catch {
      /* optional editor preferences */
    }
  };
  const closeMenu = (event: Event) => {
    for (const menu of app.root.querySelectorAll<HTMLDetailsElement>(
      'details.menu[open],details.ov-menu[open]',
    ))
      if (
        !menu.contains(event.target as Node) ||
        (event.target as HTMLElement).closest('.menu-items button')
      )
        menu.open = false;
    if (
      !app.pickList.hidden &&
      !app.pickList.contains(event.target as Node) &&
      performance.now() - app.pickListOpened > 250
    )
      app.pickList.hidden = true;
  };
  return {
    commandTargets,
    panelHandles,
    readDock,
    writeDock,
    renderErrors,
    reportError,
    onWindowError,
    onRejection,
    refreshDockToggles,
    setDockClosed,
    dockStrips,
    applyDocks,
    resetLayout,
    toggleMaximized,
    overlayMenu,
    focusField,
    collectSearch,
    notice,
    readFolds,
    saveFolds,
    closeMenu,
  };
}
