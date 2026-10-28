import {fixedGeometry} from '../core/spatial';
import {seconds,velocity,degrees} from "../core/fields";
import {booleanField,textField} from '../core/fields';
import {numericFields} from '../core/fields';
import {rectangleControls,axisControl,worldElevationControl} from '../core/spatial';
import {appearanceBoolean,appearanceChoice,appearanceText,generationSeed,semantic,shapeLength,shapePosition} from '../core/fields';
/** Editable reading-room elements. Geometry comes from composition instances; rules stay in the scene. */
import type { PreparedCharacter } from '../../runtime/characters';
import { drawCharacterFrame } from '../characters/appearance';
import type { Anchor, Bounds, AssetDefinition, Field, Placement, Properties } from '../core/composition';
import type { View } from '../core/view';
import { exitDoor, notice } from '../core/primitives';
import { camera, taped, ticker } from '../signage/screens';
import { ALARM } from '../signage/kit';
import { createLibraryArtwork, type ArtworkInputs } from '../assemblies/library';
const fixedNativeGeometry=fixedGeometry("This library component has no independently authored size. Its native kernel and prepared source layout determine its geometry. Edit the source layout or Transform rather than stretching its body.");

const number = numericFields({min:-10000,max:10000,step:1,unit:'world units'});
const bool = booleanField;
const string = textField;
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
function element(name: string, label: string, category: string, fields: Record<string, Field>, bounds: (props: Properties) => Bounds, draw: Draw, anchors: (props: Properties) => Record<string, Anchor> = () => ({ origin })): AssetDefinition {
  return { type: 'library.' + name, version: 1, label, category, coordinates: 'world', libraryUse:!['person','spawn-marker','shelves','room','floor'].includes(name)?'reusable':undefined, fields, parts: ['backdrop'], bounds, anchors,
    draw(ctx, view, props, state, _pass, at) { if (!at) throw new Error('Library element requires resolved placement'); draw(ctx, view, props, state, at); } };
}
const rectangle = (w: number, h: number, x = 0): Bounds => ({ x, h, w, tall: h });
const hoverFields = { hover: bool('Pointer over device') };
const hover = (e: AssetDefinition): AssetDefinition => ({ ...e, bindingIdentity:'presentation', visualFields: hoverFields });
const windowSpans = (state: Properties): [number, number][] => (state.windows ?? []) as [number, number][];
export const libraryElements: AssetDefinition[] = [
  { ...({...element('spawn-marker', 'Library entrance position', 'markers', {}, () => ({ x: -4, h: 8, w: 8, tall: 8 }), () => {}),spatial:fixedNativeGeometry}), parts: [] },
  ({...element('room', 'Reading room envelope', 'architecture', { width: shapeLength(number('Width', 960, 1)), height: shapeLength(number('Ceiling', 176, 1)), wallBand: shapeLength(number('Left wall band', 380, 0)) }, p => rectangle(n(p, 'width'), n(p, 'height')),
    (x, v, p, _s, at) => { const L = layout(); L.shelves.x0 = at.x + n(p, 'wallBand'); kernel(L, n(p, 'width'), n(p, 'height'), at.x).roomShell(x, raised(v, at.h)); }), spatial:rectangleControls({width:'width',height:'height'})}),
  ({...element('window', 'Arched reading-room window', 'architecture', { width: shapeLength(number('Width', 64, 1)), bearing: semantic(number('Compass bearing', 270, 0, 360),{"group":"Transform","quantity":"angle","unit":"degrees"}) }, p => ({ x: 0, h: 190, w: n(p, 'width'), tall: 190 }),
    (x, v, p, _s, at) => kernel(undefined, undefined, undefined, undefined, n(p,'bearing')).backWindow(x, raised(v, at.h), at.x, at.x + n(p, 'width'))), spatial:rectangleControls({width:'width'})}),
  { ...({...element('shelves', 'Empty shelf wall', 'furniture', { width: shapeLength(number('Width', 580, 1)) }, p => rectangle(n(p, 'width'), 165),
    (x, v, p, s, at) => { const L = layout(); L.shelves = { x0: at.x, x1: at.x + n(p, 'width') }; L.windows = windowSpans(s); kernel(L).shelves(x, raised(v, at.h)); }), spatial:rectangleControls({width:'width'})}),
    visualFields: { windows: { kind: 'json', label: 'Window openings', default: [], validate: value => {
      if (!Array.isArray(value) || value.some(span => !Array.isArray(span) || span.length !== 2 || span.some(n => typeof n !== 'number' || !Number.isFinite(n)))) throw new Error('Invalid shelf window openings');
    } } } },
  ({...element('gallery', 'Gallery railing and coffers', 'architecture', { width: shapeLength(number('Width', 580, 1)), height: shapeLength(number('Ceiling', 176, 1)) }, p => rectangle(n(p, 'width'), n(p, 'height') + 12),
    (x, v, p, _s, at) => { const L = layout(); L.shelves.x0 = at.x; kernel(L, n(p, 'width'), n(p, 'height'), at.x).galleryRail(x, raised(v, at.h), v.sx(at.x + n(p, 'width'))); }), spatial:rectangleControls({width:'width',height:'height'})}),
  ({...element('ceiling', 'Reading-room ceiling coffers', 'architecture', { width: shapeLength(number('Width', 960, 1)), height: shapeLength(number('Ceiling', 176, 1)) }, p => rectangle(n(p, 'width'), n(p, 'height') + 12),
    (x, v, p, _s, at) => kernel(undefined, n(p, 'width'), n(p, 'height'), at.x).ceilingCoffers(x, raised(v, at.h), v.sx(at.x), v.sx(at.x + n(p, 'width')))), spatial:rectangleControls({width:'width',height:'height'})}),
  ({...element('ticker', 'Registry information strip', 'signage', { width: shapeLength(number('Width', 280, 1)), text: appearanceText(string('Text', 'QUIET PLEASE')), scrollSpeed:velocity("Scroll speed",21,{"min":0,"max":1200,"step":60}) }, p => rectangle(n(p, 'width'), 10),
    (x, v, p, _s, at) => ticker(x, v, { x: at.x, h: at.h, w: n(p, 'width'), tall: 10, text: String(p.text), col: ALARM, speed: (n(p,'scrollSpeed')/60) })), spatial:rectangleControls({width:'width',originX:.5})}),
  ({...element('camera', 'Registry room camera', 'electronics', { blinkTimeOffset:seconds("Blink time offset",0.05,{"min":-166.66666666666666,"max":166.66666666666666,"step":0.016666666666666666}), direction: appearanceChoice({ kind: 'select', label: 'Direction', default: -1, options: [-1, 1] }) }, () => ({ x: -14, h: 10, w: 28, tall: 20 }),
    (x, v, p, _s, at) => camera(x, v, { x: at.x, h: at.h, facing: n(p, 'direction') as 1 | -1, phase: (n(p,'blinkTimeOffset')*60) })),spatial:fixedNativeGeometry}),
  ({...element('clock', 'Stopped wall clock', 'props', {}, () => ({ x: -12, h: 12, w: 24, tall: 24 }), (x, v, _p, _s, at) => kernel().wallClock(x, v, at.x, at.h)),spatial:fixedNativeGeometry}),
  element('pendant', 'Green pendant lamp', 'electronics', { ceilingHeight: semantic(number('Ceiling height', 176, 1),{group:'Shape / Area',quantity:'position',unit:'world units',space:'world'}), flicker: appearanceBoolean(bool('Flicker')) }, () => ({ x: -54, h: 56, w: 108, tall: 176 }),
    (x, v, p, _s, at) => kernel(undefined, undefined, n(p, 'ceilingHeight')).pendant(x, v, at.x, at.h, !!p.flicker)),
  ({...element('door', 'Reading-room exit door', 'architecture', { label: appearanceText(string('Plate', '< DOWNTOWN')) }, () => ({ x: -18, h: 74, w: 36, tall: 74 }),
    (x, v, p, _s, at) => exitDoor(x, raised(v, at.h), at.x, '#0a0603', String(p.label)), () => ({ origin, entrance: { ...origin, role: 'entrance' } })),spatial:fixedNativeGeometry}),
  ({...element('notice', 'Library notice board', 'signage', {}, () => ({ x: -23, h: 0, w: 46, tall: 40 }),
    (x, v, _p, _s, at) => notice(x, v.t, v.sx(at.x), v.y(at.h), 46, 40, ['PUBLIC', 'LIBRARY', 'DOWNTOWN', 'BRANCH'])),spatial:fixedNativeGeometry}),
  ({...element('note', 'Taped paper note', 'signage', { first: appearanceText(string('First line', '')), second: appearanceText(string('Second line', '')), tiltAngle:degrees("Tilt",0,{"min":-180.48170546620932,"max":180.48170546620932,"step":57.29577951308232}) }, () => ({ x: -20, h: 0, w: 40, tall: 24 }),
    (x, v, p, _s, at) => taped(x, v, { x: at.x, h: at.h, text: [String(p.first), String(p.second)], tilt: (n(p,'tiltAngle')*Math.PI/180) })),spatial:fixedNativeGeometry}),
  hover(({...element('session-timer', 'Public session timer', 'electronics', {}, () => ({ x: -33, h: 32, w: 66, tall: 32 }),
    (x, v, _p, s, at) => { const L = layout(); L.timer = at.x; kernel(L).sessionTimer(x, raised(v, at.h - 84), !!s.hover); }),spatial:fixedNativeGeometry})),
  element('terminal', 'Public terminal and desk', 'furniture', { index: appearanceChoice({ kind: 'select', label: 'Terminal number', default: 0, options: [0, 1, 2] }), seatOffset: shapePosition(number('Chair offset', -16)) }, () => ({ x: -24, h: 46, w: 48, tall: 46 }),
    (x, v, p, _s, at) => { const i = n(p, 'index'), L = layout(); L.desks[i] = at.x; L.seats[i] = at.x + n(p, 'seatOffset'); kernel(L).terminal(x, raised(v, at.h), i); }, p => ({ origin, seat: { x: n(p, 'seatOffset'), h: 12, role: 'surface' }, screen: { x: 7, h: 46, role: 'mount' } })),
  { ...hover(({...element('card-reader', 'Library card reader', 'electronics', {}, () => ({ x: -14, h: 52, w: 28, tall: 52 }),
    (x, v, _p, s, at) => { const L = layout(); L.reader = at.x; kernel(L).cardReader(x, raised(v, at.h), !!s.online, !!s.hover); }),spatial:fixedNativeGeometry})), visualFields: { ...hoverFields, online: bool('Catalog connected') } },
  ({...element('counter', 'Librarian counter', 'furniture', { width: shapeLength(number('Width', 140, 1)), height: shapeLength(number('Height', 28, 1)) }, p => rectangle(n(p, 'width'), n(p, 'height') + 11),
    (x, v, p, _s, at) => { const L = layout(); L.counter = { x0: at.x, x1: at.x + n(p, 'width'), h: n(p, 'height') }; kernel(L).counter(x, raised(v, at.h)); }, p => ({ origin, top: { x: 0, h: n(p, 'height') + 2, role: 'surface' } })), spatial:rectangleControls({width:'width',height:'height'})}),
  hover(({...element('printer', 'Stuck library printer', 'electronics', {}, () => ({ x: -18, h: 30, w: 36, tall: 34 }),
    (x, v, _p, s, at) => { const L = layout(); L.printer = at.x; L.counter.h = -2; kernel(L).printer(x, raised(v, at.h), !!s.hover); }),spatial:fixedNativeGeometry})),
  ({...element('reference-book', 'Chained reference book', 'props', {}, () => ({ x: -18, h: 52, w: 36, tall: 52 }),
    (x, v, _p, _s, at) => { const L = layout(); L.book = at.x; kernel(L).bookStand(x, raised(v, at.h)); }),spatial:fixedNativeGeometry}),
  ({...element('radiator', 'Reading-room radiator', 'furniture', { width: shapeLength(number('Width', 66, 1)), height: shapeLength(number('Height', 20, 1)) }, p => rectangle(n(p, 'width'), n(p, 'height') + 30),
    (x, v, p, _s, at) => { const L = layout(); L.radiator = { x0: at.x, x1: at.x + n(p, 'width'), h: n(p, 'height') }; kernel(L).radiator(x, raised(v, at.h)); }, p => ({ origin, top: { x: 0, h: n(p, 'height'), role: 'surface' } })), spatial:rectangleControls({width:'width',height:'height'})}),
  ({...element('armchair', 'Library armchair', 'furniture', { seed: generationSeed(number('Upholstery variation', 0, 0)) }, () => ({ x: -13, h: 34, w: 26, tall: 34 }),
    (x, v, p, _s, at) => kernel().armchair(x, raised(v, at.h), at.x, n(p, 'seed')), () => ({ origin, seat: { x: 0, h: 12, role: 'surface' } })),spatial:fixedNativeGeometry}),
  ({...element('floor', 'Parquet and worn runner', 'surfaces', { width: shapeLength(number('Width', 960, 1)), runnerFrom: shapeLength(number('Runner start', 140)), runnerTo: shapeLength(number('Runner end', 600)) }, p => ({ x: 0, h: 0, w: n(p, 'width'), tall: 60 }),
    (x, v, p, _s, at) => kernel(undefined, n(p, 'width'), undefined, at.x, undefined, n(p, 'runnerFrom'), n(p, 'runnerTo')).floorFinish(x, raised(v, at.h))), spatial:rectangleControls({width:'width'})}),
];

/** Bound people use a controller-produced pose snapshot; this element owns no schedule or dialogue. */
export const libraryPersonElement: AssetDefinition = { ...({...element('person', 'Reading-room resident', 'characters', { actor: semantic(string('Actor id', ''),{"group":"Appearance","quantity":"reference","unit":"identifier"}) }, () => ({ x: -24, h: 64, w: 48, tall: 64 }),
  (x, v, _p, state) => { const prepared = state.pose as unknown as PreparedCharacter; if (prepared.visible) drawCharacterFrame(x, v, prepared.character, prepared.ready, prepared.pixelSize, prepared.frame, prepared.height); }),spatial:fixedNativeGeometry}),
  visualFields: { pose: { kind: 'json', label: 'Prepared actor pose', default: { visible: false, character: { x: 0 } }, validate: value => {
    const p = value as unknown as PreparedCharacter;
    if (!p || typeof p !== 'object' || typeof p.visible !== 'boolean') throw new Error('Invalid prepared character');
    if (!p.character || !Number.isFinite(p.character.x)) throw new Error('Missing character position');
    if (p.visible && (!p.ready || !p.frame || !Number.isFinite(p.frame.x) || !Number.isFinite(p.frame.bob) || ![1, -1].includes(p.frame.face) || typeof p.frame.moving !== 'boolean' || typeof p.frame.legs !== 'string' || typeof p.frame.arms !== 'string' || !(p.pixelSize > 0) || !Number.isFinite(p.height) || typeof p.ready.key !== 'string' || ![p.ready.ph, p.ready.seed, p.ready.a, p.ready.b].every(Number.isFinite) || !(p.ready.full || p.ready.bot || p.ready.critter))) throw new Error('Incomplete prepared character');
  } } },
};
libraryElements.push(libraryPersonElement);

const pendant=libraryElements.find(e=>e.type==='library.pendant')!;
pendant.spatial=worldElevationControl('ceilingHeight');
pendant.bounds=(p,_s,c)=>{const h=c?.placement.h??0,top=Math.max(Number(p.ceilingHeight),h+6,0),bottom=Math.min(0,h);return{x:-54,h:top-h,w:108,tall:top-bottom};};
libraryElements.find(e=>e.type==='library.terminal')!.spatial=axisControl('seatOffset','x',12,'Chair offset');
