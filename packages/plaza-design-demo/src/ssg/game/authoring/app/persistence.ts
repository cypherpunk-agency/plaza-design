/** Loading and saving sources through the authoring server, reloads and edit commands. */
import { element } from '../controls';
import { perfMeasure } from '../../runtime/diagnostics/performance';
import { createDocumentBundle } from '../document-bundle';
import type { EditorDocument, WorkbenchContext } from '../contracts';
import { copy, message, type Composer } from './context';

export function persistenceArea(
  app: Composer,
): Pick<Composer, 'requestReload' | 'authoringApi' | 'run' | 'api' | 'load' | 'save' | 'unload'> {
  async function requestReload() {
    if (!app.model.dirty()) {
      await load();
      return;
    }
    app.openInspector({
      title: 'Reload source',
      action: 'Discard edits and reload',
      build: (body) => {
        body.append(
          element(
            'p',
            '',
            'Reloading discards unsaved edits and their Undo history. Download edits first if you want to keep them.',
          ),
        );
        return async () => {
          await load();
        };
      },
    });
  }
  function authoringApi(): NonNullable<WorkbenchContext['authoring']> {
    return {
      snapshot: () => app.model.inspectDocuments(),
      get: (id: string) => app.model.get(id),
      edit: (id: string, label: string, value: unknown) =>
        run(() => app.model.edit(id, label, () => value), true),
      editDocuments: (changes: { id: string; value: unknown }[], label: string) =>
        run(() => app.model.importDocuments(changes, label), true),
      undo: () => run(() => app.model.undo()),
      redo: () => run(() => app.model.redo()),
      save,
      reload: requestReload,
      dirty: (id: string) => app.model.dirty(id),
    };
  }
  const run = (action: () => void, propagate = false, scope: 'all' | 'artwork' = 'all') =>
    perfMeasure('editor.command', () => {
      try {
        app.notice('');
        perfMeasure('editor.action', action);
        app.inspectorError = '';
        app.placementIssue = undefined;
        if (!app.numericScrubbing) {
          app.thumbnailDocuments = undefined;
          app.thumbnails?.invalidate();
        }
        if (scope === 'artwork' && !app.numericScrubbing) {
          app.withViewDocuments(() => {
            app.refreshHeaderActions();
            perfMeasure('editor.inspector', app.refreshRight);
            perfMeasure('editor.timeline', app.refreshTimeline);
            void app.draw();
          });
        } else app.refresh();
        if (!app.picker.hidden && !app.numericScrubbing) app.renderPicker();
      } catch (e) {
        app.notice(message(e), true);
        if (propagate) throw e;
      }
    });
  async function api(path: string, body?: unknown) {
    if (!app.config.api)
      throw new Error(
        'This browser editor has no repository write service. Download edits instead.',
      );
    const response = await fetch(app.config.api.url + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        'x-authoring-token': app.config.api.token,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'omit',
    });
    const value = await response.json();
    if (!response.ok)
      throw new Error(
        response.status === 409
          ? `Source changed outside the editor. Pending edits are kept. Export them or reload. ${value.error ?? ''}`
          : (value.error ?? `Authoring service returned ${response.status}`),
      );
    return value;
  }
  async function load() {
    app.playing = false;
    try {
      const documents = app.config.api
        ? ((await api('/documents')) as EditorDocument[])
        : copy(app.config.documents ?? []);
      app.model.load(documents);
      app.thumbnailDocuments = undefined;
      app.thumbnails?.invalidate();
      if (!documents.some((d) => d.id === app.currentId))
        app.currentId =
          documents.find((d) => d.kind === 'composition')?.id ?? documents[0]?.id ?? '';
      app.editorSelection.instance = '';
      app.editorSelection.document = '';
      app.syncSequence();
      app.refresh();
      app.openLinkedScene();
      app.openLinkedPanel();
      app.viewReady = true;
      app.rememberView();
      app.notice(
        documents.length
          ? app.config.api
            ? 'Source documents loaded. Edits stay local until Save.'
            : ''
          : 'No authoring documents are available.',
      );
    } catch (e) {
      app.notice(`Could not load authoring documents: ${message(e)}`, true);
    }
  }
  async function save() {
    if (app.saving) return;
    const edits = app.model.edits();
    if (!edits.length) return;
    if (!app.config.api) {
      try {
        const blob = new Blob(
          [JSON.stringify(createDocumentBundle(edits, app.documentsForView()))],
          {
            type: 'application/json',
          },
        );
        if (blob.size > 2 * 1024 * 1024)
          throw new Error('Edit bundle exceeds 2 MiB. Export individual documents instead.');
        const url = URL.createObjectURL(blob),
          link = element('a');
        link.href = url;
        link.download = 'access-denied-editor-edits.json';
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        app.notice(
          'Edits downloaded. Import edits to continue later, or import them into the local composer to save to repository source.',
        );
      } catch (error) {
        app.notice(`Download failed: ${message(error)}`, true);
      }
      return;
    }
    app.saving = true;
    app.refreshHeader();
    app.notice('Validating and saving source documents…');
    try {
      const result = (await api('/save', { edits })) as { documents: EditorDocument[] };
      app.model.confirmSaved(result.documents);
      app.notice('Saved to source. Undo remains available.');
    } catch (e) {
      app.notice(message(e), true);
    } finally {
      app.saving = false;
      app.refresh();
    }
  }
  const unload = (event: BeforeUnloadEvent) => {
    app.rememberView();
    if (app.model.dirty()) {
      event.preventDefault();
      event.returnValue = '';
    }
  };
  return { requestReload, authoringApi, run, api, load, save, unload };
}
