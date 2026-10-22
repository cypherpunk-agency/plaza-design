/**
 * A thing's popup in the world: what a click or E on a device opens, right
 * next to it. No schematic, no nouns, no events: its everyday actions (the
 * kettle: boil; the blinds: open, close), then `⌁ jack in` for a computer
 * (the full device screen) and, last, `⌁ hack it` (hack view, on this device).
 *
 * Everyday actions run the noun's verb exactly as a tap on the schematic
 * would, and the popup closes at once: the scene is free when the reaction
 * plays (the reply is a caption in the caption lane, engine/feedback.ts).
 * Where it opens is a placement (POPUP_PLACEMENT, POPUP_LAYOUTS: one pure
 * function each, from the thing's anchor and the popup's measured parts to the
 * box, a ring round the thing, the connector's points and, for the plate, where
 * each part goes). By default the plate ("5B", Tommi 2026-10-15): a thin cyan
 * stalk grows straight up from the thing to a small name plate in the caption
 * lane, the everyday actions branch off the plate's sides as chips on the same
 * row, and `⌁ jack in` / `⌁ hack it` sit above it in pink. Kept to compare: a row
 * along the bottom (on a phone, in the action buttons' place), a row along the
 * top, and beside the thing. Arrow keys move (on the plate: left and right along
 * the row, up to the hacking entries, down back), Enter or E picks, Esc, ✕ (the
 * rows) or a click elsewhere closes; walking away closes it too (the host decides).
 *
 * The plate and the captions share the lane (engine/feedback.ts): the plate sits
 * where a caption would, its row's bottom on the lane's bottom (a gap over the
 * tallest thing on screen). The rule: the popup wins and the lane yields. While
 * the popup is open its parts are boxes the captions keep off (`Popup.boxes`,
 * handed to `Feedback.update` as `yieldTo`): a caption showing there steps aside,
 * or a row up or down, and its leader bends round the plate; the lane itself does
 * not move for it. An everyday action closes the popup at once, so its reply
 * takes the lane where the plate was.
 *
 * Colours per ART-GUIDE.md §6: cyan for what you can use, pink for the
 * hacking entries. Styles: POPUP_STYLES, inlined by render.tsx.
 */

/** One entry: an everyday action (cyan), or a hacking one (pink). `cur`: the state it is in now. `own`: it uses something you carry (dashed). */
export interface PopupItem {
  label: string; hack?: boolean; cur?: boolean; own?: boolean; run: () => void;
  /** A list's row: its short key before the label, and a tag after it (green when `cur`). */
  key?: string; tag?: string;
  /** The pointer is over it (a list reflects the host's state, so the host takes the hover as its choice). */
  point?: () => void;
}
/** How one `open` differs from the default: a placement of its own, and a list's ↑/↓ (the host moves its state) and starting selection. */
export interface PopupOpts { placement?: PopupPlacement; step?: (dir: 1 | -1) => void; sel?: number }
/** Where the thing stands on screen: its box centre and size, in CSS px of the game view. */
export interface PopupAnchor { x: number; y: number; w: number; h: number }
/** What placing the popup keeps in mind (CSS px of the game view). */
export interface PopupRoom {
  /** Points the thing affects (cable partners, the player, Pixel): the popup opens on the side away from them. */
  avoid: { x: number; y: number }[];
  /** Boxes it must never cover (the player, the buttons), as centre and size. */
  keepClear: PopupAnchor[];
  /** The top of the free view (under the HUD and the buttons). */
  top: number;
  /** The caption lane's bottom (engine/feedback.ts: a gap over the tallest thing on screen), if the host knows it. */
  lane?: number;
}

/**
 * Where a thing's popup opens (Tommi 2026-10-15 chose the plate; the others stay to compare):
 * - 'plate': a stalk up from the thing to its name plate in the caption lane, everyday actions
 *   branching left and right of the plate, the hacking entries above it in pink (plateLayout).
 * - 'bottom': a row of actions along the bottom, where the thumbs are. On a touch screen it takes
 *   the place of the action buttons (ESC, MAP, JMP, ACT) while it is open; the walk arrows stay.
 * - 'top': the same row along the top of the free view, under the HUD (HACK and BOARD step aside).
 * - 'beside': next to the thing, on the side away from what it affects.
 * - 'list': a vertical list of rows (key, label, tag) beside the thing, at its height, on the side with room;
 *   kept inside the free view (clear of the touch bar and its buttons) and following the thing. For a menu
 *   the player picks from by moving a selection (the lift car's floors): `step` moves it, E or a tap on a row picks.
 * The rows mark the thing with a ring and a thin connector down (or up) to it.
 */
export type PopupPlacement = 'plate' | 'bottom' | 'top' | 'beside' | 'list';
export const POPUP_PLACEMENT: PopupPlacement = 'plate';

/** Space between the thing's frame and the popup, and from the edges of the view (px). */
const GAP = 14, EDGE = 4;
export type Box = { l: number; t: number; r: number; b: number };
const boxOf = (a: PopupAnchor): Box => ({ l: a.x - a.w / 2, t: a.y - a.h / 2, r: a.x + a.w / 2, b: a.y + a.h / 2 });
const meets = (p: Box, q: Box) => p.l < q.r && p.r > q.l && p.t < q.b && p.b > q.t;

/** What a placement knows: the thing, the popup's measured size, the free view, what to keep clear of. CSS px of the game view. */
export interface PopupLayoutIn {
  anchor: PopupAnchor;
  size: { w: number; h: number };
  /** The view's width and free height (above the touch buttons), and the top of the free view (under the HUD). */
  view: { W: number; H: number; top: number };
  room: PopupRoom;
  /** On a touch screen: the walk arrows' and the action buttons' boxes. */
  pads: { walk: Box; act: Box } | null;
  /** The popup's parts, measured: its title and each entry (a placement that spreads them out places each). */
  parts: { title: { w: number; h: number }; items: { w: number; h: number; hack: boolean }[] };
  /** What it returned last frame for this thing (it stays put while open), or null on opening. */
  prev: PopupLayout | null;
}
/** A line drawn between the popup's parts: cyan, or pink for the hacking entries'. */
export interface PopupArm { pts: [number, number][]; hack?: boolean }
/**
 * What a placement returns: where the popup box goes, the ring round the thing (or none), the
 * connector's points; a placement that spreads the popup out (the plate) also says where the title
 * and each entry go (in the order of `parts.items`) and the arms joining them.
 */
export interface PopupLayout { box: Box; ring: Box | null; wire: [number, number][]; parts?: { title: Box; items: Box[]; arms: PopupArm[] } }
export type PopupLayoutFn = (p: PopupLayoutIn) => PopupLayout;

/** A row along the bottom or the top; on a touch screen the bottom row stands in the action buttons' place. */
const rowLayout = (where: 'bottom' | 'top'): PopupLayoutFn => ({ anchor: a, size: { w, h }, view: { W, H, top }, pads, prev }) => {
  let at = prev ? { l: prev.box.l, t: prev.box.t } : null;
  if (!at) {
    let l = Math.max(EDGE, Math.min(W - w - EDGE, a.x - w / 2)), t = where === 'top' ? top + EDGE : H - h - EDGE;
    if (where === 'bottom' && pads) { t = pads.act.b - h; l = Math.max(pads.walk.r + 12, pads.act.r - w); }
    at = { l, t };
  }
  const b = { l: at.l, t: at.t, r: at.l + w, b: at.t + h }, thing = boxOf(a), pad = 3;
  const ring = { l: thing.l - pad, t: thing.t - pad, r: thing.r + pad, b: thing.b + pad };
  const x = Math.max(b.l + 6, Math.min(b.r - 6, a.x));
  const wire: [number, number][] = where === 'top' ? [[x, b.b], [a.x, ring.t]] : [[x, b.t], [a.x, ring.b]];
  return { box: b, ring, wire };
};

/**
 * Beside the thing, on the side away from what it affects: right, left or above, whichever fits in
 * the view, covers neither the thing nor the player nor the buttons, and has the fewest affected
 * things on its side. None fits: the top of the view, under the HUD. A short line connects it.
 */
const besideLayout: PopupLayoutFn = ({ anchor: a, size: { w, h }, view: { W, H }, room }) => {
  const { avoid, keepClear, top } = room, thing = boxOf(a), clear = [thing, ...keepClear.map(boxOf)];
  const y0 = Math.max(top + EDGE, Math.min(H - h - EDGE, a.y - h / 2));
  const sides: { b: Box; away: (p: { x: number; y: number }) => boolean }[] = [
    { b: { l: thing.r + GAP, t: y0, r: thing.r + GAP + w, b: y0 + h }, away: (p) => p.x > a.x },
    { b: { l: thing.l - GAP - w, t: y0, r: thing.l - GAP, b: y0 + h }, away: (p) => p.x < a.x },
    { b: { l: a.x - w / 2, t: thing.t - GAP - h, r: a.x + w / 2, b: thing.t - GAP }, away: (p) => p.y < thing.t },
  ];
  const fits = (b: Box) => b.l >= EDGE && b.r <= W - EDGE && b.t >= top + EDGE - 0.5 && b.b <= H - EDGE && !clear.some((c) => meets(b, c));
  const best = sides.map((s, i) => {
    // a side that would hold an affected thing is worst; one that merely faces them, next
    const inside = avoid.filter((p) => p.x >= s.b.l && p.x <= s.b.r && p.y >= s.b.t && p.y <= s.b.b).length;
    return { s, i, score: inside * 10 + avoid.filter(s.away).length };
  }).filter((c) => fits(c.s.b)).sort((p, q) => p.score - q.score || p.i - q.i)[0];
  const b = best ? best.s.b : (() => { const l = Math.max(EDGE, Math.min(W - w - EDGE, a.x - w / 2)); return { l, t: top + EDGE, r: l + w, b: top + EDGE + h }; })();
  const px = Math.max(b.l, Math.min(b.r, a.x)), py = Math.max(b.t, Math.min(b.b, a.y));
  return { box: b, ring: null, wire: [[px, py], [Math.max(thing.l, Math.min(thing.r, px)), Math.max(thing.t, Math.min(thing.b, py))]] };
};

/**
 * A vertical list beside the thing (a lift car), at its height: on the right or the left, whichever has room (the
 * right when both do), its middle at the thing's middle, clamped into the free view under the HUD and over the touch
 * bar, and moved off the walk arrows' and action buttons' boxes. A ring on the thing and a short line to the list.
 */
const listLayout: PopupLayoutFn = ({ anchor: a, size: { w, h }, view: { W, H, top }, pads }) => {
  const thing = boxOf(a), pad = 3, ring = { l: thing.l - pad, t: thing.t - pad, r: thing.r + pad, b: thing.b + pad };
  const right = thing.r + GAP, left = thing.l - GAP - w;
  const fitsRight = right + w <= W - EDGE, fitsLeft = left >= EDGE;
  const l = fitsRight ? right : fitsLeft ? left : (W - thing.r > thing.l ? Math.min(right, W - w - EDGE) : Math.max(left, EDGE));
  let t = Math.max(top + EDGE, Math.min(H - h - EDGE, a.y - h / 2));
  // on a touch screen the list stays out of the walk arrows' and the action buttons' boxes (the view above the bar already is)
  for (const p of pads ? [pads.walk, pads.act] : []) if (meets({ l, t, r: l + w, b: t + h }, p)) t = Math.max(top + EDGE, Math.min(t, p.t - EDGE - h));
  const b = { l, t, r: l + w, b: t + h }, onRight = b.l >= thing.r;
  const y = Math.max(b.t + 6, Math.min(b.b - 6, a.y));
  return { box: b, ring, wire: [[onRight ? b.l : b.r, y], [onRight ? ring.r : ring.l, y]] };
};

/** The plate: the gap between chips, the cyan arm from the plate to its nearest chip, the pink arm up to the hacking row (px). */
const CHIP_GAP = 6, ARM = 16, RISE = 16;
const union = (bs: Box[]): Box => ({ l: Math.min(...bs.map((b) => b.l)), t: Math.min(...bs.map((b) => b.t)), r: Math.max(...bs.map((b) => b.r)), b: Math.max(...bs.map((b) => b.b)) });

/**
 * The stalk from the plate down to its thing: straight, from the thing's top, while the plate is
 * over it; when clamping moved the plate off it, down from the plate's nearer end to the thing's
 * middle, then across to its side (it bends once).
 */
function stalk(plate: Box, thing: Box, ax: number): [number, number][] {
  const l = Math.max(plate.l + 4, thing.l + 2), r = Math.min(plate.r - 4, thing.r - 2);
  if (l <= r) { const x = Math.max(l, Math.min(r, ax)); return [[x, plate.b], [x, thing.t]]; }
  const right = ax > plate.r, sx = right ? plate.r - 4 : plate.l + 4, my = (thing.t + thing.b) / 2;
  if (plate.b >= my) return [[sx, plate.b], [right ? thing.l : thing.r, Math.max(thing.t, Math.min(thing.b, plate.b))]];
  return [[sx, plate.b], [sx, my], [right ? thing.l : thing.r, my]];
}

/**
 * The plate ("5B", Tommi 2026-10-15). A thin cyan stalk grows straight up from the thing to a small
 * plate with its name, high up: the plate's row sits with its bottom on the caption lane's bottom
 * (so clear of the player and of every thing on screen), never under the HUD. The everyday actions
 * are chips on the plate's row, joined to it by short cyan arms, split left and right: balanced,
 * unless one side would leave the view (then they go to the other side rather than the plate
 * leaving its thing); they read left to right in their order. The hacking entries (`⌁ jack in`,
 * `⌁ hack it`) sit in a row above the plate, joined to it by a short pink arm. It stays put while
 * open (only the stalk follows the thing) and clamps to the view; a plate clamped off its thing
 * bends its stalk once.
 */
const plateLayout: PopupLayoutFn = ({ anchor: a, view: { W, H, top }, room, parts, prev }) => {
  const thing = boxOf(a), pad = 3, ring = { l: thing.l - pad, t: thing.t - pad, r: thing.r + pad, b: thing.b + pad };
  const n = parts.items.length;
  // open already: everything stays where it is, only the stalk follows the thing (the camera moves)
  if (prev?.parts && prev.parts.items.length === n) {
    const { title, items, arms } = prev.parts;
    return { box: prev.box, ring, wire: stalk(title, ring, a.x), parts: { title, items, arms } };
  }
  const { w: pw, h: ph } = parts.title;
  const all = parts.items.map((s, i) => ({ ...s, i })), every = all.filter((s) => !s.hack), hacks = all.filter((s) => s.hack);
  const rowH = Math.max(ph, ...every.map((s) => s.h)), hackH = Math.max(0, ...hacks.map((s) => s.h));
  const above = hacks.length ? RISE + hackH : 0;
  // the row's middle: its bottom on the lane (and over the thing), its hacking row under the HUD, in the view
  let cy = Math.min(room.lane ?? Infinity, thing.t - GAP) - rowH / 2;
  cy = Math.max(cy, top + EDGE + Math.max(rowH / 2, ph / 2 + above));
  cy = Math.min(cy, H - EDGE - rowH / 2);
  const span = (xs: { w: number }[]) => (xs.length ? ARM + xs.reduce((t, s) => t + s.w, 0) + CHIP_GAP * (xs.length - 1) : 0);
  // every split of the row (k chips left, the rest right), the plate over the thing, slid only as far as the view makes it
  const clear = room.keepClear.map(boxOf), pref = Math.ceil(every.length / 2), want = a.x - pw / 2;
  const best = Array.from({ length: every.length + 1 }, (_, k) => {
    const lw = span(every.slice(0, k)), rw = span(every.slice(k));
    const pl = Math.max(EDGE + lw, Math.min(W - EDGE - rw - pw, want));
    const row: Box = { l: pl - lw, t: cy - rowH / 2, r: pl + pw + rw, b: cy + rowH / 2 };
    const out = Math.max(0, EDGE - row.l) + Math.max(0, row.r - (W - EDGE));
    return { k, pl, score: (clear.some((c) => meets(row, c)) ? 1e6 : 0) + out * 1e3 + Math.abs(pl - want) * 2 + Math.abs(lw - rw) * 0.5 + (k === pref ? 0 : 1) };
  }).sort((p, q) => p.score - q.score)[0];
  const pl = Math.max(EDGE, best.pl), title: Box = { l: pl, t: cy - ph / 2, r: pl + pw, b: cy + ph / 2 };
  const items: Box[] = new Array(n), arms: PopupArm[] = [];
  // the left chips outward from the plate (so the first one is furthest out and reads first), then the right ones
  let x = title.l - ARM;
  every.slice(0, best.k).reverse().forEach((s) => { items[s.i] = { l: x - s.w, t: cy - s.h / 2, r: x, b: cy + s.h / 2 }; x -= s.w + CHIP_GAP; });
  if (best.k) arms.push({ pts: [[title.l, cy], [x + CHIP_GAP + 2, cy]] });
  x = title.r + ARM;
  every.slice(best.k).forEach((s) => { items[s.i] = { l: x, t: cy - s.h / 2, r: x + s.w, b: cy + s.h / 2 }; x += s.w + CHIP_GAP; });
  if (every.length > best.k) arms.push({ pts: [[title.r, cy], [x - CHIP_GAP - 2, cy]] });
  // the hacking row: centred over the plate, in the view; a pink arm up from the plate's middle
  if (hacks.length) {
    const hw = hacks.reduce((t, s) => t + s.w, 0) + CHIP_GAP * (hacks.length - 1), mid = Math.round((title.l + title.r) / 2);
    let hx = Math.max(EDGE, Math.min(W - EDGE - hw, mid - hw / 2));
    const hb = title.t - RISE;
    hacks.forEach((s) => { items[s.i] = { l: hx, t: hb - s.h, r: hx + s.w, b: hb }; hx += s.w + CHIP_GAP; });
    arms.push({ pts: [[mid, title.t], [mid, hb]], hack: true });
  }
  return { box: union([title, ...items]), ring, wire: stalk(title, ring, a.x), parts: { title, items, arms } };
};

/** Every placement, by name: a new one is one more entry here. */
export const POPUP_LAYOUTS: Record<PopupPlacement, PopupLayoutFn> = { plate: plateLayout, bottom: rowLayout('bottom'), top: rowLayout('top'), beside: besideLayout, list: listLayout };

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) {
  const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e;
}

export class Popup {
  private layer: HTMLDivElement;
  private box: HTMLDivElement;
  private title: HTMLDivElement;
  private list: HTMLDivElement;
  private wire: SVGPolylineElement;
  private room: PopupRoom = { avoid: [], keepClear: [], top: 0 };
  private items: PopupItem[] = [];
  private sel = 0;
  /** A click elsewhere closes it; a list also lets the touch bar's buttons (▲ ▼ ACT) through: they drive it. */
  private outside = (e: PointerEvent) => {
    const t = e.target as Element;
    if (this.box.contains(t) || (this.placement === 'list' && t.closest?.('#touch'))) return;
    this.close();
  };
  /** A list menu's ↑ (1) and ↓ (-1): the host moves the one state it reflects (the lift's `ride.pick`). */
  private step: ((dir: 1 | -1) => void) | null = null;
  /** What the rows said last (a list is rebuilt only when it changes). */
  private shown = '';
  readonly placement0: PopupPlacement;
  /** The ring round the thing (the rows, the plate), and the last layout (it stays put while open). */
  private ring: HTMLDivElement;
  private last: PopupLayout | null = null;
  /** The arms between the plate's parts (cyan; pink to the hacking entries). */
  private arms: SVGGElement;
  /** The device it is open for. */
  dev: string | null = null;
  onClose: () => void = () => {};

  /** Where it opens: the default, or a list for the one open (`open`'s `opts`). */
  placement: PopupPlacement;
  constructor(host: HTMLElement, placement: PopupPlacement = POPUP_PLACEMENT) {
    this.placement0 = this.placement = placement;
    this.layer = el('div', 'thing-layer'); this.layer.hidden = true;
    this.box = el('div', 'thing-pop'); this.box.setAttribute('role', 'menu');
    this.title = el('div', 'thing-title');
    this.list = el('div', 'thing-list');
    this.box.append(this.title, this.list);
    // the rows close with ✕ as well as Esc or a tap elsewhere (drawn for them only)
    const x = el('button', 'thing-item thing-x', '✕'); x.type = 'button'; x.tabIndex = -1; x.setAttribute('aria-label', 'close');
    x.addEventListener('click', (e) => { e.stopPropagation(); this.close(); });
    this.box.appendChild(x);
    this.ring = el('div', 'thing-ring');
    // the connector: a short line from the popup to its thing
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('class', 'thing-wire');
    this.wire = document.createElementNS('http://www.w3.org/2000/svg', 'polyline'); this.wire.setAttribute('class', 'thing-stalk');
    this.arms = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    svg.append(this.wire, this.arms);
    this.layer.append(svg, this.ring, this.box);
    host.appendChild(this.layer);
    this.style(placement);
  }

  /** The look of a placement: the layer's and the box's classes (the plate, a row, a list). */
  private style(placement: PopupPlacement) {
    this.placement = placement;
    const row = placement === 'bottom' || placement === 'top';
    this.layer.className = 'thing-layer' + (placement === 'plate' ? ' plate' : '');
    this.box.className = 'thing-pop' + (row ? ' row ' + placement : placement === 'plate' ? ' plate' : placement === 'list' ? ' list' : '');
    this.ring.hidden = placement === 'beside';
    this.last = null; this.shown = '';
  }

  get isOpen() { return !this.layer.hidden; }

  /** While open, the boxes it takes (the plate and each chip, or the whole popup), CSS px of the game view: captions keep off them. */
  get boxes(): Box[] {
    if (!this.isOpen || !this.last) return [];
    const p = this.last.parts;
    return p ? [p.title, ...p.items] : [this.last.box];
  }

  /** Open for a device: its name, its entries, next to where it stands. */
  open(dev: string, name: string, aria: string, items: PopupItem[], at: PopupAnchor | undefined, room?: PopupRoom, opts?: PopupOpts) {
    const again = this.dev === dev && this.isOpen;
    if (!again) this.last = null;
    const placement = opts?.placement ?? this.placement0;
    if (placement !== this.placement) this.style(placement);
    this.step = opts?.step ?? null;
    this.dev = dev;
    if (room) this.room = room;
    this.title.textContent = name;
    this.box.setAttribute('aria-label', aria);
    if (!again) this.sel = 0;
    if (opts?.sel !== undefined) this.sel = Math.max(0, Math.min(items.length - 1, opts.sel));
    this.fill(items);
    if (this.layer.hidden) {
      this.layer.hidden = false;
      // a row takes the place of the touch actions (bottom) or of HACK/BOARD (top) while it is open
      if (this.placement === 'bottom' || this.placement === 'top') document.documentElement.classList.add('thing-' + this.placement);
      // a click anywhere else closes it (capture: before the canvas opens another thing's popup)
      window.addEventListener('pointerdown', this.outside, true);
    }
    if (at) this.place(at);
  }

  /** The entries again (after an action: which one is current may have changed). */
  fill(items: PopupItem[]) {
    this.items = items;
    this.sel = Math.max(0, Math.min(this.sel, items.length - 1));
    // the same rows again: only what a tap runs has changed (the rows are not rebuilt under a finger)
    const sig = items.map((it) => [it.label, it.key, it.tag, it.hack, it.cur, it.own].join('\u0001')).join('\u0002');
    if (sig === this.shown && this.list.childElementCount === items.length) { this.select(this.sel); return; }
    this.shown = sig;
    this.list.textContent = '';
    items.forEach((it, i) => {
      const b = el('button', 'thing-item' + (it.hack ? ' hack' : '') + (it.cur ? ' cur' : '') + (it.own ? ' own' : '') + (i === this.sel ? ' sel' : ''));
      // the hacking entries' mark (⌁, missing from IBM Plex Mono) is drawn: a small jack plug
      const label = it.label.replace(/^⌁\s*/, '');
      if (label !== it.label) b.appendChild(el('span', 'thing-ico'));
      // a list's row: key, label, tag
      if (it.key !== undefined || it.tag !== undefined) {
        b.classList.add('row3');
        b.append(el('span', 'thing-key', it.key ?? ''), el('span', 'thing-name', label), el('span', 'thing-tag', it.tag ?? ''));
      } else b.appendChild(document.createTextNode(label));
      b.type = 'button'; b.setAttribute('role', 'menuitem'); b.tabIndex = -1;
      b.addEventListener('pointerenter', () => { this.select(i); this.items[i]?.point?.(); });
      b.addEventListener('click', (e) => { e.stopPropagation(); this.sel = i; this.items[i]?.run(); });
      this.list.appendChild(b);
    });
  }

  /** An open list again, as the host's state moved on: its rows (rebuilt only if they read differently) and which one is selected. */
  refresh(items: PopupItem[], sel: number) {
    this.sel = sel;
    this.fill(items);
  }

  /** The free view's height: on a phone the touch buttons lie over the bottom of it. */
  private freeHeight() {
    const pad = document.getElementById('touch'), top = this.layer.getBoundingClientRect().top;
    const padTop = pad?.offsetParent ? pad.getBoundingClientRect().top - top : Infinity;
    return Math.min(this.layer.clientHeight, padTop > 0 ? padTop : Infinity);
  }

  /** On a touch screen, the walk arrows' and the action buttons' boxes (CSS px of the game view). */
  private pads(): PopupLayoutIn['pads'] {
    const pads = document.querySelectorAll<HTMLElement>('#touch .pad');
    if (pads.length !== 2 || !pads[0].offsetParent) return null;
    const o = this.layer.getBoundingClientRect();
    const rel = (e: HTMLElement): Box => { const r = e.getBoundingClientRect(); return { l: r.left - o.left, t: r.top - o.top, r: r.right - o.left, b: r.bottom - o.top }; };
    return { walk: rel(pads[0]), act: rel(pads[1]) };
  }

  /** Every frame while open: the placement (POPUP_LAYOUTS) says where the box (or each part), the ring, the connector and the arms go. */
  place(a: PopupAnchor) {
    // a list taller than the free view scrolls inside it
    if (this.placement === 'list') {
      const room = this.freeHeight() - this.room.top - 2 * EDGE - this.title.offsetHeight - 14;
      this.list.style.maxHeight = Math.max(88, Math.round(room)) + 'px';
    }
    const chips = [...this.list.children] as HTMLElement[];
    const lay = POPUP_LAYOUTS[this.placement]({
      anchor: a, size: { w: this.box.offsetWidth, h: this.box.offsetHeight },
      view: { W: this.layer.clientWidth, H: this.freeHeight(), top: this.room.top },
      room: this.room, pads: this.pads(), prev: this.last,
      parts: {
        title: { w: this.title.offsetWidth, h: this.title.offsetHeight },
        items: chips.map((c, i) => ({ w: c.offsetWidth, h: c.offsetHeight, hack: !!this.items[i]?.hack })),
      },
    });
    this.last = lay;
    // the plate's lines are 2 px (on whole pixels), the others 1 px (on half pixels)
    const half = lay.parts ? 0 : 0.5;
    const px = (v: number) => Math.round(v) + 'px', pt = (pts: [number, number][]) => pts.map(([x, y]) => Math.round(x) + half + ',' + (Math.round(y) + half)).join(' ');
    this.box.style.left = px(lay.box.l); this.box.style.top = px(lay.box.t);
    if (lay.parts) {
      // spread out: each part where the placement says, inside the box
      const at = (e: HTMLElement, b: Box) => { e.style.left = px(b.l - lay.box.l); e.style.top = px(b.t - lay.box.t); };
      this.box.style.width = px(lay.box.r - lay.box.l); this.box.style.height = px(lay.box.b - lay.box.t);
      at(this.title, lay.parts.title);
      lay.parts.items.forEach((b, i) => chips[i] && at(chips[i], b));
    }
    const arms = lay.parts?.arms ?? [];
    while (this.arms.childElementCount > arms.length) this.arms.lastElementChild!.remove();
    while (this.arms.childElementCount < arms.length) this.arms.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'polyline'));
    arms.forEach((arm, i) => { const l = this.arms.children[i]; l.setAttribute('points', pt(arm.pts)); l.setAttribute('class', arm.hack ? 'hack' : ''); });
    this.ring.hidden = !lay.ring;
    if (lay.ring) Object.assign(this.ring.style, { left: lay.ring.l + 'px', top: lay.ring.t + 'px', width: lay.ring.r - lay.ring.l + 'px', height: lay.ring.b - lay.ring.t + 'px' });
    this.wire.setAttribute('points', pt(lay.wire));
  }

  close() {
    if (this.layer.hidden) return;
    this.layer.hidden = true; this.dev = null; this.items = []; this.last = null; this.step = null; this.shown = '';
    document.documentElement.classList.remove('thing-bottom', 'thing-top');
    window.removeEventListener('pointerdown', this.outside, true);
    this.onClose();
  }

  /** The host is disposed: closed (its window listener goes with it) and off the page. */
  dispose() { this.onClose = () => {}; this.close(); this.layer.remove(); }

  private select(i: number) {
    this.sel = i;
    [...this.list.children].forEach((b, j) => {
      const was = b.classList.contains('sel');
      b.classList.toggle('sel', j === i);
      if (j === i && !was) (b as HTMLElement).scrollIntoView?.({ block: 'nearest' });
    });
  }

  /**
   * Arrows on a spread-out popup (the plate) move where they point: left and right along a row, up
   * to the hacking entries, down back to the everyday ones; the nearest entry that way, or stay.
   */
  private toward(k: string): number {
    const bs = this.last?.parts?.items, me = bs?.[this.sel];
    if (!bs || !me) return this.sel;
    const mid = (b: Box) => ({ x: (b.l + b.r) / 2, y: (b.t + b.b) / 2 }), m = mid(me);
    let best = this.sel, far = Infinity;
    bs.forEach((b, i) => {
      if (i === this.sel || !b) return;
      const p = mid(b), dx = p.x - m.x, dy = p.y - m.y, row = Math.abs(dy) < 8;
      const ok = k === 'ArrowLeft' ? row && dx < 0 : k === 'ArrowRight' ? row && dx > 0 : k === 'ArrowUp' ? dy < -8 : dy > 8;
      const d = row ? Math.abs(dx) : Math.abs(dx) + Math.abs(dy) * 0.25;
      if (ok && d < far) { far = d; best = i; }
    });
    return best;
  }

  /** A key while it is open. True when the popup used it; false lets the game have it (walking away closes it). */
  key(e: KeyboardEvent): boolean {
    const n = this.items.length, k = e.key;
    if (k === 'Escape') { e.preventDefault(); this.close(); return true; }
    // a list the host drives: ↑ ↓ (W S) go to the host (one step up or down the building, as without the list), ← → are not for walking here
    if (this.step) {
      const dir = k === 'ArrowUp' || k === 'w' || k === 'W' ? 1 : k === 'ArrowDown' || k === 's' || k === 'S' ? -1 : 0;
      if (dir) { e.preventDefault(); if (!e.repeat) this.step(dir); return true; }
      if (k === 'ArrowLeft' || k === 'ArrowRight') { e.preventDefault(); return true; }
    }
    if (this.last?.parts && k.startsWith('Arrow')) { e.preventDefault(); if (n) this.select(this.toward(k)); return true; }
    if (k === 'ArrowDown' || k === 'ArrowUp') { e.preventDefault(); if (n) this.select((this.sel + (k === 'ArrowDown' ? 1 : n - 1)) % n); return true; }
    if (k === 'Enter' || k === 'e' || k === 'E' || k === ' ') { e.preventDefault(); if (!e.repeat) this.items[this.sel]?.run(); return true; }
    this.close();
    return false;
  }
}

/** The popup's look (render.tsx inlines it): cyan entries you can use, pink ones that hack. */
export const POPUP_STYLES = `
    /* A thing's popup in the world (game/engine/popup.ts): its everyday actions, then jack in / hack it */
    .thing-layer {
      position: absolute;
      left: 0;
      right: 0;
      top: var(--game-top, 40px);
      bottom: var(--game-bottom, 40px);
      z-index: 8;
      overflow: hidden;
      pointer-events: none;
      font-family: var(--font-mono);
    }

    .thing-layer[hidden] { display: none; }

    .thing-pop {
      position: absolute;
      display: grid;
      gap: 2px;
      min-width: 9em;
      max-width: min(16em, 60%);
      padding: 4px;
      background: rgba(3, 8, 9, 0.94);
      border: var(--border-thin) solid rgba(0, 255, 255, 0.55);
      box-shadow: 0 0 12px rgba(0, 255, 255, 0.18);
      pointer-events: auto;
      user-select: none;
      -webkit-user-select: none;
    }

    .thing-title { padding: 0 4px 2px; font-size: 9px; font-weight: 600; letter-spacing: 0.1em; color: rgb(255, 136, 0); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .thing-list { display: grid; gap: 2px; }

    .thing-item {
      display: block;
      width: 100%;
      min-height: 22px;
      padding: 2px 8px;
      text-align: left;
      background: #031416;
      color: var(--color-accent-400);
      border: var(--border-thin) solid #0d4a52;
      font-family: var(--font-mono);
      font-size: 11px;
      white-space: nowrap;
      cursor: pointer;
      touch-action: manipulation;
    }

    .thing-item.sel,
    .thing-item:hover { border-color: var(--color-accent-400); box-shadow: 0 0 8px rgba(0, 255, 255, 0.3); }
    .thing-item.cur { color: var(--color-success); border-color: var(--color-success); background: #04140a; }
    .thing-item.hack { color: rgb(255, 61, 242); background: #160416; border-color: rgba(255, 61, 242, 0.45); }
    .thing-item.hack.sel,
    .thing-item.hack:hover { border-color: rgb(255, 61, 242); box-shadow: 0 0 8px rgba(255, 61, 242, 0.4); }

    .thing-wire { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible; }
    .thing-wire polyline { fill: none; stroke: rgba(0, 255, 255, 0.6); stroke-width: 1; }
    /* touch targets stay at least 44 px */
    html.touch .thing-item { min-height: 44px; font-size: 13px; }

    /* the hacking entries' mark: a small jack plug, drawn (IBM Plex Mono has no ⌁) */
    .thing-ico {
      display: inline-block;
      width: 0.62em;
      height: 0.9em;
      margin-right: 0.45em;
      vertical-align: -0.12em;
      background: currentColor;
      clip-path: polygon(20% 0, 35% 0, 35% 22%, 65% 22%, 65% 0, 80% 0, 80% 22%, 100% 22%, 100% 55%, 62% 78%, 62% 100%, 38% 100%, 38% 78%, 0 55%, 0 22%, 20% 22%);
    }

    /* the rows (POPUP_PLACEMENT 'bottom' / 'top'): name, actions, ✕ in one line; a ring on the thing */
    .thing-pop.row { display: flex; flex-wrap: wrap; align-items: stretch; gap: 4px; min-width: 0; max-width: calc(100% - 8px); }
    .thing-pop.row.bottom { flex-wrap: wrap-reverse; }
    .thing-pop.row .thing-title { display: flex; align-items: center; padding: 0 6px; font-size: 10px; }
    .thing-pop.row .thing-list { display: flex; flex-wrap: wrap; gap: 4px; }
    .thing-pop.row .thing-item { width: auto; min-height: 28px; }
    .thing-pop.row .thing-x { min-width: 28px; text-align: center; color: rgba(255, 217, 165, 0.85); background: #0b0805; border-color: rgba(255, 217, 165, 0.35); }
    html.touch .thing-pop.row .thing-item { min-height: 44px; min-width: 44px; }
    .thing-ring {
      position: absolute;
      box-sizing: border-box;
      border: 1px solid rgba(0, 255, 255, 0.85);
      box-shadow: 0 0 8px rgba(0, 255, 255, 0.45), inset 0 0 6px rgba(0, 255, 255, 0.2);
      animation: thing-ring 1.4s ease-in-out infinite;
    }

    .thing-ring[hidden] { display: none; }
    @keyframes thing-ring { 50% { border-color: rgba(0, 255, 255, 0.4); } }
    @media (prefers-reduced-motion: reduce) { .thing-ring { animation: none; } }
    /* the plate (POPUP_PLACEMENT 'plate', "5B"): a stalk up from the thing to its name plate, the
       everyday actions as cyan chips branching off its sides, the hacking ones above it in pink */
    .thing-pop.plate { display: block; min-width: 0; max-width: none; padding: 0; background: none; border: 0; box-shadow: none; pointer-events: none; }
    .thing-pop.plate .thing-list { display: contents; }
    .thing-pop.plate .thing-title {
      position: absolute;
      display: flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      height: 22px;
      min-width: 72px;
      padding: 0 10px;
      font-size: 10px;
      letter-spacing: 0.12em;
      color: rgb(255, 136, 0);
      background: #120a05;
      border: 2px solid rgb(255, 136, 0);
      overflow: visible;
      pointer-events: auto;
      animation: thing-in 0.15s ease 0.1s both;
    }

    .thing-pop.plate .thing-item {
      position: absolute;
      display: flex;
      align-items: center;
      width: auto;
      height: 28px;
      min-height: 0;
      padding: 0 10px;
      box-sizing: border-box;
      color: rgb(0, 255, 255);
      background: rgba(2, 14, 16, 0.95);
      border: 2px solid #00e5e5;
      pointer-events: auto;
      animation: thing-in 0.15s ease 0.16s both;
    }

    .thing-pop.plate .thing-item.hack { color: rgb(255, 61, 242); background: #1a0418; border-color: rgb(255, 61, 242); }
    .thing-pop.plate .thing-item.cur { color: var(--color-success); border-color: var(--color-success); background: #04140a; }
    /* something you carry, used on the thing (the maglev pass at the brake): dashed, it comes from your pocket */
    .thing-item.own, .thing-pop.plate .thing-item.own { border-style: dashed; }
    .thing-pop.plate .thing-item.sel,
    .thing-pop.plate .thing-item:hover { box-shadow: 0 0 0 1px currentColor, 0 0 10px rgba(0, 255, 255, 0.45); }
    .thing-pop.plate .thing-item.hack.sel,
    .thing-pop.plate .thing-item.hack:hover { box-shadow: 0 0 0 1px currentColor, 0 0 10px rgba(255, 61, 242, 0.5); }
    html.touch .thing-pop.plate .thing-title { height: 28px; }
    html.touch .thing-pop.plate .thing-item { height: 44px; min-height: 44px; min-width: 44px; padding: 0 12px; font-size: 13px; }
    .thing-layer.plate .thing-wire polyline { stroke: #00e5e5; stroke-width: 2; animation: thing-in 0.15s ease both; }
    .thing-layer.plate .thing-wire polyline.hack { stroke: rgb(255, 61, 242); }
    .thing-layer.plate .thing-wire g polyline { animation-delay: 0.16s; }
    @keyframes thing-in { from { opacity: 0; } }
    @media (prefers-reduced-motion: reduce) { .thing-pop.plate .thing-title, .thing-pop.plate .thing-item, .thing-layer .thing-wire polyline { animation: none; } }

    /* a list (placement 'list': the lift car's floors): a vertical list beside the thing, rows of key, label and tag */
    .thing-pop:not(.row) .thing-x { display: none; }
    .thing-pop.list { min-width: 12em; max-width: min(18em, 60%); }
    .thing-pop.list .thing-title { padding: 2px 6px 4px; font-size: 10px; border-bottom: 1px solid rgba(0, 255, 255, 0.25); margin-bottom: 2px; }
    .thing-pop.list .thing-list { overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; scrollbar-color: #0d4a52 transparent; }
    .thing-item.row3 { display: grid; grid-template-columns: 2.4em 1fr auto; align-items: center; gap: 6px; padding: 3px 8px; }
    .thing-item.row3 .thing-key { color: rgba(0, 255, 255, 0.55); }
    .thing-item.row3 .thing-tag { font-size: 9px; letter-spacing: 0.04em; color: rgba(0, 255, 255, 0.5); }
    .thing-item.row3.sel .thing-key { color: var(--color-accent-400); }
    .thing-item.row3.cur .thing-key, .thing-item.row3.cur .thing-tag { color: var(--color-success); }
    /* touch: rows keep a thumb's height (the list scrolls if the view is short) */
    html.touch .thing-item.row3 { min-height: 44px; font-size: 13px; }
    html.touch .thing-item.row3 .thing-tag { font-size: 10px; }

    /* while a row is open it takes the place of the touch actions (bottom) or of HACK/BOARD (top) */
    html.thing-bottom #touch .pad:last-child,
    html.thing-top #scene-btns { visibility: hidden; }
`;
