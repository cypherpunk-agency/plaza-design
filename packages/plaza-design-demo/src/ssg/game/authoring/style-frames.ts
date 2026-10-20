/**
 * Library › Style frames: one frame per district (art direction, 2026-10-20). Each frame pairs the
 * district's card (palette, light, materials, signage, people, landmark, crowd mix) with its real
 * scenes as thumbnails. Scenes open on the Scene stage (comparing with a proposal when there is one).
 * Read-only.
 */
import type { EditorDocument, PreviewRequest, PreviewResult, WorkbenchContext } from './app';
import type { Composition } from '../art/core/composition';
import { crowdMix } from '../art/characters/crowds';
import { PROPOSAL_SCENES } from './proposal-scenes';

export interface StyleFrame {
  district: string; motto: string;
  /** Proposed palette: structure, wall, window, then neon colours. */
  palette: string[];
  card: [string, string][];
  /** Starting view for the frame. */
  scene?: string; cameraX?: number; minute: number; weather: string;
}
export const STYLE_FRAMES: StyleFrame[] = [
  { district: 'downtown', motto: 'Sodium, rain and the Ring overhead.', palette: ['#ff8800', '#1c120c', '#ffb35a', '#ff8800', '#ffd9a5', '#ff2a44', '#a882ff'], scene: 'downtown', minute: 1320, weather: 'rain',
    card: [['Light', 'Sodium streetlights and shop neon; windows warm'], ['Materials', 'Brick and concrete retrofitted with conduit, AC units, screens'], ['Signage', 'Registry notices, small shop neon, a few rooftop ads'], ['Landmark', 'The Ring highway passing over the street']] },
  { district: 'market', motto: 'Every surface sells something.', palette: ['#e8553a', '#1a0d0b', '#e98a4a', '#ff3a3a', '#ffb02e', '#ffd9a5', '#c27bff'], scene: 'market', minute: 1260, weather: 'smog',
    card: [['Light', 'Mixed hot neon, string bulbs, steam lit from below'], ['Materials', 'Tarps, corrugated sheet, tenement balconies, laundry'], ['Signage', 'Hand-painted price boards, cheap LED, cash-only'], ['Landmark', 'The tenement wall going up past the view']] },
  { district: 'galleria', motto: 'Climate controlled. Always 21 °C.', palette: ['#e8d8a8', '#2a2822', '#fff3d6', '#fff3d6', '#e8c46a', '#ffffff', '#ffd9a5'], scene: 'mall', minute: 960, weather: 'clear',
    card: [['Light', 'High-key warm white LED, gold accents; no night under the roof'], ['Materials', 'Glass, polished stone, brushed metal'], ['Signage', 'Branded, consistent, animated; Plaza gold'], ['Landmark', 'The dome; the ID-gate plaza at the entrance']] },
  { district: 'harbor', motto: 'Salt, diesel and a timetable nobody believes.', palette: ['#d8a03a', '#1a1a1a', '#ffc882', '#ffc882', '#ff2a44', '#ffd9a5', '#7fb0d0'], scene: 'harbor', minute: 330, weather: 'fog',
    card: [['Light', 'High-mast sodium in fog, signal lamps, crane beacons'], ['Materials', 'Steel, rust, container paint, wet concrete'], ['Signage', 'Customs notices, container codes, stencils'], ['Landmark', 'Cranes, and the Spire across the bay']] },
  { district: 'oldq', motto: 'Lanterns on the canal.', palette: ['#c8956a', '#1e1712', '#ffcf8a', '#ffcf8a', '#ff9a4a', '#ffd9a5', '#ff2a44'], minute: 1200, weather: 'fog',
    card: [['Light', 'Paper lanterns, candles, a few old bulbs; reflections in the canal'], ['Materials', 'Timber, stone, tile roofs, houseboats'], ['Signage', 'Hand-painted, the least tech in the city'], ['Landmark', 'St. Agnes, the last church that takes cash']] },
  { district: 'undercity', motto: 'Below the record.', palette: ['#3a8a80', '#081010', '#6fd6c4', '#6fd6c4', '#e8e0b0', '#ff2a44', '#9ad0ff'], minute: 0, weather: 'clear',
    card: [['Light', 'Sparse battery LEDs, emergency lights, rewired screens'], ['Materials', 'Flooded concrete, pipes, condensation, tarps'], ['Signage', 'Chalk and spray marks, the Ghosts’ sign language'], ['Landmark', 'The flooded server basement']] },
  { district: 'spire', motto: 'Above the weather.', palette: ['#1a1d22', '#0e1014', '#d8b45a', '#ffffff', '#d8b45a', '#cfe6f0', '#ff2a44'], minute: 720, weather: 'clear',
    card: [['Light', 'Clear daylight, cold white; gold seams in black glass'], ['Materials', 'Black glass, gold, stone; nothing worn'], ['Signage', 'Almost none; you are expected to know'], ['Landmark', 'The Registry antenna’s red light']] },
  { district: 'fringe', motto: 'Automated. No residents.', palette: ['#8a8a94', '#16151a', '#ffa040', '#ffa040', '#b07aff', '#ffd9a5', '#ff2a44'], minute: 840, weather: 'heat',
    card: [['Light', 'Industrial floods, grow lights, heat shimmer'], ['Materials', 'Sheet metal, dust, solar fields, dead factories'], ['Signage', 'Machine-readable codes, warnings for nobody'], ['Landmark', 'The data cemetery']] },
  { district: 'skyport', motto: 'Fenced launches.', palette: ['#aabed2', '#12161c', '#e8f0ff', '#e8f0ff', '#ffd23a', '#ff2a44', '#aabed2'], minute: 1380, weather: 'clear',
    card: [['Light', 'Floodlights, runway lines, launch glow on the clouds'], ['Materials', 'Fences, concrete aprons, hazard stripes'], ['Signage', 'Warnings and restricted-zone notices'], ['Landmark', 'A launch plume over the fence']] },
];

interface CitySource { DISTRICTS: { id: string; name: string }[]; PLACES: { district: string; scenes: string[] }[] }
export interface StyleFrameSession { district?: string; views?: Record<string, { scene?: string; cameraX: number; minute: number; weather: string }> }

export function mountStyleFrames(host: HTMLElement, context: WorkbenchContext, render: (canvas: HTMLCanvasElement, request: PreviewRequest) => PreviewResult, environment: Record<string, string | number | boolean>, session: StyleFrameSession, sceneName: (scene: string) => string) {
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (className) n.className = className; return n; };
  const button = (text: string, action: () => void, className?: string) => { const b = el('button', text, className); b.type = 'button'; b.onclick = action; return b; };
  const docs = new Map<string, EditorDocument>(context.documents.map(d => [d.id, d]));
  const city = docs.get('city-source')?.value as CitySource | undefined;
  const scenesOf = (district: string) => (city?.PLACES ?? []).filter(p => p.district === district).flatMap(p => p.scenes).filter(id => docs.get(id)?.kind === 'composition');
  // Proposal scenes live outside the city's place list, so they are added per district here.
  const proposalsOf = (district: string) => PROPOSAL_SCENES.filter(p => p.district === district && docs.get(p.id)?.kind === 'composition').map(p => p.id);
  const allOf = (district: string) => [...scenesOf(district), ...proposalsOf(district)];
  const nameOf = (district: string) => city?.DISTRICTS.find(d => d.id === district)?.name ?? district;
  session.views ??= {};
  const bar = el('nav', undefined, 'district-bar'), main = el('section', undefined, 'style-frame');
  bar.setAttribute('aria-label', 'Districts');
  host.classList.add('style-frames'); host.replaceChildren(bar, main);
  let disposed = false;

  function view(frame: StyleFrame) {
    const scenes = scenesOf(frame.district);
    return session.views![frame.district] ??= { scene: frame.scene && scenes.includes(frame.scene) ? frame.scene : scenes[0], cameraX: frame.cameraX ?? 0, minute: frame.minute, weather: frame.weather };
  }
  function draw(canvas: HTMLCanvasElement, status: HTMLElement, scene: string, v: { cameraX: number; minute: number; weather: string }) {
    const composition = docs.get(scene)?.value as Composition | undefined; if (!composition) return;
    try { render(canvas, { documents: new Map(context.documents.map(d => [d.id, d.value])), composition: structuredClone(composition), time: 0, reduced: true, overlays: false,
      environment: { ...environment, cameraX: v.cameraX, minute: v.minute, weather: v.weather, renderScale: canvas.width / 640 } }); status.textContent = ''; }
    catch (error) { status.textContent = `Preview unavailable: ${error instanceof Error ? error.message : String(error)}`; }
  }
  function refresh() {
    if (disposed) return;
    const current = STYLE_FRAMES.find(f => f.district === session.district) ?? STYLE_FRAMES[0]; session.district = current.district;
    bar.replaceChildren(...STYLE_FRAMES.map(f => { const b = button('', () => { session.district = f.district; refresh(); }, 'chip'); b.append(el('span', nameOf(f.district)), el('small', String(allOf(f.district).length))); b.title = `${nameOf(f.district)} · ${scenesOf(f.district).length ? `${scenesOf(f.district).length} scenes` : 'no scenes yet'}${proposalsOf(f.district).length ? `, ${proposalsOf(f.district).length} proposal` : ''}`; b.setAttribute('aria-pressed', String(f === current)); return b; }));
    const v = view(current), scenes = allOf(current.district), mix = crowdMix(current.district);
    const head = el('header'); head.append(el('h3', nameOf(current.district)), el('p', current.motto, 'motto'));
    const swatches = el('div', undefined, 'swatches'); swatches.setAttribute('aria-label', 'Proposed palette'); for (const c of current.palette) { const s = el('span'); s.style.background = c; s.title = c; swatches.append(s); }
    const card = el('dl'); for (const [k, text] of [...current.card, ...(mix ? [['Crowd', `${Math.round(mix.kitted * 100)}% kitted, ${Math.round(mix.robots * 100)}% robots. ${mix.note}`] as [string, string]] : [])]) card.append(el('dt', k), el('dd', text));
    main.replaceChildren(head, swatches);
    if (!scenes.length) { main.append(el('p', 'No scene in this district yet. The card and crowd mix are ready for when the first one is built.', 'muted'), card); return; }
    // Scenes open on the Scene stage, the one viewport for editing, previewing and playing. A scene with a
    // proposal (or a proposal itself) opens comparing the two side by side.
    const strip = el('div', undefined, 'frame-strip'), status = el('p', '', 'muted'); status.setAttribute('role', 'status');
    const look = { cameraX: 0, minute: v.minute, weather: v.weather };
    for (const scene of scenes) {
      const proposal = PROPOSAL_SCENES.find(p => (p.base === scene || p.id === scene) && docs.get(p.id)?.kind === 'composition');
      const compare = proposal ? (proposal.id === scene ? proposal.base : proposal.id) : undefined;
      const pick = button('', () => context.openScene(scene, compare), 'asset-card'), thumb = el('canvas'); thumb.width = 240; thumb.height = 135;
      pick.title = compare ? `Open ${sceneName(scene)} on the Scene stage, compared with ${sceneName(compare)}` : `Open ${sceneName(scene)} on the Scene stage`;
      pick.append(thumb, el('span', sceneName(scene))); strip.append(pick);
      requestAnimationFrame(() => { if (!disposed) draw(thumb, status, scene, look); });
    }
    main.append(el('p', 'Click a scene to open it on the Scene stage. Scenes with a proposal open side by side with it.', 'muted'), strip, status, card);
  }
  refresh();
  return () => { disposed = true; host.replaceChildren(); };
}
