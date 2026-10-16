/**
 * The glide's Downtown (glide.ts), from the Galleria's plaza west to LINE 0's tunnel. Second pass
 * (Tommi, 2026-10-15):
 *
 * - **The towers are all different** (sets/downtown-towers.ts: skins, setbacks, crowns, roof gear, age),
 *   the street's row true to the player's scale: you see their lower storeys, shopfronts, balconies
 *   and signs, never their tops; low brick walk-ups between them let the skyline show through.
 * - **The signs** are the set's: neon blades, stacked letters, tickers, holo ads, rooftop billboards,
 *   flickering, a dead letter here and there; their colour lies in the wet street under them.
 * - **The city has height**: THE RING overhead on its columns with its own traffic and lamps
 *   (sets/ring-highway.ts), LINE 0's viaduct under it (finale.ts), the street at the bottom.
 * - **The background thickens toward the end**: four rows of skyline behind the street at depths 0.5
 *   to 0.14, sparse where Downtown begins and dense and tall by the tunnel.
 * - **Side streets** open between the towers (traffic.ts: cars come out of them and turn into them).
 */

import { drawCharacter, type Character } from "../../../runtime/characters";
import { drawTower, signGlows, towerRow, type Tower } from "../../architecture/downtown-towers";
import { drawRing, RING, ringTraffic } from "../../architecture/ring-highway";
import { frameView, placed } from "../../core/view";
import { type CoastView, type Lines, hash, lerp, mixHex, R, S } from "./coast";
import { PLACES, TOWER_X } from "./path";
import { SIDE_STREETS } from "./traffic";
import {pieceNumber as pn,pieceString as ps,pieceActor,visiblePoint,viewportSpan,strictlyVisiblePoint,type PieceInputs} from "./piece-inputs";
import type {Properties} from "../../core/composition";

const STOREY = 85;
const smooth = (a: number, b: number, v: number) => { const f = Math.max(0, Math.min(1, (v - a) / (b - a))); return f * f * (3 - 2 * f); };

/** The street's own row (depth 1, true scale), laid out once along X (view units at depth 1), leaving the side streets and the portal tower's place open. */
export const STREET: (Tower & { X: number })[] = (() => {
  const row = towerRow(47, 40, [300, 820], [1900, 6200], [], { storey: STOREY, gap: [24, 110], low: 0.3, shops: true, signs: 3 });
  const out: (Tower & { X: number })[] = [];
  let X = PLACES.street + 14;
  for (const b of row) {
    const w = b.w * S;
    // keep clear of the side streets' mouths and the portal tower
    for (const s of SIDE_STREETS) if (X < s + 28 && X + w > s - 28) X = s + 28;
    if (X < TOWER_X + 44 && X + w > TOWER_X - 140) X = TOWER_X + 44;
    out.push({ ...b, X });
    X += w + (b.x % 7) + 6;
    if (X > 5200) break;
  }
  return out;
})();
/** The tower LINE 0's canyon line comes out of: glass, wide, the portal on its face (finale.ts). */
export const PORTAL_TOWER: Tower & { X: number } = { X: TOWER_X - 132, w: 486, h: 5600, seed: 99001, roof: 'none', skin: 'glass', crown: 'halo', gear: ['antenna'], grime: 0.3, shop: false, signs: [{ kind: 'ticker', text: 'LINE 0 · CANYON BRANCH · NEXT: DOWNTOWN · MIND THE GAP · ', col: '255,136,0', h: 640 }, { kind: 'blade', text: 'REGISTRY', col: '255,42,68', h: 900, at: 0.9, dead: 4 }] };

/** The skyline rows behind the street: depth, the row's scale, X range in the row's own parallax, haze; sparse at the east end, dense and tall at the west. */
interface Row { p: number; towers: (Tower & { X: number })[]; haze: number }
const ROWS: Row[] = [0.14, 0.22, 0.34, 0.5].map((p, i) => {
  const towers: (Tower & { X: number })[] = [], seed = 300 + i * 17;
  // in the row's own space a tower at X is at screen W/2 + p·(g − X): cover g from the bridge to past the end
  const Xa = 2500, Xb = 4600 + 260 / p;
  const base = towerRow(seed, 120, [260, 760], [1500, 4800], [], { storey: STOREY, gap: [0, 1] });
  let X = Xa, n = 0;
  while (X < Xb && n < base.length) {
    const b = base[n++], k = (X - Xa) / (Xb - Xa), w = b.w * S * p;
    const tall = lerp(0.55, 1.25, k);
    if (hash(seed + n) < lerp(0.55, 0.02, k)) { X += w * 1.2; continue; }
    towers.push({ ...b, h: Math.round(b.h * tall), X });
    X += w + lerp(60, 2, k) * p * 3 * hash(n + seed);
  }
  return { p, towers, haze: lerp(0.75, 0.25, i / 3) };
});

/** Downtown's people: umbrellas out, a courier, a queue at the noodle bar, a drone checking papers. */
interface Who { X: number; c: Character }
export const PEOPLE: Who[] = [
  { X: 3200, c: { seed: 4171, look: { garb: 'coat', hair: 'hood', extras: ['umbrella'] }, x: 0, act: 'walk', range: [-100, 140], speed: 0.3 } },
  { X: 3330, c: { seed: 4172, look: { garb: 'suit', hair: 'short', extras: ['umbrella'] }, x: 0, act: 'walk', range: [-160, 60], speed: 0.4, facing: -1 } },
  { X: 3470, c: { seed: 4173, look: { garb: 'jacket', hair: 'beanie' }, x: 0, act: 'queue' } },
  { X: 3482, c: { seed: 4174, look: { body: 'old', garb: 'coat', hair: 'scarf' }, x: 0, act: 'queue' } },
  { X: 3494, c: { seed: 4176, look: { body: 'slim', garb: 'jacket', hair: 'cap', extras: ['phone'] }, x: 0, act: 'phone' } },
  { X: 3560, c: { look: 'drone', h: 40, x: 0, act: 'scan', range: [-80, 80], speed: 0.3 } },
  { X: 3700, c: { look: { bot: 'android' }, x: 0, act: 'walk', range: [-120, 120] } },
  { X: 3790, c: { seed: 4175, look: { garb: 'dress', hair: 'long', extras: ['umbrella'] }, x: 0, act: 'walk', range: [-80, 60], speed: 0.25 } },
  { X: 3905, c: { look: { bot: 'deliverybot' }, x: 0, act: 'roll', range: [-140, 140] } },
  { X: 4050, c: { seed: 9101, look: { body: 'avg', hair: 'beanie', garb: 'jacket', extras: ['bag'] }, x: 0, act: 'walk', range: [-40, 140], speed: 0.35 } },
  { X: 4160, c: { seed: 9102, look: { body: 'slim', hair: 'long', garb: 'coat', extras: ['umbrella'] }, x: 0, act: 'walk', range: [-60, 160], speed: 0.28, facing: -1 } },
  { X: 4250, c: { seed: 9103, look: { body: 'old', hair: 'brim', garb: 'coat', extras: [] }, x: 0, act: 'stand', facing: 1 } },
  { X: 4390, c: { seed: 9104, look: { body: 'tall', hair: 'short', garb: 'suit', extras: ['umbrella'] }, x: 0, act: 'walk', range: [-120, 80], speed: 0.4 } },
  { X: 4470, c: { look: { bot: 'sweeper' }, x: 0, act: 'sweep', range: [-60, 60] } },
];
export const LAMPS = [3180, 3330, 3480, 3640, 3800, 3950, 4110, 4270, 4430, 4590, 4750];

/** The skyline rows, far to near (drawn after the sea, before the coast). */
export function drawSkyline(x: CanvasRenderingContext2D, c: CoastView, lift: (p: number) => number) {
  // they come up behind the Galleria, after the bay (the Spire's stretch stays open)
  const k = smooth(2860, 3200, c.g);
  if (k <= 0) return;
  for (const row of ROWS) {
    const sc = S * row.p, base = R(c.hz + (c.GY - c.hz) * row.p * 0.9 + lift(row.p));
    for (const b of row.towers) {
      const s = c.W / 2 + row.p * (c.g - b.X);
      if (s > c.W + 4 || s + b.w * sc < -4) continue;
      x.save(); x.globalAlpha = k;
      placed(x, R(s), base, sc, () => drawTower(x, b, { t: c.f, still: c.still, fill: mixHex('#0c0710', '#1c1024', c.warm * (1 - c.city * 0.4)), edge: 0.14, lit: 0.1 + row.p * 0.12, glow: 0.45 + row.p * 0.4, below: 200, storey: STOREY, haze: row.haze * 0.55, hazeCol: mixHex('#1e1024', '#3a1c34', c.warm * (1 - c.city * 0.5)) }));
      x.restore();
    }
  }
}

/** The street's surface from the plaza's steps west, and the road from the truck gate: wet in the rain, the signs' colours in it. */
export function drawStreetGround(x: CanvasRenderingContext2D, c: CoastView, L: Lines) {
  const { GY } = c, bottom = c.H + 400;
  const sp = (X0: number, X1: number) => { const a = Math.max(viewportSpan(c)[0]-2, Math.floor(c.sx(X1))), b = Math.min(viewportSpan(c)[1]+2, Math.ceil(c.sx(X0))); return b > a ? [a, b] : null; };
  const st = sp(PLACES.street, 1e5);
  if (st) {
    const [a, b] = st, gr = x.createLinearGradient(0, GY, 0, c.H); gr.addColorStop(0, '#241a22'); gr.addColorStop(1, '#0e0a0e');
    x.fillStyle = gr; x.fillRect(a, GY, b - a, bottom - GY);
    x.fillStyle = 'rgba(255,217,165,.07)'; for (let X = PLACES.street; X < c.g + c.W; X += 9) { const s = c.sx(X); if (s > a && s < b) x.fillRect(R(s), GY, 1, L.ROAD0 - GY); }
    // the plaza's steps down to the street
    const s0 = c.sx(PLACES.street);
    if (strictlyVisiblePoint(c,s0,30)) for (let k = 0; k < 4; k++) { x.fillStyle = k % 2 ? '#3a2c3c' : '#2e2232'; x.fillRect(R(s0) - 6, GY + k * 3, 14, 3); x.fillStyle = 'rgba(255,217,165,.25)'; x.fillRect(R(s0) - 6, GY + k * 3, 14, 1); }
  }
  const rd = sp(PLACES.road, 1e5);
  if (rd) {
    const [a, b] = rd;
    x.fillStyle = '#151014'; x.fillRect(a, L.ROAD0, b - a, L.ROAD1 - L.ROAD0);
    x.fillStyle = 'rgba(255,217,165,.18)'; x.fillRect(a, L.ROAD0, b - a, 1);
    const mid = R((L.ROAD0 + L.ROAD1) / 2);
    x.fillStyle = 'rgba(255,217,165,' + (c.rain > 0 ? 0.45 : 0.35) + ')';
    for (let px = a; px < b; px++) if ((((px - c.g) % 14) + 14) % 14 < 6) x.fillRect(px, mid, 1, 1);
    if (c.rain > 0) { x.fillStyle = 'rgba(160,170,220,' + (0.08 * c.rain).toFixed(3) + ')'; x.fillRect(a, L.ROAD0 + 1, b - a, L.ROAD1 - L.ROAD0 - 1); }
    // the crossings at the side streets
    for (const X of SIDE_STREETS) { const s = c.sx(X); if (!visiblePoint(c,s,30,30)) continue; x.fillStyle = 'rgba(255,217,165,.22)'; for (let k = 0; k < 6; k++) x.fillRect(R(s) - 14 + k * 5, L.ROAD0 + 2, 3, L.ROAD1 - L.ROAD0 - 3); }
  }
  // the wet street: every sign's colour lying in it, broken up; the lamps' pools
  if (c.rain > 0 && st) {
    const [a, b] = st;
    for (const t of [...STREET, PORTAL_TOWER]) {
      const s0 = c.sx(t.X) - t.w * S;
      if (s0 > c.W + 20 || s0 + t.w * S < -20) continue;
      for (const g of signGlows(t)) {
        const gx = s0 + g.x * S, gw = Math.max(3, g.w * S * 0.6);
        if (gx < a - 20 || gx > b + 20) continue;
        for (let r = 0; r < 7; r++) { const py = GY + 2 + r * 4 + (r > 3 ? 6 : 0), wob = c.still ? 0 : Math.sin(c.t * 2 + r + gx) * 1.2; x.fillStyle = 'rgba(' + g.col + ',' + (0.2 * c.rain * g.a * (1 - r / 8)).toFixed(3) + ')'; x.fillRect(R(gx - gw / 2 + wob), R(py), R(gw * (1 - r * 0.07)), 1); }
      }
    }
  }
}

/** The street's row of towers and the side streets between them (the Ring and LINE 0 go in front). */
export function drawTownBack(x: CanvasRenderingContext2D, c: CoastView, L: Lines, only?: string) {
  const look = { t: c.f, still: c.still, fill: mixHex('#120a14', '#1e1222', c.warm * 0.5), edge: 0.35, lit: 0.14, glow: 0.8, below: 2, storey: STOREY };
  // the side streets: a lane going back between the towers, lit walls receding, a lamp at the corner
  for (const X of SIDE_STREETS) {
    if (only && only !== 'side-street-' + X) continue;
    const s = c.sx(X); if (!visiblePoint(c,s,40,40)) continue;
    const top = 0, g = x.createLinearGradient(0, top, 0, L.BACK); g.addColorStop(0, 'rgba(40,20,40,.6)'); g.addColorStop(1, 'rgba(80,40,50,.7)');
    x.fillStyle = '#08050a'; x.fillRect(R(s) - 26, top - 200, 52, L.BACK - top + 200);
    x.fillStyle = g; x.fillRect(R(s) - 10, top - 200, 20, L.BACK - top + 200);
    for (let k = 0; k < 14; k++) { const h = L.BACK - 6 - k * 9, on = hash(X + k) > 0.5; if (!on) continue; x.fillStyle = 'rgba(255,190,120,.45)'; x.fillRect(R(s) - 18 + (k % 2) * 30, h, 3, 3); }
    x.fillStyle = 'rgba(255,214,150,.35)'; x.fillRect(R(s) - 4, L.BACK - 22, 8, 2);
  }
  // the street's own row and the portal tower
  for (const b of [...STREET, PORTAL_TOWER]) {
    if (only && only !== 'tower-' + b.seed) continue;
    const tower = towerProperties(b,c.piece),s = c.sx(pn(c.piece,'worldX',b.X)) - tower.w * S;
    if(c.cull ? !visiblePoint(c,s,4,tower.w*S+4) : s > c.W + 4 || s + tower.w * S < -4) continue;
    placed(x, R(s), L.BACK, S, () => drawTower(x, tower, look));
  }
}

/** THE RING overhead: from its east end west, its columns on the street's back line, its traffic; its east end curving away inland. */
export function drawRingOver(x: CanvasRenderingContext2D, c: CoastView, L: Lines) {
  // THE RING overhead: from its east end west, columns on the street's back line, its traffic
  const o0 = c.sx(0), fx = (sxv: number) => (sxv - o0) / S;
  const a = fx(-60), bEnd = fx(c.sx(PLACES.ring)), b = Math.min(fx(c.W + 60), bEnd);
  const lights = true;
  if (b > a) {
    placed(x, R(o0), L.BACK, S, () => {
      drawRing(x, a, b, { t: c.f, still: c.still, fill: mixHex('#18121a', '#241a24', c.warm * 0.4), gantries: [-3900 / S], lamps: lights }, () => {
        x.save(); x.beginPath(); x.rect(a, -2000, b - a, 2000); x.clip();
        ringTraffic(x, a, b, c.f, c.still, true);
        x.restore();
      });
    });
  }
  // the Ring's east end: the deck curving away inland, smaller and hazier, behind the Galleria's dome
  const e = c.sx(PLACES.ring);
  if (e > -40 && e < c.W + 200) {
    for (let i = 1; i <= 7; i++) {
      const k = Math.pow(0.8, i), w = 40 * k, sx = e + i * 22 * Math.pow(0.86, i), under = L.BACK - (RING.under * S) - i * 6;
      x.fillStyle = mixHex('#18121a', '#3a2440', i / 8); x.fillRect(R(sx), R(under - 18 * k), R(w), R(18 * k));
      x.fillStyle = 'rgba(255,190,110,' + (0.4 * k).toFixed(2) + ')'; x.fillRect(R(sx), R(under), R(w), 1);
    }
  }
}

/** Downtown's street lamps, their light on the pavement. */
export function drawTownLamps(x: CanvasRenderingContext2D, c: CoastView, L: Lines, only?: number) {
  for (const X of LAMPS) {
    if (only !== undefined && only !== X) continue;
    const s = c.sx(pn(c.piece,"worldX",X));
    if (!visiblePoint(c,s,30)) continue;
    const top = L.BACK - pn(c.piece,"height",46);
    x.fillStyle = '#0e080c'; x.fillRect(R(s), top, 2, L.BACK - top); x.fillRect(R(s) - 7, top, 9, 2);
    x.fillStyle = 'rgba(255,220,160,.95)'; x.fillRect(R(s) - 7, top + 2, 5, 1);
    const gg = x.createRadialGradient(s - 4, top + 3, 1, s - 4, top + 3, 28); gg.addColorStop(0, 'rgba(255,210,150,.22)'); gg.addColorStop(1, 'rgba(255,210,150,0)'); x.fillStyle = gg; x.fillRect(s - 32, top - 24, 56, 56);
    x.fillStyle = 'rgba(255,210,150,.08)'; x.fillRect(R(s) - 14, L.BACK, 20, L.ROAD0 - L.BACK);
  }
}

/** Downtown's people on the pavement. */
export function drawTownPeople(x: CanvasRenderingContext2D, c: CoastView, L: Lines, only?: number) {
  for (const [index,w] of PEOPLE.entries()) {
    if (only !== undefined && only !== index) continue;
    const s = c.sx(pn(c.piece,"worldX",w.X));
    if (!visiblePoint(c,s,60)) continue;
    placed(x, R(s), L.MID, S, () => drawCharacter(x, frameView(c.f), pieceActor(w.c,c.piece)));
  }
}

export const townPieceIds = [...SIDE_STREETS.map(X=>'side-street-'+X), ...[...STREET,PORTAL_TOWER].map(b=>'tower-'+b.seed)];
export const townLampIds = LAMPS.map(X=>'lamp-'+X);
export const townPeopleIds = PEOPLE.map((_,i)=>'person-'+i);
export function townPieces(x:CanvasRenderingContext2D,c:CoastView,L:Lines,inputs:PieceInputs={}){return townPieceIds.map(id=>({id,draw:()=>{const p=inputs["town."+id];drawTownBack(x,p?{...c,piece:p.props,cull:p.cull}:c,L,id);}}));}
export function townLampPieces(x:CanvasRenderingContext2D,c:CoastView,L:Lines,inputs:PieceInputs={}){return LAMPS.map(X=>({id:"lamp-"+X,draw:()=>{const p=inputs["lamps.lamp-"+X];drawTownLamps(x,p?{...c,piece:p.props,cull:p.cull}:c,L,X);}}));}
export function townPeoplePieces(x:CanvasRenderingContext2D,c:CoastView,L:Lines,inputs:PieceInputs={}){return PEOPLE.map((_,i)=>({id:"person-"+i,draw:()=>{const p=inputs["people.person-"+i];drawTownPeople(x,p?{...c,piece:p.props,cull:p.cull}:c,L,i);}}));}

export function towerProperties(source:Tower,props:Properties|undefined):Tower {if(!props)return source;return {...source,w:pn(props,'width',source.w),h:pn(props,'height',source.h),seed:pn(props,'seed',source.seed),skin:ps(props,'skin',source.skin??'concrete') as Tower['skin'],grime:pn(props,'grime',source.grime??0),...(props.signs?{signs:props.signs as unknown as Tower['signs']}:{})};}
