/** Editable reading-room elements. Geometry comes from composition instances; rules stay in the scene. */
import type { PreparedCharacter } from '../../runtime/characters';
import { drawCharacterFrame } from '../characters/appearance';
import type { Anchor, Bounds, Element, Field, Placement, Properties } from '../core/composition';
import type { View } from '../core/view';
import { exitDoor, notice } from '../core/primitives';
import { camera, taped, ticker } from '../signage/screens';
import { createLibraryArtwork, type ArtworkInputs } from '../assemblies/library';

const number = (label: string, value: number, min = -10000, max = 10000): Field => ({ kind: 'number', label, default: value, min, max, step: 1, unit: 'world units' });
const bool = (label: string, value = false): Field => ({ kind: 'boolean', label, default: value });
const string = (label: string, value: string): Field => ({ kind: 'string', label, default: value });
const origin: Anchor = { x: 0, h: 0, role: 'origin' };
const n = (p: Properties, key: string) => Number(p[key]);
function layout(): ArtworkInputs['L'] {
  return { door: 0, spawn: 0, notice: 0, reader: 0, desks: [0, 0, 0], seats: [0, 0, 0], timer: 0, counter: { x0: 0, x1: 0, h: 0 }, librarian: 0, printer: 0, book: 0, chairs: [], radiator: { x0: 0, x1: 0, h: 0 }, cat: 0, windows: [], shelves: { x0: 0, x1: 0 } };
}
const kernels = new Map<string, ReturnType<typeof createLibraryArtwork>>();
function kernel(L = layout(), width = 960, ceiling = 176, originX = 0, facing = 270, runnerFrom = 140, runnerTo = 600) {
  const key = JSON.stringify([L, width, ceiling, originX, facing, runnerFrom, runnerTo]);
  let result = kernels.get(key);
  if (!result) {
    result = createLibraryArtwork({ L, LIBRARY_W: width, LIBRARY_FACING: facing, ceiling, originX, runnerFrom, runnerTo });
    if (kernels.size >= 2048) kernels.clear();
    kernels.set(key, result);
  }
  return result;
}
const raised = (v: View, h: number): View => h === 0 ? v : ({ ...v, gy: v.gy - h, y: value => v.y(value + h) });
type Draw = (ctx: CanvasRenderingContext2D, view: View, props: Properties, state: Properties, at: Required<Placement>) => void;
function element(name: string, label: string, category: string, fields: Record<string, Field>, bounds: (props: Properties) => Bounds, draw: Draw, anchors: (props: Properties) => Record<string, Anchor> = () => ({ origin })): Element {
  return { type: 'library.' + name, version: 1, label, category, coordinates: 'world', fields, parts: ['backdrop'], bounds, anchors,
    draw(ctx, view, props, state, _pass, at) { if (!at) throw new Error('Library element requires resolved placement'); draw(ctx, view, props, state, at); } };
}
const rectangle = (w: number, h: number, x = 0): Bounds => ({ x, h, w, tall: h });
const hoverFields = { hover: bool('Pointer over device') };
const hover = (e: Element): Element => ({ ...e, bindingIdentity:'presentation', visualFields: hoverFields });
const windowSpans = (state: Properties): [number, number][] => (state.windows ?? []) as [number, number][];
export const libraryElements: Element[] = [
  { ...element('spawn-marker', 'Library entrance position', 'markers', {}, () => ({ x: -4, h: 8, w: 8, tall: 8 }), () => {}), parts: [] },
  element('room', 'Reading room envelope', 'architecture', { width: number('Width', 960, 1), ceiling: number('Ceiling', 176, 1), wallBand: number('Left wall band', 380, 0) }, p => rectangle(n(p, 'width'), n(p, 'ceiling')),
    (x, v, p, _s, at) => { const L = layout(); L.shelves.x0 = at.x + n(p, 'wallBand'); kernel(L, n(p, 'width'), n(p, 'ceiling'), at.x).roomShell(x, raised(v, at.h)); }),
  element('window', 'Arched reading-room window', 'architecture', { width: number('Width', 64, 1), facing: number('Compass facing', 270, 0, 360) }, p => ({ x: 0, h: 190, w: n(p, 'width'), tall: 190 }),
    (x, v, p, _s, at) => kernel(undefined, undefined, undefined, undefined, n(p, 'facing')).backWindow(x, raised(v, at.h), at.x, at.x + n(p, 'width'))),
  { ...element('shelves', 'Empty shelf wall', 'furniture', { width: number('Width', 580, 1) }, p => rectangle(n(p, 'width'), 165),
    (x, v, p, s, at) => { const L = layout(); L.shelves = { x0: at.x, x1: at.x + n(p, 'width') }; L.windows = windowSpans(s); kernel(L).shelves(x, raised(v, at.h)); }),
    visualFields: { windows: { kind: 'json', label: 'Window openings', default: [], validate: value => {
      if (!Array.isArray(value) || value.some(span => !Array.isArray(span) || span.length !== 2 || span.some(n => typeof n !== 'number' || !Number.isFinite(n)))) throw new Error('Invalid shelf window openings');
    } } } },
  element('gallery', 'Gallery railing and coffers', 'architecture', { width: number('Width', 580, 1), ceiling: number('Ceiling', 176, 1) }, p => rectangle(n(p, 'width'), n(p, 'ceiling') + 12),
    (x, v, p, _s, at) => { const L = layout(); L.shelves.x0 = at.x; kernel(L, n(p, 'width'), n(p, 'ceiling'), at.x).galleryRail(x, raised(v, at.h), v.sx(at.x + n(p, 'width'))); }),
  element('ceiling', 'Reading-room ceiling coffers', 'architecture', { width: number('Width', 960, 1), ceiling: number('Ceiling', 176, 1) }, p => rectangle(n(p, 'width'), n(p, 'ceiling') + 12),
    (x, v, p, _s, at) => kernel(undefined, n(p, 'width'), n(p, 'ceiling'), at.x).ceilingCoffers(x, raised(v, at.h), v.sx(at.x), v.sx(at.x + n(p, 'width')))),
  element('ticker', 'Registry information strip', 'signage', { width: number('Width', 280, 1), text: string('Text', 'QUIET PLEASE'), speed: number('Scroll speed', 0.35, 0, 20) }, p => rectangle(n(p, 'width'), 10),
    (x, v, p, _s, at) => ticker(x, v, { x: at.x, h: at.h, w: n(p, 'width'), tall: 10, text: String(p.text), col: '255,90,70', speed: n(p, 'speed') })),
  element('camera', 'Registry room camera', 'electronics', { phase: number('Idle phase', 3), direction: { kind: 'select', label: 'Direction', default: -1, options: [-1, 1] } }, () => ({ x: -14, h: 10, w: 28, tall: 20 }),
    (x, v, p, _s, at) => camera(x, v, { x: at.x, h: at.h, facing: n(p, 'direction') as 1 | -1, phase: n(p, 'phase') })),
  element('clock', 'Stopped wall clock', 'props', {}, () => ({ x: -12, h: 12, w: 24, tall: 24 }), (x, v, _p, _s, at) => kernel().wallClock(x, v, at.x, at.h)),
  element('pendant', 'Green pendant lamp', 'electronics', { ceiling: number('Ceiling', 176, 1), flicker: bool('Flicker') }, () => ({ x: -54, h: 56, w: 108, tall: 176 }),
    (x, v, p, _s, at) => kernel(undefined, undefined, n(p, 'ceiling')).pendant(x, v, at.x, at.h, !!p.flicker)),
  element('door', 'Reading-room exit door', 'architecture', { label: string('Plate', '< DOWNTOWN') }, () => ({ x: -18, h: 74, w: 36, tall: 74 }),
    (x, v, p, _s, at) => exitDoor(x, raised(v, at.h), at.x, '#0a0603', String(p.label)), () => ({ origin, entrance: { ...origin, role: 'entrance' } })),
  element('notice', 'Library notice board', 'signage', {}, () => ({ x: -23, h: 0, w: 46, tall: 40 }),
    (x, v, _p, _s, at) => notice(x, v.t, v.sx(at.x), v.y(at.h), 46, 40, ['PUBLIC', 'LIBRARY', 'DOWNTOWN', 'BRANCH'])),
  element('note', 'Taped paper note', 'signage', { first: string('First line', ''), second: string('Second line', ''), tilt: number('Tilt in radians', 0, -3.15, 3.15) }, () => ({ x: -20, h: 0, w: 40, tall: 24 }),
    (x, v, p, _s, at) => taped(x, v, { x: at.x, h: at.h, text: [String(p.first), String(p.second)], tilt: n(p, 'tilt') })),
  hover(element('session-timer', 'Public session timer', 'electronics', {}, () => ({ x: -33, h: 32, w: 66, tall: 32 }),
    (x, v, _p, s, at) => { const L = layout(); L.timer = at.x; kernel(L).sessionTimer(x, raised(v, at.h - 84), !!s.hover); })),
  element('terminal', 'Public terminal and desk', 'furniture', { index: { kind: 'select', label: 'Terminal number', default: 0, options: [0, 1, 2] }, seatOffset: number('Chair offset', -16) }, () => ({ x: -24, h: 46, w: 48, tall: 46 }),
    (x, v, p, _s, at) => { const i = n(p, 'index'), L = layout(); L.desks[i] = at.x; L.seats[i] = at.x + n(p, 'seatOffset'); kernel(L).terminal(x, raised(v, at.h), i); }, p => ({ origin, seat: { x: n(p, 'seatOffset'), h: 12, role: 'surface' }, screen: { x: 7, h: 46, role: 'mount' } })),
  { ...hover(element('card-reader', 'Library card reader', 'electronics', {}, () => ({ x: -14, h: 52, w: 28, tall: 52 }),
    (x, v, _p, s, at) => { const L = layout(); L.reader = at.x; kernel(L).cardReader(x, raised(v, at.h), !!s.online, !!s.hover); })), visualFields: { ...hoverFields, online: bool('Catalog connected') } },
  element('counter', 'Librarian counter', 'furniture', { width: number('Width', 140, 1), height: number('Height', 28, 1) }, p => rectangle(n(p, 'width'), n(p, 'height') + 11),
    (x, v, p, _s, at) => { const L = layout(); L.counter = { x0: at.x, x1: at.x + n(p, 'width'), h: n(p, 'height') }; kernel(L).counter(x, raised(v, at.h)); }, p => ({ origin, top: { x: 0, h: n(p, 'height') + 2, role: 'surface' } })),
  hover(element('printer', 'Stuck library printer', 'electronics', {}, () => ({ x: -18, h: 30, w: 36, tall: 34 }),
    (x, v, _p, s, at) => { const L = layout(); L.printer = at.x; L.counter.h = -2; kernel(L).printer(x, raised(v, at.h), !!s.hover); })),
  element('reference-book', 'Chained reference book', 'props', {}, () => ({ x: -18, h: 52, w: 36, tall: 52 }),
    (x, v, _p, _s, at) => { const L = layout(); L.book = at.x; kernel(L).bookStand(x, raised(v, at.h)); }),
  element('radiator', 'Reading-room radiator', 'furniture', { width: number('Width', 66, 1), height: number('Height', 20, 1) }, p => rectangle(n(p, 'width'), n(p, 'height') + 30),
    (x, v, p, _s, at) => { const L = layout(); L.radiator = { x0: at.x, x1: at.x + n(p, 'width'), h: n(p, 'height') }; kernel(L).radiator(x, raised(v, at.h)); }, p => ({ origin, top: { x: 0, h: n(p, 'height'), role: 'surface' } })),
  element('armchair', 'Library armchair', 'furniture', { seed: number('Upholstery variation', 0, 0) }, () => ({ x: -13, h: 34, w: 26, tall: 34 }),
    (x, v, p, _s, at) => kernel().armchair(x, raised(v, at.h), at.x, n(p, 'seed')), () => ({ origin, seat: { x: 0, h: 12, role: 'surface' } })),
  element('floor', 'Parquet and worn runner', 'surfaces', { width: number('Width', 960, 1), runnerFrom: number('Runner start', 140), runnerTo: number('Runner end', 600) }, p => ({ x: 0, h: 0, w: n(p, 'width'), tall: 60 }),
    (x, v, p, _s, at) => kernel(undefined, n(p, 'width'), undefined, at.x, undefined, n(p, 'runnerFrom'), n(p, 'runnerTo')).floorFinish(x, raised(v, at.h))),
];

/** Bound people use a controller-produced pose snapshot; this element owns no schedule or dialogue. */
export const libraryPersonElement: Element = { ...element('person', 'Reading-room resident', 'characters', { actor: string('Actor id', '') }, () => ({ x: -24, h: 64, w: 48, tall: 64 }),
  (x, v, _p, state) => { const prepared = state.pose as unknown as PreparedCharacter; if (prepared.visible) drawCharacterFrame(x, v, prepared.character, prepared.ready, prepared.pixelSize, prepared.frame, prepared.height); }),
  visualFields: { pose: { kind: 'json', label: 'Prepared actor pose', default: { visible: false, character: { x: 0 } }, validate: value => {
    const p = value as unknown as PreparedCharacter;
    if (!p || typeof p !== 'object' || typeof p.visible !== 'boolean') throw new Error('Invalid prepared character');
    if (!p.character || !Number.isFinite(p.character.x)) throw new Error('Missing character position');
    if (p.visible && (!p.ready || !p.frame || !Number.isFinite(p.frame.x) || !Number.isFinite(p.frame.bob) || ![1, -1].includes(p.frame.face) || typeof p.frame.moving !== 'boolean' || typeof p.frame.legs !== 'string' || typeof p.frame.arms !== 'string' || !(p.pixelSize > 0) || !Number.isFinite(p.height) || typeof p.ready.key !== 'string' || ![p.ready.ph, p.ready.seed, p.ready.a, p.ready.b].every(Number.isFinite) || !(p.ready.full || p.ready.bot || p.ready.critter))) throw new Error('Incomplete prepared character');
  } } },
};
libraryElements.push(libraryPersonElement);
