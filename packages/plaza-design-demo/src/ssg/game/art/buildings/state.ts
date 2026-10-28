import {textField} from '../core/fields';
import {appearanceChoice,appearanceText} from '../core/fields';
/**
 * BUILDING KIT, a building's state (Tommi, 2026-10-21: the city should have the occasional building
 * for sale, standing empty or under construction, depending on the district). Every building type
 * takes the same three fields; a state turns the rooms dark and adds its own layer on top:
 * - `for sale`: a banner over the shop floor, the shops shut, a number to call.
 * - `empty`: boarded shop floor, dark rooms, a notice taped to the boards, grime.
 * - `construction`: scaffolding up the whole front (steel, or bamboo as in Hong Kong) with planks at
 *   every floor and netting, a site hoarding at the street, work lights.
 * An empty lot being built on is its own piece: `building.site` (site.ts).
 */
import type { Field, Properties } from '../core/composition';
import { neonPlate } from '../signage/kit';
import type { Paint } from './types';

const y = (h: number) => -h;
const rgba = (c: string, a: number) => 'rgba(' + c + ',' + a.toFixed(3) + ')';
const hash = (n: number) => { const s = Math.sin(n * 12.9898) * 43758.5453; return s - Math.floor(s); };
const select = (label: string, options: readonly string[]): Field => ({ kind: 'select', label, options: [...options], default: options[0] });
const text = textField;

export const BUILDING_STATES = ['lived in', 'for sale', 'empty', 'construction'] as const;
export const stateFields: Record<string, Field> = {
  state: appearanceChoice(select('State', BUILDING_STATES)),
  notice: appearanceText(text('Notice (empty: the state’s own)', '')),
  scaffold: appearanceChoice(select('Scaffolding (construction)', ['steel', 'bamboo'])),
};
/** Whether the building is out of use: its rooms stay dark and its shops shut. */
export const vacant = (p: Properties) => typeof p.state === 'string' && p.state !== 'lived in';
const NOTICES: Record<string, string> = { 'for sale': 'FOR SALE', empty: 'NO ENTRY', construction: 'SITE · KEEP OUT' };

/** The state's layer over a building `w` wide, `h` tall, with its shop floor `g` high, in its own frame. */
export function paintState(x: CanvasRenderingContext2D, p: Properties, w: number, h: number, g: number, o: Paint, seed: number) {
  const state = String(p.state ?? 'lived in'); if (state === 'lived in') return;
  const notice = String(p.notice || NOTICES[state]);
  if (state === 'for sale') {
    // a banner tied across the shop floor; the agent's number underneath, smaller
    const bw = Math.min(w - 10, 110), bx = (w - bw) / 2, bh = Math.min(g - 6, 40);
    x.fillStyle = 'rgba(0,0,0,.6)'; x.fillRect(4, y(g - 4), w - 8, g - 8);
    x.fillStyle = 'rgba(230,225,215,.92)'; x.fillRect(bx, y(g - 10), bw, 16); x.fillStyle = 'rgba(200,30,40,.95)'; x.fillRect(bx, y(g - 10), bw, 3);
    neonPlate(x, o.t, w / 2, y(g - 19), { text: notice, col: '200,30,40', size: 8, h: 11, printed: true, bolts: false, ink: 'rgba(170,20,30,.95)' } as Parameters<typeof neonPlate>[4]);
    x.strokeStyle = 'rgba(0,0,0,.8)'; x.beginPath(); x.moveTo(bx, y(g - 10)); x.lineTo(bx - 4, y(g - 4)); x.moveTo(bx + bw, y(g - 10)); x.lineTo(bx + bw + 4, y(g - 4)); x.stroke();
    x.fillStyle = 'rgba(230,225,215,.8)'; x.fillRect(w / 2 - 18, y(bh), 36, 8); x.fillStyle = 'rgba(40,30,30,.8)'; for (let k = 0; k < 7; k++) x.fillRect(w / 2 - 15 + k * 4, y(bh - 3), 3, 2);
    return;
  }
  if (state === 'empty') {
    // the shop floor boarded up, tags on the boards, a notice; streaks down the dark front
    for (let k = 4; k < w - 4; k += 14) { x.fillStyle = hash(seed + k) < 0.5 ? '#3a2c1c' : '#33261a'; x.fillRect(k, y(g - 8), 13, g - 10); x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(k + 12, y(g - 8), 1, g - 10); }
    x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(4, y(g * 0.5), w - 8, 2);
    for (let k = 0; k < Math.max(1, Math.floor(w / 60)); k++) { const tx = 8 + Math.round(hash(seed * 7 + k) * (w - 40)); x.fillStyle = rgba(['200,60,200', '80,200,220', '230,200,60'][k % 3], 0.5); x.fillRect(tx, y(22), 22, 3); x.fillRect(tx + 4, y(26), 3, 7); x.fillRect(tx + 12, y(28), 8, 3); }
    x.fillStyle = 'rgba(232,224,200,.85)'; x.fillRect(w / 2 - 10, y(44), 20, 14); x.fillStyle = 'rgba(200,30,40,.9)'; x.fillRect(w / 2 - 8, y(41), 16, 2); x.fillStyle = 'rgba(60,40,30,.8)'; x.fillRect(w / 2 - 8, y(37), 12, 1); x.fillRect(w / 2 - 8, y(34), 14, 1);
    for (let k = 0; k < Math.round(w / 12); k++) { const sx = Math.round(hash(seed + k * 3) * w); x.fillStyle = 'rgba(0,0,0,.2)'; x.fillRect(sx, y(h), 2, Math.round(h * (0.2 + 0.5 * hash(seed + k)))); }
    void notice;
    return;
  }
  // construction: scaffolding up the whole front, planks at every lift, netting, a hoarding at the street
  const bamboo = p.scaffold === 'bamboo', pole = bamboo ? 'rgba(190,150,80,.85)' : 'rgba(150,155,165,.8)', lift = bamboo ? 30 : 36, bay = bamboo ? 14 : 30;
  for (let k = -4; k <= w + 4; k += bay) { x.fillStyle = pole; x.fillRect(k, y(h + 12), 1, h + 12); }
  for (let hh = lift; hh < h + 10; hh += lift) {
    x.fillStyle = pole; x.fillRect(-4, y(hh), w + 8, 1);
    if (!bamboo) { x.fillStyle = 'rgba(90,70,50,.9)'; x.fillRect(-4, y(hh) - 2, w + 8, 2); }
    if (bamboo) { x.strokeStyle = 'rgba(190,150,80,.4)'; for (let k = -4; k < w; k += bay * 2) { x.beginPath(); x.moveTo(k, y(hh)); x.lineTo(k + bay * 2, y(hh + lift)); x.stroke(); } }
  }
  // netting over part of it, green or blue, sagging
  const net = hash(seed) < 0.5 ? '40,120,70' : '40,80,150', n0 = Math.round(h * 0.35), n1 = h + 8;
  x.fillStyle = rgba(net, 0.32); x.fillRect(-4, y(n1), w + 8, n1 - n0);
  x.fillStyle = rgba(net, 0.2); for (let k = -4; k < w + 4; k += 4) x.fillRect(k, y(n1), 1, n1 - n0);
  // work lights clamped to the scaffold
  for (let k = 0; k < 2; k++) { const lx = Math.round(w * (0.25 + 0.5 * k)), lh = lift * (1 + k); x.fillStyle = 'rgba(255,240,200,.95)'; x.fillRect(lx, y(lh + 3), 4, 3); o.light?.(lx + 2, lh, 8, 8, '255,240,200', 'screen'); }
  // the hoarding: painted plywood along the street, the developer's picture, the notice
  x.fillStyle = '#1c2a24'; x.fillRect(-6, y(44), w + 12, 44); x.fillStyle = 'rgba(255,255,255,.08)'; for (let k = -6; k < w + 6; k += 20) x.fillRect(k, y(44), 1, 44);
  const rw = Math.min(70, w * 0.45); x.fillStyle = 'rgba(150,190,220,.35)'; x.fillRect(8, y(38), rw, 26); x.fillStyle = 'rgba(230,240,250,.55)'; x.fillRect(14, y(34), 8, 20); x.fillRect(26, y(30), 12, 16); x.fillRect(42, y(36), 10, 22);
  neonPlate(x, o.t, Math.min(w - 30, rw + 40), y(28), { text: notice, col: '255,210,60', size: 6, h: 10, printed: true, bolts: false } as Parameters<typeof neonPlate>[4]);
  x.fillStyle = 'rgba(255,210,60,.85)'; for (let k = -6; k < w + 6; k += 8) x.fillRect(k, y(4), 4, 3);
}

