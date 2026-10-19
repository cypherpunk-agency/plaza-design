import type {CityModel} from '../world/city';
/** Local read-only world navigation. Selection opens source compositions without entering the game. */
import { createWorldMapPreview, type WorldPlaceInspection, type WorldMapPreviewState } from './world-map';
import type { WorldDocument } from '../world/document';
import type { SceneId } from '../scenes';

export interface WorldPanelSession { place?: WorldPlaceInspection['place']['id']; preview?: Partial<WorldMapPreviewState> }
export function mountWorldPanel(host: HTMLElement, document: WorldDocument, openScene: (id: string) => void, session: WorldPanelSession = {}, scene?: string,world?:CityModel): () => void {
  // The editor's current scene decides which place is inspected; the picker remains for browsing.
  const home = scene ? document.map.places.find(p => (p.scenes as readonly string[]).includes(scene)) : undefined; if (home) session.place = home.id;
  const node = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string) => {
    const result = window.document.createElement(tag); if (text !== undefined) result.textContent = text; return result;
  };
  const canvas = node('canvas'); canvas.width = 640; canvas.height = 360; canvas.style.width = '100%'; canvas.style.height = 'auto'; canvas.tabIndex = 0; canvas.setAttribute('aria-label', 'Read-only city map');
  const details = node('div'), controls = node('div');
  const inspect = (selection: WorldPlaceInspection) => {
    session.place = selection.place.id;
    details.replaceChildren(node('strong', selection.place.name), node('p', selection.district?.name ?? 'Transit'));
    if (selection.blocked) details.append(node('p', `Travel rule: ${selection.blocked}`));
    for (const scene of selection.scenes) {
      const button = node('button', `Open ${scene.id}`); button.type = 'button'; button.onclick = () => preview.openScene(scene.id); details.append(button);
    }
    const transport = node('pre', JSON.stringify(selection.transport, null, 2)); transport.style.whiteSpace = 'pre-wrap';
    const metadata = node('details'); metadata.append(node('summary', 'Transport connections'), transport); details.append(metadata);
  };
  const preview = createWorldMapPreview({world, canvas, document, preview: session.preview, onSelection: inspect, onOpenScene: scene => openScene(scene),
    drawBackground(context, width, height) { context.fillStyle = '#030201'; context.fillRect(0, 0, width, height); },
  });
  const label = (text: string, input: HTMLElement) => { const wrap = node('label', text + ' '); wrap.append(input); controls.append(wrap); };
  const place = node('select'); place.setAttribute('aria-label', 'Inspect place');
  for (const entry of document.map.places) { const option = node('option', entry.name); option.value = entry.id; place.append(option); }
  if (session.place) place.value = session.place;
  place.onchange = () => { preview.selectPlace(place.value as WorldDocument['map']['places'][number]['id']); preview.draw(); }; label('Place', place);
  const layer = node('select'); layer.setAttribute('aria-label', 'Map layer');
  for (const id of ['street', 'metro', 'above', 'below'] as const) { const option = node('option', id); option.value = id; layer.append(option); }
  layer.value = preview.getPreview().layer;
  layer.onchange = () => preview.setPreview({ layer: layer.value as ReturnType<typeof preview.getPreview>['layer'] }); label('Layer', layer);
  const discovered = node('input'); discovered.type = 'checkbox'; discovered.checked = preview.getPreview().seenSceneIds === 'all';
  discovered.onchange = () => preview.setPreview({ seenSceneIds: discovered.checked ? 'all' : ['downtown' as SceneId] }); label('All places discovered in preview', discovered);
  for (const [key, title] of [['gateOpen', 'Preview market gate open'], ['harborOpen', 'Preview harbor open'], ['reduced', 'Map reduced motion'], ['flat', 'Flat map']] as const) {
    const input = node('input'); input.type = 'checkbox'; input.checked = preview.getPreview()[key]; input.onchange = () => preview.setPreview({ [key]: input.checked }); label(title, input);
  }
  const time = node('input'); time.type = 'number'; time.min = '0'; time.step = '1'; time.value = String(preview.getPreview().time); time.style.width = '65px';
  time.onchange = () => { const value = Number(time.value); if (Number.isFinite(value) && value >= 0) preview.setPreview({ time: value }); }; label('Map frame', time);
  const status = node('p', 'Geography, transport and access rules are read-only. Opening a place switches the editor to its scene.');
  host.replaceChildren(status, controls, canvas, details);
  const coordinates = (event: PointerEvent) => { const rect = canvas.getBoundingClientRect(); return { x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height }; };
  canvas.onpointermove = event => { const p = coordinates(event); canvas.style.cursor = preview.pointer(p.x, p.y, false) ? 'pointer' : 'default'; };
  canvas.onpointerdown = event => { if (event.button !== 0) return; canvas.focus(); const p = coordinates(event); preview.pointer(p.x, p.y, true); };
  canvas.onkeydown = event => { if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', 'Escape', 'Tab'].includes(event.key) && event.key !== 'Tab') { event.preventDefault(); preview.key(event.key); } };
  preview.selectPlace(session.place ?? document.map.places[0].id);
  let active = true, frame = 0;
  const draw = () => { if (!active) return; preview.draw(); frame = requestAnimationFrame(draw); }; draw();
  return () => { session.preview = preview.getPreview(); active = false; cancelAnimationFrame(frame); canvas.onpointermove = canvas.onpointerdown = canvas.onkeydown = null; };
}
