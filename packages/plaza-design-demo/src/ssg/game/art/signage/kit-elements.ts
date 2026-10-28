import {appearanceColor} from '../core/fields';
import {textField,booleanField,choiceField} from '../core/fields';
import {numericFields} from '../core/fields';
import {appearanceBoolean,appearanceChoice,appearanceRatio,appearanceStructure,appearanceText,generationSeed,semantic,shapeLength,shapePosition} from '../core/fields';
/**
 * The registered sign kit: scene-independent `sign.*` elements any composition can place from the
 * editor's Library. Each draws through the shared kit (kit.ts, screens.ts); none owns its own copy.
 *
 * Coordinates are world units at the placement: plates, icons and paper centre on (x, h) except
 * where noted; screens, tickers and billboards stand on their bottom edge (`h`); blades and
 * nameplates hang from their top. Colours are RGB strings ('255,136,0'); keep them to their jobs
 * (ART-GUIDE §6). `mask` [left, right, bottom, top] (relative, world units) hides Downtown's storey
 * windows behind the sign, as the scene's own plates do.
 */
import type { Bounds, AssetDefinition, Field, Placement, Properties, Value } from '../core/composition';
import type { View } from '../core/view';
import { box, O, onScreen, PAPER } from '../core/primitives';
import * as screens from './screens';
import { nameplate, neonPlate, neonPlateSize, paperSign } from './kit';
import {conditionalControls,rectangleControls,axisControl,fixedGeometry} from '../core/spatial';
const fixedNativeGeometry=fixedGeometry("This kit component has no independently authored size. Its native kernel and prepared source layout determine its geometry. Edit the source layout or Transform rather than stretching its body.");

const num = numericFields({value:0,min:-10000,max:10000,step:1});
const str = textField;
const bool = booleanField;
const select = choiceField;
const rgb = (label: string, value: string, optional = false): Field => ({ kind: 'string', label, default: value, validate: v => {
  if (optional && v === '') return;
  if (typeof v !== 'string' || !/^\d{1,3},\d{1,3},\d{1,3}$/.test(v) || v.split(',').some(c => Number(c) > 255)) throw new Error('Expected an RGB colour like 255,136,0');
} });
const lines = (label: string, value: string[]): Field => ({ kind: 'json', label, default: value, editor:{kind:'array',item:appearanceText(textField('Line')),maxItems:24},validate: v => {
  if (!Array.isArray(v) || v.length > 24 || v.some(l => typeof l !== 'string' || l.length > 80)) throw new Error('Expected up to 24 text lines');
} });
/** Downtown's window exclusion: [left, right, bottom, top] relative to the placement, or [] for none. */
export const windowMask: Field = semantic({ kind: 'json', label: 'Window exclusion [left,right,bottom,top]', default: [], validate: value => {
  if (!Array.isArray(value) || ![0, 4].includes(value.length) || value.some(q => typeof q !== 'number' || !Number.isFinite(q))) throw new Error('Invalid sign window mask');
} ,editor:{kind:'tuple',empty:'Exclude front windows here',items:[shapePosition(numericFields({value:0})('Left')),shapePosition(numericFields({value:40})('Right')),shapePosition(numericFields({value:0})('Bottom')),shapePosition(numericFields({value:40})('Top'))]}},{"group":"Visibility & Drawing","quantity":"structured","unit":"structured"});
const timeOffset = (label = 'Time offset'): Field => semantic(num(label,0,-10000/60,10000/60,1/60),{group:'Motion',quantity:'duration',unit:'seconds'});
const angle = (label: string,value=0): Field => semantic(num(label,value,-36000,36000),{group:'Motion',quantity:'angle',unit:'degrees'});
const n = (p: Properties, k: string) => Number(p[k]);
const s = (p: Properties, k: string) => String(p[k]);
const list = (p: Properties, k: string) => (p[k] as Value[]).map(String);
/** Paging copy is written one page per line, its rows split by '|': "RENT DUE|03:00". */
const pages = (p: Properties) => list(p, 'lines').map(l => l.split('|'));
/** Leaves out unset options so a kernel's own defaults apply. */
const defined = <T extends object>(o: T): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
const MOUNTS = ['wall', 'pole', 'hang', 'bracket'];
const ICONS = ['bowl', 'fish', 'eye', 'arrow', 'heart', 'chip'];
type Draw = (x: CanvasRenderingContext2D, v: View, p: Properties, at: Required<Placement>) => void;
function element(type: string, label: string, fields: Record<string, Field>, bounds: (p: Properties) => Bounds, draw: Draw): AssetDefinition {
  // These kernels explicitly author a centred plate or a bottom-mounted screen. Text-sized
  // signs have no physical size input; an automatic (zero) dimension has no resize handle.
  const sized=['plate','screen','ticker','paper','billboard'].includes(type);
  const spatial=sized?conditionalControls(rectangleControls({width:'width',height:'height',originX:.5,originY:type==='plate'||type==='paper'?.5:0}), (p,key)=>Number(p[key])>0&&(type!=='plate'||p.style!=='street')):undefined;
  return { type: 'sign.' + type, version: 1, label, category: 'sign kit', coordinates: 'world', libraryUse: 'reusable', bindingIdentity: 'presentation', fields, parts: ['backdrop'], bounds: p => bounds(p),
    spatial,
    anchors: p => { const b = bounds(p); return { origin: { x: 0, h: 0, role: 'origin' }, top: { x: b.x + b.w / 2, h: b.h, role: 'mount' }, bottom: { x: b.x + b.w / 2, h: b.h - b.tall, role: 'mount' } }; },
    draw: (x, v, p, _s, _pass, at) => draw(x, v, p, at) };
}
/** A screen's mount from its fields: hang cables reach `reach` above the top (0: to the top of the view); a bracket arm is `reach` long. */
function mounted(p: Properties, at: Required<Placement>): screens.Mounted {
  const mount = s(p, 'mount') as screens.Mounted['mount'], reach = n(p, 'reach'), tall = n(p, 'height');
  const to = mount === 'hang' ? (reach > 0 ? at.h + tall + reach : undefined) : mount === 'bracket' ? (reach || -20) : undefined;
  return { x: at.x, h: at.h, w: n(p, 'width'), tall, parallax: at.parallax, mount, to, phase: p.kind==='registry'?n(p,'statusIndexOffset'):n(p,'timeOffset')*60, seed: n(p, 'seed') };
}
const screenBox = (p: Properties): Bounds => ({ x: -n(p, 'width') / 2 - 2, h: n(p, 'height') + 2, w: n(p, 'width') + 4, tall: n(p, 'height') + 4 });
const plateBox = (p: Properties): Bounds => {
  if (p.style === 'street') { const size = n(p,'fontSize'), w = Math.round([...s(p, 'text')].length * size * 0.64 + 12); return { x: -w / 2, h: (size + 8) / 2, w, tall: size + 8 }; }
  const { w, h } = neonPlateSize({ text: s(p, 'text'), size: n(p,'fontSize'), vertical: !!p.vertical, w: n(p, 'width'), h: n(p, 'height') });
  return { x: -w / 2, h: h / 2, w, tall: h };
};

export const SCREEN_KINDS = ['ads', 'slogans', 'broken', 'registry', 'score', 'menu', 'odds', 'wanted', 'lottery'] as const;

export const signKitElements: AssetDefinition[] = [
  element('plate', 'Neon plate', {
    text: appearanceText(str('Letters', 'OPEN')), color: appearanceColor(rgb('Tube RGB', O),"RGB"), fontSize: semantic(num('Letter size', 11, 4, 64),{"group":"Appearance","quantity":"length","unit":"artwork pixels","space":"artwork"}), width: shapeLength(num('Plate width (0: fit)', 0, 0, 2000)), height: shapeLength(num('Plate height (0: fit)', 0, 0, 2000)),
    flickerTimeOffset: timeOffset('Flicker time offset'), dead: semantic(num('Burnt-out letter (-1 none)', -1, -1, 64),{"group":"Appearance","quantity":"index","unit":"integer"}), vertical: appearanceBoolean(bool('Letters top to bottom')), printed: appearanceBoolean(bool('Painted letters, not tubes')), bolts: appearanceBoolean(bool('Corner bolts', true)),
    style: appearanceChoice(select('Plate', ['bolted', 'street'])), mask: windowMask,
  }, plateBox, (x, v, p, at) => {
    const cx = v.sx(at.x), b = plateBox(p);
    if (!onScreen(v, cx - b.w, b.w * 2)) return;
    if (p.style === 'street') { screens.wallSign(x, v, { x: at.x, h: at.h, text: s(p, 'text'), col: s(p, 'color'), size: n(p,'fontSize'), parallax: at.parallax, dead: n(p, 'dead'), phase: n(p, 'flickerTimeOffset')*60 }); return; }
    neonPlate(x, v.t, cx, v.y(at.h), { text: s(p, 'text'), col: s(p, 'color'), size: n(p,'fontSize'), w: n(p, 'width'), h: n(p, 'height'), phase: n(p, 'flickerTimeOffset')*60, dead: n(p, 'dead'), vertical: !!p.vertical, printed: !!p.printed, bolts: !!p.bolts });
  }),
  element('blade', 'Blade sign on a bracket', {
    text: appearanceText(str('Letters', 'HOTEL')), color: appearanceColor(rgb('Tube RGB', O),"RGB"), fontSize: semantic(num('Letter size', 9, 4, 32),{"group":"Appearance","quantity":"length","unit":"artwork pixels","space":"artwork"}), dim: appearanceRatio(num('Brightness', 1, 0, 1, 0.05)), dead: semantic(num('Burnt-out letter (-1 none)', -1, -1, 64),{"group":"Appearance","quantity":"index","unit":"integer"}), flickerTimeOffset: timeOffset('Flicker time offset'), mask: windowMask,
  }, p => { const size = n(p,'fontSize'); return { x: -size - 7, h: 0, w: size * 2 + 7, tall: s(p, 'text').length * (size + 2) + 8 }; },
  (x, v, p, at) => screens.bladeSign(x, v, { x: at.x, h: at.h, text: s(p, 'text'), col: s(p, 'color'), size: n(p,'fontSize'), dim: n(p, 'dim'), dead: n(p, 'dead'), phase: n(p, 'flickerTimeOffset')*60, parallax: at.parallax })),
  element('screen', 'Screen (ads, slogans, boards)', {
    kind: appearanceChoice(select('Shows', [...SCREEN_KINDS])), width: shapeLength(num('Glass width', 96, 8, 1000)), height: shapeLength(num('Glass height', 40, 6, 600)), mount: appearanceChoice(select('Mount', MOUNTS)), reach: shapeLength(num('Cable or arm length (0: default)')),
    lines: appearanceStructure(lines('Copy: one page/row per line, "|" splits rows or name|price', [])), title: appearanceText(str('Title (registry, menu, odds, score)')), text: appearanceText(str('Text (ghost, prize)')),
    color: appearanceColor(rgb('Colour RGB (empty: the kind\'s own)', '', true),"RGB"), pageDuration: semantic(num('Page duration',260/60,.5,100,1/60),{group:'Motion',quantity:'duration',unit:'seconds'}), timeOffset: timeOffset(), highlightPhaseAngle: angle('Highlight phase'), statusIndexOffset: semantic(num('Registry status offset',0),{group:'Motion',quantity:'index',unit:'integer'}), seed: generationSeed(num('Seed', 0, 0, 1000000)),
    rec: appearanceBoolean(bool('REC light')), tell: appearanceBoolean(bool('Usable (cyan tell)')), mask: windowMask,
  }, screenBox, (x, v, p, at) => {
    const m = mounted(p, at), col = s(p, 'color') || undefined, copy = list(p, 'lines'), title = s(p, 'title') || undefined, txt = s(p, 'text') || undefined;
    const paging = defined<screens.PagingScreen>({ ads: copy.length ? pages(p) : undefined, cols: col ? [col] : undefined, period: n(p, 'pageDuration')*60, rec: !!p.rec, tell: p.tell ? n(p, 'highlightPhaseAngle')*Math.PI/180 : undefined });
    switch (p.kind) {
      case 'ads': return screens.adScreen(x, v, { ...m, ...paging });
      case 'slogans': return screens.sloganScreen(x, v, { ...m, ...paging, period: paging.period === 260 ? 180 : paging.period, rec: true });
      case 'broken': return screens.brokenScreen(x, v, { ...m, ghost: txt });
      case 'registry': return screens.registryBoard(x, v, { ...m, title, lines: copy.length ? copy : undefined });
      case 'score': return screens.scoreDisplay(x, v, { ...m, name: title, score: Number(txt) || undefined });
      case 'menu': return screens.menuBoard(x, v, { ...m, title, col, items: (copy.length ? pages(p) : [['NOODLES', '4.50'], ['SOY', '2.10'], ['TEA', '1.40']]).map(r => [r[0] ?? '', r[1] ?? ''] as [string, string]) });
      case 'odds': return screens.oddsBoard(x, v, { ...m, title, rows: copy.length ? copy : ['DISTRICT 4', 'DISTRICT 7', 'DISTRICT 9'] });
      case 'wanted': return screens.wantedScreen(x, v, { ...m, seeds: n(p, 'seed') ? [n(p, 'seed'), n(p, 'seed') + 101] : undefined, crimes: copy.length ? copy : undefined });
      case 'lottery': return screens.lotteryScreen(x, v, { ...m, prize: txt });
    }
  }),
  element('ticker', 'Scrolling ticker', {
    text: appearanceText(str('Text', screens.TICKER[0])), color: appearanceColor(rgb('Text RGB', O),"RGB"), width: shapeLength(num('Width', 120, 8, 4000)), height: shapeLength(num('Height', 10, 6, 60)), scrollSpeed: semantic(num('Scroll speed',30,0,600,3),{group:'Motion',quantity:'speed',unit:'world units / second',space:'local'}), scrollOffset: shapePosition(num('Scroll offset')),
    mount: appearanceChoice(select('Mount', MOUNTS)), reach: shapeLength(num('Cable or arm length (0: default)')), seed: generationSeed(num('Seed', 0, 0, 1000000)), mask: windowMask,
  }, screenBox, (x, v, p, at) => screens.ticker(x, v, { ...mounted(p, at), phase:n(p,'scrollOffset'), text: s(p, 'text'), col: s(p, 'color'), speed: n(p, 'scrollSpeed')/60 })),
  element('paper', 'Printed sign or notice', {
    style: appearanceChoice(select('Material', ['board', 'paper'])), width: shapeLength(num('Width', 60, 6, 1000)), height: shapeLength(num('Height', 24, 6, 600)), lines: appearanceStructure(lines('Lines', ['NOTICE', 'ID REQUIRED'])),
    header: appearanceText(str('Red header (paper)')), ink: appearanceColor(rgb('Ink RGB (empty: material\'s own)', '', true),"RGB"), lineHeight: shapeLength(num('Line pitch', 9, 6, 40)), inset: appearanceBoolean(bool('Paper sheet inside the board')),
    post: appearanceBoolean(bool('On a post to the ground')), tell: appearanceBoolean(bool('Usable (cyan tell)')), highlightPhaseAngle: angle('Highlight phase'), mask: windowMask,
  }, p => ({ x: -n(p, 'width') / 2, h: n(p, 'height') / 2, w: n(p, 'width'), tall: n(p, 'height') }), (x, v, p, at) => {
    const cx = v.sx(at.x), w = n(p, 'width'), h = n(p, 'height'), top = v.y(at.h + h / 2), ink = s(p, 'ink');
    if (!onScreen(v, cx - w, w * 2)) return;
    if (p.post) box(x, cx - 1, top + h, 3, Math.max(0, v.y(0) - top - h), '#2a160a');
    paperSign(x, v.t, cx, top, w, h, { style: p.style as 'board' | 'paper', lines: list(p, 'lines'), header: s(p, 'header') || undefined, ink: ink ? 'rgba(' + ink + ',.92)' : undefined, lineH: n(p, 'lineHeight'), inset: !!p.inset, tell: p.tell ? n(p, 'highlightPhaseAngle')*Math.PI/180 : false });
  }),
  element('hanging', 'Board on two chains', {
    text: appearanceText(str('Letters', 'OPEN')), color: appearanceColor(rgb('Edge and letters RGB', PAPER),"RGB"), board: appearanceColor(str('Board colour', '#2a1a10'),"CSS color"), drop: shapeLength(num('Chain length', 10, 0, 400)),
  }, p => { const w = s(p, 'text').length * 5 + 12; return { x: -w / 2, h: 12 + n(p, 'drop'), w, tall: 12 + n(p, 'drop') }; },
  (x, v, p, at) => screens.hangingSign(x, v, { x: at.x, h: at.h, text: s(p, 'text'), col: s(p, 'color'), board: s(p, 'board'), to: at.h + 12 + n(p, 'drop'), parallax: at.parallax })),
  ({...element('icon', 'Neon icon', { icon: semantic(select('Drawing', ICONS),{"group":"Visibility & Drawing","quantity":"choice","unit":"choice"}), color: appearanceColor(rgb('Tube RGB', O),"RGB"), flickerTimeOffset: timeOffset('Flicker time offset'), mask: windowMask },
    () => ({ x: -13, h: 11, w: 26, tall: 22 }), (x, v, p, at) => screens.neonIcon(x, v, { x: at.x, h: at.h, icon: s(p, 'icon'), col: s(p, 'color'), phase: n(p, 'flickerTimeOffset')*60, parallax: at.parallax })),spatial:fixedNativeGeometry}),
  element('billboard', 'Billboard on a steel frame', {
    width: shapeLength(num('Width', 132, 20, 2000)), height: shapeLength(num('Height', 56, 10, 1000)), lines: appearanceStructure(lines('Ads: one per line, "|" splits rows', [])), timeOffset: timeOffset(), seed: generationSeed(num('Seed', 0, 0, 1000000)), mask: windowMask,
  }, p => ({ x: -n(p, 'width') / 2 - 2, h: n(p, 'height') + 2, w: n(p, 'width') + 4, tall: n(p, 'height') + 28 }),
  (x, v, p, at) => { const copy = list(p, 'lines'); screens.billboard(x, v, { x: at.x, h: at.h, w: n(p, 'width'), tall: n(p, 'height'), parallax: at.parallax, phase: p.kind==='registry'?n(p,'statusIndexOffset'):n(p,'timeOffset')*60, seed: n(p, 'seed') || undefined, ads: copy.length ? pages(p) : undefined }); }),
  ({...element('camera', 'Surveillance camera', { pole: appearanceBoolean(bool('On its own pole')), blinkTimeOffset: timeOffset('Blink time offset') },
    p => ({ x: -14, h: 12, w: 28, tall: p.pole ? 14 : 16 }), (x, v, p, at) => screens.camera(x, v, { x: at.x, h: at.h, pole: !!p.pole, phase: n(p, 'blinkTimeOffset')*60, parallax: at.parallax })),spatial:fixedNativeGeometry}),
  ({...element('taped', 'Taped paper note', { lines: appearanceStructure(lines('Lines', ['OUT OF ORDER'])), tiltAngle: angle('Tilt',-.05*180/Math.PI) },
    p => { const l = list(p, 'lines'), w = Math.max(1, ...l.map(q => q.length)) * 4.6 + 8, h = l.length * 8 + 5; return { x: -w / 2, h: h / 2, w, tall: h }; },
    (x, v, p, at) => screens.taped(x, v, { x: at.x, h: at.h, text: list(p, 'lines'), tilt: n(p, 'tiltAngle')*Math.PI/180, parallax: at.parallax })),spatial:fixedNativeGeometry}),
  element('nameplate', 'LINE 0 station name', { name: appearanceText(str('Station name', 'DOWNTOWN')), rods: shapeLength(num('Rods up to the roof (0: on the wall)', 0, 0, 1000)), textOpacity: semantic(num('Text alpha', 0.92, 0, 1, 0.01),{"group":"Visibility & Drawing","quantity":"ratio","unit":"ratio"}) },
    p => { const w = 40 + s(p, 'name').length * 7; return { x: -w / 2, h: n(p,'rods'), w, tall: 20+n(p,'rods') }; },
    (x, v, p, at) => nameplate(x, v, v.sx(at.x), at.h, s(p, 'name'), n(p, 'rods') > 0 ? at.h + n(p, 'rods') : undefined, n(p, 'textOpacity'))),
];

// Mount lengths are source geometry; lettering sizes are typography, not body dimensions.
signKitElements.find(e=>e.type==='sign.hanging')!.spatial=axisControl('drop','h',0,'Chain upper endpoint',{offset:12});
signKitElements.find(e=>e.type==='sign.nameplate')!.spatial=axisControl('rods','h',0,'Roof rod endpoint');
signKitElements.find(e=>e.type==='sign.blade')!.spatial=fixedGeometry('The blade fits its lettering and bracket. Letter size is typography; there is no independently authored body width or height to resize.');
