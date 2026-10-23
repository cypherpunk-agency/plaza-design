/** Individually editable Capsule 7B artwork, using the original procedural kernels. */
import { createCapsuleInteriorArtwork, type ArtworkInputs, type CapsuleVisualState } from './capsule-interior';
import type { Anchor, Bounds, Element, Field, Placement, Properties } from '../core/composition';
import type { View } from '../core/view';
const num = (label: string, value: number, min = -10000): Field => ({ kind: 'number', label, default: value, min, max: 10000, step: 1 });
const boolean = (label: string): Field => ({ kind: 'boolean', label, default: false });
const text = (label: string): Field => ({ kind: 'string', label, default: '' });
const n = (p: Properties, key: string) => Number(p[key]);
const origin: Anchor = { x: 0, h: 0, role: 'origin' };
const raised = (v: View, h: number): View => h === 0 ? v : ({ ...v, gy: v.gy - h, y: height => v.y(height + h) });
export const capsuleVisualFields: Record<string, Field> = {
  hover: text('Hovered device'), plugOn: boolean('Plug on'), up: boolean('Router online'), sun: boolean('Blinds open'), open: boolean('Door open'), hot: boolean('Router hot'), temp: num('Router temperature', 22), steam: boolean('Kettle steaming'), pixelAt: text('Pixel perch'),
  routerX: num('Cable router position', 438), deskRight: num('Cable desk edge', 456), deskHeight: num('Cable desk height', 30), sunFrom: num('Sun patch start', 264), sunTo: num('Sun patch end', 336),
};
function layout(): ArtworkInputs['L'] { return { lock: 0, fridge: { x: 0, w: 30, h: 68 }, counter: { x0: 0, x1: 72, h: 0 }, kettle: 0, window: { x: 0, w: 62, h0: 40, h1: 94 }, desk: { x0: 0, x1: 130, h: 0 }, pc: 0, plug: 0, router: 0, bed: { x0: 0, x1: 50 }, sun: { x0: 0, x1: 72 } }; }
const cache = new Map<string, ReturnType<typeof createCapsuleInteriorArtwork>>();
function kernel(L: ArtworkInputs['L'], width = 520, x = 0, facing = 90, door = 0, ceiling = 104, poster = 0) {
  const key = JSON.stringify([L, width, x, facing, door, ceiling, poster]); let result = cache.get(key);
  if (!result) { result = createCapsuleInteriorArtwork({ L, CAPSULE_W: width, CAPSULE_FACING: facing, DOOR_X: door, originX: x, ceiling, posterX: poster }); if (cache.size >= 2048) cache.clear(); cache.set(key, result); }
  return result;
}
type Draw = (ctx: CanvasRenderingContext2D, view: View, props: Properties, state: Properties, at: Required<Placement>) => void;
function element(id: string, label: string, category: string, fields: Record<string, Field>, bounds: (props: Properties) => Bounds, draw: Draw, anchors: (props: Properties) => Record<string, Anchor> = () => ({ origin })): Element {
  // Plug cables and the window's floor patch use other source instances' positions.
  return { type: 'capsule.' + id, bindingIdentity:'presentation', version: 1, label, category, coordinates: 'world', libraryUse:!['marker','neighbors','shell','plug','window'].includes(id)?'reusable':undefined, fields, visualFields: capsuleVisualFields, parts: ['backdrop'], bounds, anchors, draw: (x, v, p, s, _pass, at) => draw(x, v, p, s, at) };
}
const visual = (state: Properties) => state as unknown as CapsuleVisualState;
const box = (w: number, h: number, x = 0): Bounds => ({ x, h, w, tall: h });
export const capsuleElements: Element[] = [
  { ...element('marker', 'Capsule gameplay marker', 'markers', { role: text('Role'), width: num('Width', 0, 0) }, p => ({ x: -4, h: 8, w: Math.max(8, n(p, 'width')), tall: 8 }), () => {}), visualFields: {}, parts: [] },
  element('neighbors', 'Neighboring capsule cells', 'architecture', { width: num('Room gap width', 520, 1), ceiling: num('Cell height', 104, 1) }, p => box(n(p, 'width'), n(p, 'ceiling')),
    (x, v, p, _s, at) => kernel(layout(), n(p, 'width'), at.x, undefined, undefined, n(p, 'ceiling')).drawTower(x, { ...raised(v, at.h), sx: wx => v.sx(at.x + wx) })),
  element('shell', 'Capsule walls, floor and ceiling', 'architecture', { width: num('Width', 520, 16), ceiling: num('Ceiling', 104, 1) }, p => box(n(p, 'width'), n(p, 'ceiling') + 12),
    (x, v, p, s, at) => kernel(layout(), n(p, 'width'), at.x, undefined, undefined, n(p, 'ceiling')).drawShell(x, raised(v, at.h), visual(s))),
  element('poster', 'Line 0 poster', 'signage', {}, () => ({ x: -18, h: 0, w: 36, tall: 28 }),
    (x, v, _p, s, at) => kernel(layout(), undefined, undefined, undefined, undefined, undefined, at.x).drawPoster(x, raised(v, at.h - 86), visual(s))),
  element('window', 'Window and motorized blinds', 'architecture', { width: num('Width', 62, 1), height: num('Height', 54, 1), facing: num('Compass facing', 90, 0) }, p => ({ x: -n(p, 'width') / 2 - 4, h: n(p, 'height') + 8, w: n(p, 'width') + 18, tall: n(p, 'height') + 12 }),
    (x, v, p, s, at) => { const L = layout(); L.window = { x: at.x, w: n(p, 'width'), h0: at.h, h1: at.h + n(p, 'height') }; L.sun = { x0: n(s, 'sunFrom'), x1: n(s, 'sunTo') }; kernel(L, undefined, undefined, n(p, 'facing')).drawWindow(x, v, visual(s)); }),
  element('door', 'Capsule entrance door', 'architecture', {}, () => ({ x: -17, h: 62, w: 34, tall: 62 }),
    (x, v, _p, s, at) => kernel(layout(), undefined, undefined, undefined, at.x).drawDoor(x, raised(v, at.h), visual(s)), () => ({ origin, entrance: { x: 20, h: 0, role: 'entrance' } })),
  element('lock', 'Concierge door lock', 'electronics', {}, () => ({ x: -6, h: 48, w: 12, tall: 18 }),
    (x, v, _p, s, at) => { const L = layout(); L.lock = at.x; kernel(L).drawLock(x, raised(v, at.h), visual(s)); }),
  element('fridge', 'Capsule fridge and magnet note', 'electronics', { width: num('Width', 30, 1), height: num('Height', 68, 1) }, p => box(n(p, 'width') + 4, n(p, 'height') + 2, -n(p, 'width') / 2 - 2),
    (x, v, p, s, at) => { const L = layout(); L.fridge = { x: at.x, w: n(p, 'width'), h: n(p, 'height') }; kernel(L).drawFridge(x, raised(v, at.h), visual(s)); }),
  element('counter', 'Kitchenette counter and shelf', 'furniture', { width: num('Width', 72, 1), height: num('Height', 30, 1) }, p => box(n(p, 'width'), 84),
    (x, v, p, s, at) => { const L = layout(); L.counter = { x0: at.x, x1: at.x + n(p, 'width'), h: n(p, 'height') }; kernel(L).drawCounter(x, raised(v, at.h), visual(s)); }, p => ({ origin, top: { x: 0, h: n(p, 'height'), role: 'surface' } })),
  element('kettle', 'Steaming smart kettle', 'electronics', {}, () => ({ x: -11, h: 45, w: 32, tall: 45 }),
    (x, v, _p, s, at) => { const L = layout(); L.kettle = at.x; kernel(L).drawKettle(x, raised(v, at.h), visual(s)); }),
  element('pc-light', 'Home PC light wash', 'atmosphere', {}, () => ({ x: -70, h: 80, w: 140, tall: 110 }),
    (x, v, _p, s, at) => { const L = layout(); L.pc = at.x; kernel(L).drawPcGlow(x, raised(v, at.h), visual(s)); }),
  element('desk', 'Capsule desk', 'furniture', { width: num('Width', 130, 1), height: num('Height', 30, 8) }, p => box(n(p, 'width'), n(p, 'height')),
    (x, v, p, s, at) => { const L = layout(); L.desk = { x0: at.x, x1: at.x + n(p, 'width'), h: n(p, 'height') }; kernel(L).drawDesk(x, raised(v, at.h), visual(s)); }, p => ({ origin, top: { x: 0, h: n(p, 'height'), role: 'surface' } })),
  element('stool', 'Home PC stool', 'furniture', {}, () => ({ x: -8, h: 18, w: 16, tall: 18 }),
    (x, v, _p, s, at) => { const L = layout(); L.pc = at.x; kernel(L).drawStool(x, raised(v, at.h), visual(s)); }, () => ({ origin, seat: { x: 0, h: 18, role: 'surface' } })),
  element('pc', 'Home PC and keyboard', 'electronics', {}, () => ({ x: -16, h: 30, w: 42, tall: 30 }),
    (x, v, _p, s, at) => { const L = layout(); L.pc = at.x; kernel(L).drawPc(x, raised(v, at.h), visual(s)); }),
  element('plug', 'Smart plug and router cable', 'electronics', {}, () => ({ x: -6, h: 22, w: 60, tall: 22 }),
    (x, v, _p, s, at) => { const L = layout(); L.plug = at.x; L.router = n(s, 'routerX'); L.desk = { x0: 0, x1: n(s, 'deskRight'), h: n(s, 'deskHeight') }; kernel(L).drawPlug(x, raised(v, at.h), visual(s)); }),
  element('router', 'Warm capsule router', 'electronics', {}, () => ({ x: -11, h: 32, w: 22, tall: 32 }),
    (x, v, _p, s, at) => { const L = layout(); L.router = at.x; kernel(L).drawRouter(x, raised(v, at.h), visual(s)); }, () => ({ origin, top: { x: 0, h: 8, role: 'surface' } })),
  element('bed', 'Capsule bed', 'furniture', { width: num('Width', 50, 16) }, p => box(n(p, 'width'), 26),
    (x, v, p, s, at) => { const L = layout(); L.bed = { x0: at.x, x1: at.x + n(p, 'width') }; kernel(L).drawBed(x, raised(v, at.h), visual(s)); }, () => ({ origin, mattress: { x: 20, h: 22, role: 'surface' } })),
];
