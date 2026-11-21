/** Creating, duplicating and deleting content, and the keyboard shortcuts. */
import { sourceSelection } from '../selection';
import { element, select } from '../controls';
import { animationShortcut } from '../animation-shortcuts';
import { perfMeasure } from '../../runtime/diagnostics/performance';
import { type ChunkDocument, type AssetInstance } from '../../art/core/composition';
import { layerRole } from '../layer-roles';
import { flatten, message, type Composer } from './context';

export function editingArea(
  app: Composer,
): Pick<
  Composer,
  | 'duplicateSelected'
  | 'openNewScene'
  | 'deletionProblem'
  | 'deleteSelected'
  | 'select_'
  | 'keyboard'
  | 'shortcuts'
> {
  function duplicateSelected() {
    const doc = app.compositionDocument();
    if (!doc || !app.editorSelection.instance) return;
    app.run(() => {
      app.editorSelection.instance = app.model.duplicate(doc.id, app.editorSelection.instance);
    });
  }
  /** Creation stays beside the world; nothing is inserted until the complete draft applies. */
  function openNewScene() {
    const setup = app.config.newScene;
    if (!setup) return;
    const api = app.authoringApi(),
      where = setup.places(api);
    app.openInspector({
      title: 'New chunk',
      action: 'Create chunk',
      build: (body, form) => {
        let name = 'New chunk',
          id = 'new-chunk',
          place = where.initial,
          preset = '',
          idEdited = false;
        const slug = (text: string) =>
          text
            .toLowerCase()
            .normalize('NFKD')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
        body.append(
          element(
            'p',
            '',
            'Create a chunk source with a default starting state, then arrange and edit it in the world.',
          ),
        );
        form.text(body, 'Name', name, (v) => {
          name = v;
          if (!idEdited) {
            id = slug(v);
            const input = body.querySelector<HTMLInputElement>('[aria-label="ID"]');
            if (input) input.value = id;
          }
        });
        form.text(body, 'ID', id, (v) => {
          id = v;
          idEdited = true;
        });
        form.select(body, 'Place', where.places, place, (v) => (place = v));
        if (setup.presets) {
          const picker = select(
            [{ value: '', label: 'Empty chunk' }, ...setup.presets],
            preset,
            (v) => (preset = v),
          );
          form.field(body, 'Preset', picker);
        }
        return () => {
          setup.create(api, id.trim(), name.trim(), place, preset || undefined);
          app.refresh();
          app.openScene(id.trim());
        };
      },
    });
  }
  /** Validation reasons for a refused deletion, in the terms of the editor. */
  function deletionProblem(problem: string, removed: AssetInstance[]) {
    const actors = removed
      .filter((node) => {
        try {
          const e = app.config.registry.get(node.type);
          return ['Human', 'Animal', 'Robot'].includes(layerRole(node.type, e.label, e.category));
        } catch {
          return false;
        }
      })
      .map((node) => node.id);
    if (/Actor source\/artwork count mismatch/.test(problem) && actors.length)
      return `${actors.join(', ')} ${actors.length === 1 ? 'is a character' : 'are characters'} of this scene. Remove ${actors.length === 1 ? 'it' : 'them'} in Logic › Interactions & story first, or attach ${actors.length === 1 ? 'it' : 'them'} to something else.`;
    const missing = /Missing (manifest|device) artwork: (\S+)/.exec(problem);
    if (missing)
      return `${missing[2]} is used by ${missing[1] === 'device' ? 'a device' : 'the scene’s manifest (an exit, device or spawn)'} in Logic. Remove that use there first, or attach ${missing[2]} to something else.`;
    return `${problem}. Remove or move that use first (in Logic, or the scene’s exits).`;
  }
  /** Deletes the selection. When attached artwork would go with it, the inspector lists it and asks first. */
  function deleteSelected() {
    const doc = app.compositionDocument(),
      id = app.editorSelection.instance;
    if (!doc || !id) return;
    let ids: string[];
    try {
      ids = app.model.removal(doc.id, id, true);
    } catch (error) {
      app.notice(message(error), true);
      return;
    }
    const remove = () =>
      app.run(() => {
        app.model.remove(doc.id, id, true);
        if (app.editorSelection.instance === id) app.editorSelection.instance = '';
      }, true);
    if (ids.length === 1) {
      remove();
      return;
    }
    // Attached pieces first (what the user may not expect to lose), then the piece's own parts.
    const nodes = flatten(doc.value as ChunkDocument).map((row) => row.node),
      own = new Set<string>(),
      collect = (node: AssetInstance) => {
        own.add(node.id);
        node.children?.forEach(collect);
      };
    collect(nodes.find((node) => node.id === id)!);
    const others = [
        ...ids.filter((other) => !own.has(other)),
        ...ids.filter((other) => own.has(other) && other !== id),
      ].map((other) => nodes.find((node) => node.id === other)!),
      problem = app.model.trial(() => app.model.remove(doc.id, id, true));
    app.openInspector({
      title: `Delete ${id}?`,
      action: 'Delete all',
      build: (body) => {
        body.append(
          element(
            'p',
            '',
            `This also deletes ${others.length} other items attached to or contained in it:`,
          ),
        );
        const list = element('ul');
        for (const node of others) {
          let label = node.type;
          try {
            label = app.config.registry.get(node.type).label;
          } catch {}
          list.append(element('li', '', `${node.id} · ${label}`));
        }
        body.append(list);
        if (problem)
          body.append(
            element(
              'p',
              'inspector-error',
              `It cannot be deleted yet: ${deletionProblem(problem, others)}`,
            ),
          );
        return () => {
          if (problem) throw Error(deletionProblem(problem, others));
          remove();
        };
      },
    });
  }
  const select_ = (id: string) =>
    perfMeasure('editor.selection', () =>
      app.withViewDocuments(() => {
        app.editorSelection.world = undefined;
        app.editorSelection.chunk = undefined;
        app.editorSelection.timeline = undefined;
        if (!id) app.revealed = '';
        const resolved = sourceSelection(
          app.painting.result,
          id,
          app.viewCompositionDocument()?.id ?? app.currentId,
        );
        app.editorSelection.document = resolved.document;
        app.editorSelection.instance = resolved.instance;
        if (app.painting.result?.sources?.[id])
          app.timelineView.collapsed.delete(app.editorSelection.instance);
        app.viewport.hoverId = '';
        app.refreshRight();
        app.updateOutlineSelection();
        if (app.currentTimeline()) {
          app.refreshLeft();
          app.refreshTimeline();
        }
        void app.draw();
      }),
    );
  const keyboard = (event: KeyboardEvent) => {
    // Also when focus fell back to the page after a panel re-rendered under the pointer.
    const focused = document.activeElement;
    if (
      !(event.ctrlKey || event.metaKey) ||
      !app.root.isConnected ||
      (focused && focused !== document.body && !app.root.contains(focused))
    )
      return;
    if (event.key === ' ' && app.root.dataset.tool === 'scene') {
      event.preventDefault();
      app.toggleMaximized();
      return;
    }
    const tag = (event.target as HTMLElement).tagName;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) && event.key.toLowerCase() !== 's') return;
    if (event.key.toLowerCase() === 's') {
      event.preventDefault();
      void app.save();
    } else if (event.key.toLowerCase() === 'z') {
      event.preventDefault();
      app.run(() => (event.shiftKey ? app.model.redo() : app.model.undo()));
    } else if (event.key.toLowerCase() === 'y') {
      event.preventDefault();
      app.run(() => app.model.redo());
    } else if (
      event.key.toLowerCase() === 'd' &&
      app.editorSelection.instance &&
      app.current()?.kind === 'composition' &&
      app.playHost.hidden
    ) {
      event.preventDefault();
      duplicateSelected();
    }
  };
  /** Single keys in the Scene view (Delete, H for hack vision…), unless the user is typing in a field or an inspector field is active. */
  const shortcuts = (event: KeyboardEvent) => {
    if (!app.root.isConnected) return;
    if (app.searchUi.open_) {
      if (event.key === 'Escape') {
        event.preventDefault();
        app.searchUi.close();
      }
      return;
    }
    if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      app.searchUi.open();
      return;
    }
    if (event.altKey && !event.ctrlKey && !event.metaKey && /^[1-5]$/.test(event.key)) {
      event.preventDefault();
      app.openWorkspace(
        (['layout', 'animate', 'logic', 'world', 'labs'] as const)[Number(event.key) - 1],
      );
      return;
    }
    if (event.key === 'Escape' && !app.pickList.hidden) {
      app.pickList.hidden = true;
      return;
    }
    if (
      app.group === 'layout' &&
      app.playHost.hidden &&
      app.root.isConnected &&
      app.current()?.kind === 'composition'
    ) {
      const action = animationShortcut(event);
      if (action && (action === 'toggle' || !('boundary' in action) || app.sequence())) {
        event.preventDefault();
        if (action === 'toggle') app.toggleAnimation();
        else
          app.seekTime(
            'boundary' in action
              ? action.boundary === 'start'
                ? 0
                : app.sequence()!.duration
              : 'frames' in action
                ? (Math.round(app.time * 60) + action.frames) / 60
                : app.time + action.seconds,
          );
        return;
      }
    }
    if (
      event.defaultPrevented ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.repeat ||
      app.group !== 'layout' ||
      !app.root.isConnected
    )
      return;
    const target = event.target as HTMLElement;
    if (
      target.closest(
        'input, textarea, select, dialog, [contenteditable=""], [contenteditable="true"]',
      )
    )
      return;
    if (
      (event.key === 'Delete' || event.key === 'Backspace') &&
      app.editorSelection.instance &&
      app.current()?.kind === 'composition' &&
      app.playHost.hidden
    ) {
      event.preventDefault();
      deleteSelected();
      return;
    }
    if (app.playHost.hidden && app.current()?.kind === 'composition') {
      if (event.key === 'f' || (event.key === 'F' && !event.shiftKey)) {
        event.preventDefault();
        app.frameSelection();
        return;
      }
      if (event.key === 'A' && event.shiftKey) {
        event.preventDefault();
        app.openPicker();
        return;
      }
      if (
        event.key === 'Escape' &&
        (app.editorSelection.instance ||
          app.editorSelection.world ||
          app.editorSelection.chunk ||
          app.editorSelection.timeline)
      ) {
        event.preventDefault();
        select_('');
        return;
      }
    }
    const control = (app.config.environmentControls ?? []).find(
      (c) => c.kind === 'boolean' && c.shortcut?.toLowerCase() === event.key.toLowerCase(),
    );
    if (!control) return;
    event.preventDefault();
    app.environment[control.key] = !app.environment[control.key];
    app.refreshOptions();
    void app.draw();
  };
  return {
    duplicateSelected,
    openNewScene,
    deletionProblem,
    deleteSelected,
    select_,
    keyboard,
    shortcuts,
  };
}
