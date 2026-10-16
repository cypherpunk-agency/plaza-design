/** Browser entry for the development-only local composer. */
import { art, type Composition } from '../art';
import { mountComposer } from './app';
import { createNativePreview } from './native-preview';
import { nativeSceneAdapters } from './scene-adapters';
import { createSequencePreview } from './sequence-preview';
import { WEATHER_KINDS } from '../world/weather';
import { SCENES } from '../scenes';
import { snapshotWorld, validateWorldDocument } from '../world/document';
import type { TimelineDocument } from '../art/core/timeline';
import { mountWorldPanel, type WorldPanelSession } from './world-panel';
import { createAssetPreview } from './asset-preview';
import { mountCharacterWorkbench } from './character-workbench';
import { mountVehicleWorkbench } from './vehicle-workbench';
import { validateSandboxBehavior } from './behavior-validation';
import { mountEventInspector } from './event-inspector';
import { mountSourceViewer } from './source-viewer';
import { mountBehaviorWorkbench } from './behavior-authoring';
import type { SceneData } from '../data';
import { mountSignageWorkbench } from './signage-workbench';

async function start() {
  const host = document.getElementById('composer'); if (!host) throw new Error('Missing editor host');
  const response = await fetch('/bootstrap', { credentials: 'omit' }); if (!response.ok) throw new Error('Local editor session is unavailable');
  const bootstrap = await response.json() as { api: { url: string; token: string } };
  await Promise.all([400, 500, 600, 700].map(weight => document.fonts.load(`${weight} 16px "IBM Plex Mono"`)));
  await document.fonts.ready;
  const native = createNativePreview(nativeSceneAdapters), sequences = createSequencePreview(art);
  const mapSession: WorldPanelSession = {};
  mountComposer(host, { registry: art, api: bootstrap.api, viewport: { width: 960, height: 540 },
    assetPreview: createAssetPreview(art, native),
    validateDocument(document) { if (document.kind === 'behavior') { if (document.id !== 'sandbox-behavior') throw new Error('Unsupported behavior document'); validateSandboxBehavior(document.value); } },
    workbenches: [
      { id: 'characters', title: 'Character workbench · read-only', mount(panel) { panel.classList.add('character-workbench'); return mountCharacterWorkbench(panel); } },
      { id: 'vehicles', title: 'Vehicle workbench · read-only', mount(panel) { panel.classList.add('vehicle-workbench'); return mountVehicleWorkbench(panel); } },
      { id: 'signage', title: 'Signs, lighting and architecture · read-only', documentDependent: true, mount(panel, context) {
        panel.classList.add('signage-workbench');
        return mountSignageWorkbench(panel, { registry: art, documents: context.documents,
          openUsage: usage => context.openInstance(usage.document, usage.instance), renderNative: native.render, renderSequence: sequences.render,
        });
      } },
      { id: 'events', title: 'Scene events and connections · read-only', documentDependent: true, mount(panel, context) {
        const graph = document.createElement('section'), source = document.createElement('section'); panel.replaceChildren(graph, source);
        const viewer = mountSourceViewer(source), dispose = mountEventInspector(graph, { documents: context.documents,
          onOpenScene(scene, instance) { const doc = context.documents.find(doc => doc.kind === 'composition' && (doc.value as Composition).scene === scene); if (doc && instance) context.openInstance(doc.id, instance); else context.openScene(scene); },
          onOpenSource: reference => { void viewer.open(reference); },
        }); return () => { dispose(); viewer.dispose(); panel.replaceChildren(); };
      } },
      { id: 'behavior', title: 'Sandbox behavior authoring · scoped source edits', authoring: true, documentDependent: true, documentIds: ['sandbox-behavior'], mount(panel, context) {
        const api = context.authoring!;
        return mountBehaviorWorkbench(panel, { document: () => api.get('sandbox-behavior').value as SceneData,
          onEdit: (value, label) => api.edit('sandbox-behavior', label, value), undo: api.undo, redo: api.redo, save: api.save, reload: api.reload,
          dirty: () => api.dirty('sandbox-behavior'), revision: () => api.get('sandbox-behavior').revision,
        });
      } },
    ],
    preview: { render: (canvas, request) => sequences.render(canvas, request) ?? native.render(canvas, request) },
    worldPanel(panel, openScene, documents) {
      const compositions = Object.fromEntries(documents.filter(doc => doc.kind === 'composition').map(doc => [doc.id, doc.value as Composition]));
      const timelines = documents.filter(doc => doc.kind === 'timeline').flatMap(doc => (doc.value as TimelineDocument).sequences);
      const refs = Object.fromEntries(Object.entries(compositions).filter(([, doc]) => Object.prototype.hasOwnProperty.call(SCENES, doc.scene)).map(([id, doc]) => [doc.scene, id]));
      const world = snapshotWorld(refs, timelines.flatMap(sequence => sequence.handoff ? [{ id: sequence.id, ...sequence.handoff }] : []));
      return mountWorldPanel(panel, validateWorldDocument(world, { compositions, sequences: timelines }), openScene, mapSession);
    },
    motionTracks: sequences.motionTracks,clips:sequences.clips, timelineContext: sequences.timelineContext,
    destinations: Object.fromEntries(Object.entries(SCENES).map(([scene, def]) => [scene, def.exits.map(exit => exit.id)])),
    initialEnvironment: { cameraX: 0, zoom: 1, day: 1, minute: 580, seed: 3, flags: '{}', state: '{}', weather: 'forecast', hover: '', titleOffset: 7, sequence: 'glide' },
    environmentControls: [
      { key: 'cameraX', label: 'Camera X', kind: 'number', step: 20 }, { key: 'cameraH', label: 'Camera height', kind: 'number', step: 10 },
      { key: 'zoom', label: 'Zoom', kind: 'number', min: .1, max: 8, step: .1 },
      { key: 'day', label: 'City day', kind: 'number', min: 1, step: 1 }, { key: 'minute', label: 'City minute', kind: 'number', min: 0, max: 1439, step: 10 },
      { key: 'seed', label: 'Weather seed', kind: 'number', min: 0, step: 1 }, { key: 'weather', label: 'Weather', kind: 'select', options: ['forecast', ...WEATHER_KINDS] },
      { key: 'hack', label: 'Hack vision', kind: 'boolean' }, { key: 'hover', label: 'Hovered device id', kind: 'text' },
      { key: 'flags', label: 'Story flags (JSON)', kind: 'text' }, { key: 'state', label: 'Device state (JSON)', kind: 'text' },
      { key: 'presentation', label: 'Presentation controller (JSON, optional)', kind: 'text' },
      { key: 'sequence', label: 'Opening sequence', kind: 'select', options: ['title', 'rise', 'glide'] },
      { key: 'titleOffset', label: 'Title clock offset', kind: 'number', min: 0, step: 1 },
    ],
  });
}
void start().catch(error => { const host = document.getElementById('composer'); if (host) { const message = document.createElement('p'); message.id = 'boot-error'; message.textContent = `Composer could not start: ${error instanceof Error ? error.message : String(error)}`; host.replaceChildren(message); } });
