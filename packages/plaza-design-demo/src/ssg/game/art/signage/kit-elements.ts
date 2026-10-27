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

const num = (label: string, value = 0, min = -10000, max = 10000, step = 1): Field => ({ kind: 'number', label, default: value, min, max, step });
const str = (label: string, value = ''): Field => ({ kind: 'string', label, default: value });
const bool = (label: string, value = false): Field => ({ kind: 'boolean', label, default: value });
const select = (label: string, options: string[], value = options[0]): Field => ({ kind: 'select', label, default: value, options });
const rgb = (label: string, value: string, optional = false): Field => ({ kind: 'string', label, default: value, validate: v => {
  if (optional && v === '') return;
  if (typeof v !== 'string' || !/^\d{1,3},\d{1,3},\d{1,3}$/.test(v) || v.split(',').some(c => Number(c) > 255)) throw new Error('Expected an RGB colour like 255,136,0');
} });
const lines = (label: string, value: string[]): Field => ({ kind: 'json', label, default: value, validate: v => {
  if (!Array.isArray(v) || v.length > 24 || v.some(l => typeof l !== 'string' || l.length > 80)) throw new Error('Expected up to 24 text lines');
} });
/** Downtown's window exclusion: [left, right, bottom, top] relative to the placement, or [] for none. */
export const windowMask: Field = { kind: 'json', label: 'Window exclusion [left,right,bottom,top]', default: [], validate: value => {
  if (!Array.isArray(value) || ![0, 4].includes(value.length) || value.some(q => typeof q !== 'number' || !Number.isFinite(q))) throw new Error('Invalid sign window mask');
} };
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
  return { type: 'sign.' + type, version: 1, label, category: 'sign kit', coordinates: 'world', libraryUse: 'reusable', bindingIdentity: 'presentation', fields, parts: ['backdrop'], bounds: p => bounds(p),
    anchors: p => { const b = bounds(p); return { origin: { x: 0, h: 0, role: 'origin' }, top: { x: b.x + b.w / 2, h: b.h, role: 'mount' }, bottom: { x: b.x + b.w / 2, h: b.h - b.tall, role: 'mount' } }; },
    draw: (x, v, p, _s, _pass, at) => draw(x, v, p, at) };
}
/** A screen's mount from its fields: hang cables reach `reach` above the top (0: to the top of the view); a bracket arm is `reach` long. */
function mounted(p: Properties, at: Required<Placement>): screens.Mounted {
  const mount = s(p, 'mount') as screens.Mounted['mount'], reach = n(p, 'reach'), tall = n(p, 'height');
  const to = mount === 'hang' ? (reach > 0 ? at.h + tall + reach : undefined) : mount === 'bracket' ? (reach || -20) : undefined;
  return { x: at.x, h: at.h, w: n(p, 'width'), tall, parallax: at.parallax, mount, to, phase: n(p, 'phase'), seed: n(p, 'seed') };
}
const screenBox = (p: Properties): Bounds => ({ x: -n(p, 'width') / 2 - 2, h: n(p, 'height') + 2, w: n(p, 'width') + 4, tall: n(p, 'height') + 4 });
const plateBox = (p: Properties): Bounds => {
  if (p.style === 'street') { const size = n(p, 'size'), w = Math.round([...s(p, 'text')].length * size * 0.64 + 12); return { x: -w / 2, h: (size + 8) / 2, w, tall: size + 8 }; }
  const { w, h } = neonPlateSize({ text: s(p, 'text'), size: n(p, 'size'), vertical: !!p.vertical, w: n(p, 'width'), h: n(p, 'height') });
  return { x: -w / 2, h: h / 2, w, tall: h };
};

export const SCREEN_KINDS = ['ads', 'slogans', 'broken', 'registry', 'score', 'menu', 'odds', 'wanted', 'lottery'] as const;

export const signKitElements: AssetDefinition[] = [
  element('plate', 'Neon plate', {
    text: str('Letters', 'OPEN'), color: rgb('Tube RGB', O), size: num('Letter size', 11, 4, 64), width: num('Plate width (0: fit)', 0, 0, 2000), height: num('Plate height (0: fit)', 0, 0, 2000),
    phase: num('Flicker phase'), dead: num('Burnt-out letter (-1 none)', -1, -1, 64), vertical: bool('Letters top to bottom'), printed: bool('Painted letters, not tubes'), bolts: bool('Corner bolts', true),
    style: select('Plate', ['bolted', 'street']), mask: windowMask,
  }, plateBox, (x, v, p, at) => {
    const cx = v.sx(at.x), b = plateBox(p);
    if (!onScreen(v, cx - b.w, b.w * 2)) return;
    if (p.style === 'street') { screens.wallSign(x, v, { x: at.x, h: at.h, text: s(p, 'text'), col: s(p, 'color'), size: n(p, 'size'), parallax: at.parallax, dead: n(p, 'dead'), phase: n(p, 'phase') }); return; }
    neonPlate(x, v.t, cx, v.y(at.h), { text: s(p, 'text'), col: s(p, 'color'), size: n(p, 'size'), w: n(p, 'width'), h: n(p, 'height'), phase: n(p, 'phase'), dead: n(p, 'dead'), vertical: !!p.vertical, printed: !!p.printed, bolts: !!p.bolts });
  }),
  element('blade', 'Blade sign on a bracket', {
    text: str('Letters', 'HOTEL'), color: rgb('Tube RGB', O), size: num('Letter size', 9, 4, 32), dim: num('Brightness', 1, 0, 1, 0.05), dead: num('Burnt-out letter (-1 none)', -1, -1, 64), phase: num('Flicker phase'), mask: windowMask,
  }, p => { const size = n(p, 'size'); return { x: -size - 7, h: 0, w: size * 2 + 7, tall: s(p, 'text').length * (size + 2) + 8 }; },
  (x, v, p, at) => screens.bladeSign(x, v, { x: at.x, h: at.h, text: s(p, 'text'), col: s(p, 'color'), size: n(p, 'size'), dim: n(p, 'dim'), dead: n(p, 'dead'), phase: n(p, 'phase'), parallax: at.parallax })),
  element('screen', 'Screen (ads, slogans, boards)', {
    kind: select('Shows', [...SCREEN_KINDS]), width: num('Glass width', 96, 8, 1000), height: num('Glass height', 40, 6, 600), mount: select('Mount', MOUNTS), reach: num('Cable or arm length (0: default)'),
    lines: lines('Copy: one page/row per line, "|" splits rows or name|price', []), title: str('Title (registry, menu, odds, score)'), text: str('Text (ghost, prize)'),
    color: rgb('Colour RGB (empty: the kind\'s own)', '', true), period: num('Page time (frames)', 260, 30, 6000), phase: num('Phase'), seed: num('Seed', 0, 0, 1000000),
    rec: bool('REC light'), tell: bool('Usable (cyan tell)'), mask: windowMask,
  }, screenBox, (x, v, p, at) => {
    const m = mounted(p, at), col = s(p, 'color') || undefined, copy = list(p, 'lines'), title = s(p, 'title') || undefined, txt = s(p, 'text') || undefined;
    const paging = defined<screens.PagingScreen>({ ads: copy.length ? pages(p) : undefined, cols: col ? [col] : undefined, period: n(p, 'period'), rec: !!p.rec, tell: p.tell ? n(p, 'phase') : undefined });
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
    text: str('Text', screens.TICKER[0]), color: rgb('Text RGB', O), width: num('Width', 120, 8, 4000), height: num('Height', 10, 6, 60), speed: num('Scroll speed', 0.5, 0, 10, 0.05), phase: num('Phase'),
    mount: select('Mount', MOUNTS), reach: num('Cable or arm length (0: default)'), seed: num('Seed', 0, 0, 1000000), mask: windowMask,
  }, screenBox, (x, v, p, at) => screens.ticker(x, v, { ...mounted(p, at), text: s(p, 'text'), col: s(p, 'color'), speed: n(p, 'speed') })),
  element('paper', 'Printed sign or notice', {
    style: select('Material', ['board', 'paper']), width: num('Width', 60, 6, 1000), height: num('Height', 24, 6, 600), lines: lines('Lines', ['NOTICE', 'ID REQUIRED']),
    header: str('Red header (paper)'), ink: rgb('Ink RGB (empty: material\'s own)', '', true), lineHeight: num('Line pitch', 9, 6, 40), inset: bool('Paper sheet inside the board'),
    post: bool('On a post to the ground'), tell: bool('Usable (cyan tell)'), tellPhase: num('Tell phase'), mask: windowMask,
  }, p => ({ x: -n(p, 'width') / 2, h: n(p, 'height') / 2, w: n(p, 'width'), tall: n(p, 'height') }), (x, v, p, at) => {
    const cx = v.sx(at.x), w = n(p, 'width'), h = n(p, 'height'), top = v.y(at.h + h / 2), ink = s(p, 'ink');
    if (!onScreen(v, cx - w, w * 2)) return;
    if (p.post) box(x, cx - 1, top + h, 3, Math.max(0, v.y(0) - top - h), '#2a160a');
    paperSign(x, v.t, cx, top, w, h, { style: p.style as 'board' | 'paper', lines: list(p, 'lines'), header: s(p, 'header') || undefined, ink: ink ? 'rgba(' + ink + ',.92)' : undefined, lineH: n(p, 'lineHeight'), inset: !!p.inset, tell: p.tell ? n(p, 'tellPhase') : false });
  }),
  element('hanging', 'Board on two chains', {
    text: str('Letters', 'OPEN'), color: rgb('Edge and letters RGB', PAPER), board: str('Board colour', '#2a1a10'), drop: num('Chain length', 10, 0, 400),
  }, p => { const w = s(p, 'text').length * 5 + 12; return { x: -w / 2, h: 12 + n(p, 'drop'), w, tall: 12 + n(p, 'drop') }; },
  (x, v, p, at) => screens.hangingSign(x, v, { x: at.x, h: at.h, text: s(p, 'text'), col: s(p, 'color'), board: s(p, 'board'), to: at.h + 12 + n(p, 'drop'), parallax: at.parallax })),
  element('icon', 'Neon icon', { icon: select('Drawing', ICONS), color: rgb('Tube RGB', O), phase: num('Flicker phase'), mask: windowMask },
    () => ({ x: -13, h: 11, w: 26, tall: 22 }), (x, v, p, at) => screens.neonIcon(x, v, { x: at.x, h: at.h, icon: s(p, 'icon'), col: s(p, 'color'), phase: n(p, 'phase'), parallax: at.parallax })),
  element('billboard', 'Billboard on a steel frame', {
    width: num('Width', 132, 20, 2000), height: num('Height', 56, 10, 1000), lines: lines('Ads: one per line, "|" splits rows', []), phase: num('Phase'), seed: num('Seed', 0, 0, 1000000), mask: windowMask,
  }, p => ({ x: -n(p, 'width') / 2 - 2, h: n(p, 'height') + 2, w: n(p, 'width') + 4, tall: n(p, 'height') + 28 }),
  (x, v, p, at) => { const copy = list(p, 'lines'); screens.billboard(x, v, { x: at.x, h: at.h, w: n(p, 'width'), tall: n(p, 'height'), parallax: at.parallax, phase: n(p, 'phase'), seed: n(p, 'seed') || undefined, ads: copy.length ? pages(p) : undefined }); }),
  element('camera', 'Surveillance camera', { pole: bool('On its own pole'), phase: num('Blink phase') },
    p => ({ x: -14, h: 12, w: 28, tall: p.pole ? 14 : 16 }), (x, v, p, at) => screens.camera(x, v, { x: at.x, h: at.h, pole: !!p.pole, phase: n(p, 'phase'), parallax: at.parallax })),
  element('taped', 'Taped paper note', { lines: lines('Lines', ['OUT OF ORDER']), tilt: num('Tilt (radians)', -0.05, -1, 1, 0.01) },
    p => { const l = list(p, 'lines'), w = Math.max(1, ...l.map(q => q.length)) * 4.6 + 8, h = l.length * 8 + 5; return { x: -w / 2, h: h / 2, w, tall: h }; },
    (x, v, p, at) => screens.taped(x, v, { x: at.x, h: at.h, text: list(p, 'lines'), tilt: n(p, 'tilt'), parallax: at.parallax })),
  element('nameplate', 'LINE 0 station name', { name: str('Station name', 'DOWNTOWN'), rods: num('Rods up to the roof (0: on the wall)', 0, 0, 1000), alpha: num('Text alpha', 0.92, 0, 1, 0.01) },
    p => { const w = 40 + s(p, 'name').length * 7; return { x: -w / 2, h: 0, w, tall: 20 }; },
    (x, v, p, at) => nameplate(x, v, v.sx(at.x), at.h, s(p, 'name'), n(p, 'rods') > 0 ? at.h + n(p, 'rods') : undefined, n(p, 'alpha'))),
];
