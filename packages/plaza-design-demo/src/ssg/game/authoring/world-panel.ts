import type {CityModel} from '../world/city';
/** City geography and travel editing around the existing native map preview. */
import { createWorldMapPreview, type WorldPlaceInspection, type WorldMapPreviewState } from './world-map';
import type { WorldDocument } from '../world/document';
import type { SceneId } from '../scenes';
import { createFrame } from './frame';
import {mountCityAuthoring,type CityAuthoringSession} from './city-authoring';
import {mountDistrictAuthoring} from './district-authoring';
import type {WorkbenchContext,WorkbenchHandle} from './contracts';

const MODES=['Place','Districts','Travel','Map layout & discovery']as const;
export interface WorldPanelSession { scene?:string;mode?:typeof MODES[number];editing?:CityAuthoringSession;place?: WorldPlaceInspection['place']['id']; preview?: Partial<WorldMapPreviewState> }
export function mountWorldPanel(host: HTMLElement, document: WorldDocument, openScene: (id: string) => void,context:WorkbenchContext, session: WorldPanelSession = {}, scene?: string,world?:CityModel): () => void {
  if(!context.authoring)throw Error('City map requires the editor source API');
  // The editor's current scene decides which place is inspected; the picker remains for browsing.
  const home = scene ? document.map.places.find(p => (p.scenes as readonly string[]).includes(scene)) : undefined; if (home&&session.scene!==scene) session.place = home.id;session.scene=scene;
  if(!document.map.places.some(p=>p.id===session.place))session.place=home?.id??document.map.places[0]?.id;
  const node = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string) => {
    const result = window.document.createElement(tag); if (text !== undefined) result.textContent = text; return result;
  };
  const canvas = node('canvas'); canvas.width = 640; canvas.height = 360; canvas.tabIndex = 0; canvas.setAttribute('aria-label', 'City map');
  const details = node('div'), controls = node('div'),authoring=node('section'),mode=node('select'),place=node('select');let editor:WorkbenchHandle|undefined;
  session.editing??={expanded:new Map()};session.mode??='Place';
  function editSelection(){editor?.();editor=undefined;authoring.replaceChildren();
    editor=session.mode==='Districts'?mountDistrictAuthoring(authoring,context,session.editing!.expanded):mountCityAuthoring(authoring,context,{section:session.mode==='Place'?'place':session.mode==='Travel'?'travel':'map',place:session.place,session:session.editing});
  }
  mode.setAttribute('aria-label','Map editing section');for(const title of MODES){const option=node('option',title);option.value=title;mode.append(option);}mode.value=session.mode;
  mode.onchange=()=>{session.mode=mode.value as typeof session.mode;editSelection();};
  const inspect = (selection: WorldPlaceInspection) => {
    session.place = selection.place.id;
    place.value=selection.place.id;
    details.replaceChildren(node('strong', selection.place.name), node('p', selection.district?.name ?? 'Transit'));
    if (selection.blocked) details.append(node('p', `Travel rule: ${selection.blocked}`));
    for (const scene of selection.scenes) {
      const button = node('button', `Open ${scene.id}`); button.type = 'button'; button.onclick = () => preview.openScene(scene.id); details.append(button);
    }
    const transport=node('ul');for(const station of selection.transport.stations)transport.append(node('li',`${station.name} · platform ${station.scene} · surface ${station.up}`));for(const taxi of selection.transport.taxi)transport.append(node('li',`Taxi ${taxi.id} · ${taxi.scene}`));
    const metadata = node('details'); metadata.append(node('summary', 'Transport connections'), transport); details.append(metadata);editSelection();
  };
  const preview = createWorldMapPreview({world, canvas, document, preview: session.preview, onSelection: inspect, onOpenScene: scene => openScene(scene),
    drawBackground(context, width, height) { context.fillStyle = '#030201'; context.fillRect(0, 0, width, height); },
  });
  const label = (text: string, input: HTMLElement) => { const wrap = node('label', text + ' '); wrap.append(input); controls.append(wrap); };
  place.setAttribute('aria-label', 'Inspect place');
  for (const entry of document.map.places) { const option = node('option', entry.name); option.value = entry.id; place.append(option); }
  if (session.place) place.value = session.place;
  place.onchange = () => { preview.selectPlace(place.value as WorldDocument['map']['places'][number]['id']); preview.draw(); };const placeLabel=node('label','Place ');placeLabel.append(place);
  const layer = node('select'); layer.setAttribute('aria-label', 'Map layer');
  for (const id of ['street', 'metro', 'above', 'below'] as const) { const option = node('option', id); option.value = id; layer.append(option); }
  layer.value = preview.getPreview().layer;
  layer.onchange = () => preview.setPreview({ layer: layer.value as ReturnType<typeof preview.getPreview>['layer'] }); label('Layer', layer);
  const discovered = node('input'); discovered.type = 'checkbox'; discovered.checked = preview.getPreview().seenSceneIds === 'all';
  discovered.onchange = () => preview.setPreview({ seenSceneIds: discovered.checked ? 'all' : ['downtown' as SceneId] }); label('All places discovered in preview', discovered);
  for (const [key, title] of [['harborOpen', 'Preview harbor open'], ['reduced', 'Map reduced motion'], ['flat', 'Flat map']] as const) {
    const input = node('input'); input.type = 'checkbox'; input.checked = preview.getPreview()[key]; input.onchange = () => preview.setPreview({ [key]: input.checked }); label(title, input);
  }
  // Preview conditions use the same exit flags/keys, never a separate gate-open override.
  for(const flag of new Set(document.scenes.flatMap(s=>s.exits.flatMap(e=>e.requires?[e.requires]:[])))){
    const input=node('input');input.type='checkbox';input.checked=!!preview.getPreview().flags[flag];input.onchange=()=>preview.setPreview({flags:{...preview.getPreview().flags,[flag]:input.checked}});label('Preview flag '+flag,input);
  }
  for(const key of new Set(document.scenes.flatMap(s=>s.exits.flatMap(e=>e.needs?[e.needs.key]:[])))){
    const input=node('input');input.type='checkbox';input.checked=preview.getPreview().keyring.includes(key);input.onchange=()=>{const keys=preview.getPreview().keyring;preview.setPreview({keyring:input.checked?[...keys,key]:keys.filter(k=>k!==key)});};label('Preview key '+key,input);
  }
  const time = node('input'); time.type = 'number'; time.min = '0'; time.step = '1'; time.value = String(preview.getPreview().time); time.style.width = '65px';
  time.onchange = () => { const value = Number(time.value); if (Number.isFinite(value) && value >= 0) preview.setPreview({ time: value }); }; label('Map frame', time);
  const status = node('p', 'Select a place on the map, then edit it here. Districts, travel routes and map layout use the same pending sources and Undo/Save as the world editor. Preview discovery and access controls below do not change the game.');
  const previewSettings=node('details');previewSettings.append(node('summary','Preview conditions'),controls);
  const layout = createFrame(host, { stage: [canvas], inspector: [status,mode,placeLabel,details,authoring,previewSettings] }, 'City map');
  /** The map fills the stage at 16:9 and is backed at the device pixel ratio, so it stays sharp at any size. */
  const fit = () => {
    const box = layout.stage, style = getComputedStyle(box), room = (side: 'Left' | 'Right' | 'Top' | 'Bottom') => parseFloat(style[`padding${side}`]) || 0;
    const width = Math.max(320, box.clientWidth - room('Left') - room('Right')), height = Math.max(180, Math.min(width * 9 / 16, box.clientHeight - room('Top') - room('Bottom') - 4));
    const w = Math.round(Math.min(width, height * 16 / 9)), h = Math.round(w * 9 / 16), ratio = window.devicePixelRatio || 1;
    canvas.style.width = `${w}px`; canvas.style.height = `${h}px`; canvas.width = Math.round(w * ratio); canvas.height = Math.round(h * ratio); preview.setViewport(w, h, ratio);
  };
  const resize = new ResizeObserver(fit); resize.observe(layout.stage);
  const coordinates = (event: PointerEvent) => { const rect = canvas.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top }; };
  canvas.onpointermove = event => { const p = coordinates(event); canvas.style.cursor = preview.pointer(p.x, p.y, false) ? 'pointer' : 'default'; };
  canvas.onpointerdown = event => { if (event.button !== 0) return; canvas.focus(); const p = coordinates(event); preview.pointer(p.x, p.y, true); };
  canvas.onkeydown = event => { if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', 'Escape', 'Tab'].includes(event.key) && event.key !== 'Tab') { event.preventDefault(); preview.key(event.key); } };
  preview.selectPlace(session.place ?? document.map.places[0].id);
  let active = true, frame = 0;
  const draw = () => { if (!active) return; preview.draw(); frame = requestAnimationFrame(draw); }; draw();
  return () => { editor?.();editor=undefined;mode.onchange=null;resize.disconnect(); session.preview = preview.getPreview(); active = false; cancelAnimationFrame(frame); canvas.onpointermove = canvas.onpointerdown = canvas.onkeydown = null; };
}
