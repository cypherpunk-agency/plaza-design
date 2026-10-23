/** Extracted artwork. Scene-owned layout, actors and visual inputs are supplied explicitly. */
import { type View } from "../core/view";
import type { Light } from "../../world/light";
import { drawGrade } from "../atmosphere/lighting";
import { box,C,exitDoor,O,onScreen,PAPER,rng,tell,text } from "../core/primitives";
import { ALARM, paperSign } from '../signage/kit';
import { drawPane,windowShaft } from "../environment/sky";
import { adScreen,camera,lotteryScreen,ticker,wallSign } from "../signage/screens";
import { fridge } from "./construction";
export interface ArtworkInputs { L: { width: number; spawn: number; ceil: number; window: { x: number; w: number; h0: number; h1: number; }; mirror: { x: number; h: number; }; vend: { x: number; w: number; h: number; }; fridge: { x: number; w: number; h: number; seed: number; doors: number; }; counter: { x: number; w: number; h: number; }; till: number; keeper: number; slab: number; storey: number; risers: number[]; };
lighting: Light; foregroundParallax?:number; labels?:{ticker?:string;limit?:string;vending?:string;cash?:string;counter?:string} }
export function createCornerShopArtwork(inputs: ArtworkInputs) {
const { L } = inputs;


/** The shop is on the street's east side: its window looks west (light.ts facing). */
const SHOP_FACING = 270;


const RAIN = (() => { const r = rng(73); return Array.from({ length: 24 }, () => [r() * 80, r() * 80, 0.5 + r()]); })();


/** Per upper room: boxes [x, w, h] on the floor, windows [x, lit], a bulb x. Laid out once, for 8 floors. */
const ROOMS = Array.from({ length: 8 }, (_, k) => {
  const r = rng(140 + k), boxes: number[][] = [], wins: number[][] = [];
  for (let bx = 70; bx < L.width - 60; bx += 18 + Math.round(r() * 60)) if (k === 0 || r() < 0.25) boxes.push([bx, 16 + Math.round(r() * 18), 10 + Math.round(r() * (k === 0 ? 30 : 14))]);
  for (let wx = 90 + Math.round(r() * 40); wx < L.width - 80; wx += 150 + Math.round(r() * 90)) wins.push([wx, r() < 0.35 ? 1 : 0]);
  return { boxes, wins, bulb: 160 + Math.round(r() * 540) };
});


/**
 * The building above the shop, in cutaway, for screens taller than the shop: a
 * stockroom, then flats, storey after storey up out of the view. Middle band:
 * dim walls, dim boxes, a few warm windows and bulbs, nothing cyan.
 */
function upstairsSlab(x:CanvasRenderingContext2D,v:View){if(v.gy<=L.ceil)return;box(x,v.sx(0),v.y(L.ceil+L.slab),v.sx(L.width)-v.sx(0),L.slab,'#0d0805');}
function upstairsRoom(x:CanvasRenderingContext2D,v:View,k:number){const {sx,y,t}=v,w0=sx(0),w1=sx(L.width),width=w1-w0,top=v.gy,h0=L.ceil+L.slab+k*(L.storey+L.slab);if(top<=L.ceil||h0>=top)return;
    const R = ROOMS[k], h1 = h0 + L.storey;
    x.fillStyle = k === 0 ? '#090604' : '#070403'; x.fillRect(w0, y(h1), width, L.storey);
    x.fillStyle = 'rgba(' + O + ',.05)'; for (let wx = 20; wx < L.width; wx += 60) x.fillRect(sx(wx), y(h1), 1, L.storey);
    for (const [wx, lit] of R.wins) {
      const s = sx(wx);
      if (!onScreen(v, s, 34)) continue;
      box(x, s, y(h0 + 56), 30, 34, lit ? 'rgba(255,170,90,.12)' : '#030201', 'rgba(194,65,12,.4)');
      x.fillStyle = 'rgba(194,65,12,.4)'; x.fillRect(s + 15, y(h0 + 56), 1, 34); x.fillRect(s - 2, y(h0 + 22), 34, 2);
      if (lit) { x.fillStyle = 'rgba(255,217,165,.08)'; x.fillRect(s + 2, y(h0 + 54), 6, 30); }
    }
    const bx = sx(R.bulb), by = y(h1 - 18), on = k === 0 || k % 3 === 2;
    x.strokeStyle = 'rgba(' + PAPER + ',.25)'; x.beginPath(); x.moveTo(bx + 0.5, y(h1)); x.lineTo(bx + 0.5, by); x.stroke();
    if (on) {
      const g = x.createRadialGradient(bx, by, 1, bx, by, 60);
      g.addColorStop(0, 'rgba(255,190,110,.1)'); g.addColorStop(1, 'rgba(255,190,110,0)');
      x.fillStyle = g; x.fillRect(bx - 60, y(h1), 120, L.storey);
    }
    x.fillStyle = on ? 'rgba(255,217,165,' + (0.55 + 0.05 * Math.sin(t * 0.03 + k)) + ')' : 'rgba(255,217,165,.15)'; x.fillRect(bx - 1, by, 3, 3);
    for (const [wx, w, h] of R.boxes) {
      box(x, sx(wx), y(h0 + h), w, h, k === 0 ? '#150c06' : '#0d0805', 'rgba(194,65,12,' + (k === 0 ? 0.45 : 0.3) + ')');
      if (k === 0 && h > 22) box(x, sx(wx) + 2, y(h0 + h + 14), w - 4, 14, '#120a05', 'rgba(194,65,12,.4)');
    }
    if (k === 0 && R.boxes[2]) { const [wx, w, h] = R.boxes[2]; text(x, 'NOODLES', sx(wx) + w / 2, y(h0 + h / 2), 'rgba(' + PAPER + ',.3)', 7, '600'); }
    box(x, w0, y(h1 + L.slab), width, L.slab, '#0d0805');
    x.fillStyle = 'rgba(194,65,12,.35)'; x.fillRect(w0, y(h1 + L.slab), width, 1);

}
function upstairsPipes(x:CanvasRenderingContext2D,v:View){const{sx,y}=v,w0=sx(0),width=sx(L.width)-w0,top=v.gy;if(top<=L.ceil)return;

  x.fillStyle = 'rgba(194,65,12,.4)'; for (let h = L.ceil + L.slab; h < top; h += L.storey + L.slab) x.fillRect(w0, y(h), width, 1);
  for (const p of L.risers) {
    const s = sx(p);
    x.fillStyle = 'rgba(201,138,63,.22)'; x.fillRect(s, 0, 3, y(L.ceil));
    x.fillStyle = 'rgba(201,138,63,.35)'; for (let h = L.ceil + L.slab + 20; h < top; h += L.storey + L.slab) x.fillRect(s - 1, y(h), 5, 2);
  }

}

/** The convex security mirror up in the corner: the shop, bent, in silver. */
function mirror(x: CanvasRenderingContext2D, v: View) {
  const cx = v.sx(L.mirror.x), cy = v.y(L.mirror.h), r = 11;
  if (!onScreen(v, cx - r - 10, r * 2 + 20)) return;
  x.fillStyle = '#2a1d14'; x.fillRect(cx - 14, cy - 1, 4, 2);
  x.save(); x.beginPath(); x.arc(cx, cy, r, 0, 7); x.clip();
  x.fillStyle = '#20242a'; x.fillRect(cx - r, cy - r, r * 2, r * 2);
  const cols = ['#d83a2a', '#e8c83a', '#5aa83a', '#f08a2a', '#c83a8a'];
  for (let i = 0; i < 9; i++) { x.fillStyle = cols[i % cols.length]; x.globalAlpha = 0.5; x.fillRect(cx - r + i * 2.5, cy + 2 - Math.abs(i - 4) * 0.8, 2, 6); }
  x.globalAlpha = 1;
  x.fillStyle = 'rgba(240,245,255,.5)'; x.fillRect(cx + 3, cy - 4, 2, 3); x.fillRect(cx - 4, cy - 2, 3, 6);
  x.fillStyle = 'rgba(255,255,255,.25)'; x.beginPath(); x.ellipse(cx - 4, cy - 5, 4, 2, -0.6, 0, 7); x.fill();
  x.restore();
  x.strokeStyle = 'rgba(210,210,220,.8)'; x.lineWidth = 2; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.stroke(); x.lineWidth = 1;
}
function piece_clear(x:CanvasRenderingContext2D,v:View,_index=0){

    x.fillStyle = '#020101'; x.fillRect(0, 0, v.viewW, v.viewH);

}
function piece_wall(x:CanvasRenderingContext2D,v:View,_index=0){
const {sx,y}=v;const w0=sx(0);const w1=sx(L.width);
    // middle band: the back wall (warmer, painted), wainscot and the ceiling
    box(x, w0, y(L.ceil), w1 - w0, L.ceil, '#120a07');
    x.fillStyle = 'rgba(' + O + ',.1)'; for (let wx = 0; wx < L.width; wx += 40) x.fillRect(sx(wx), y(L.ceil), 1, L.ceil - 30);
    box(x, w0, y(30), w1 - w0, 30, '#160c08'); x.fillStyle = 'rgba(' + O + ',.3)'; x.fillRect(w0, y(30), w1 - w0, 1);

}
function piece_wall_edges(x:CanvasRenderingContext2D,v:View,_index=0){
const {sx}=v;const {y}=v;const w0=sx(0);const w1=sx(L.width);
    x.fillStyle = 'rgba(' + O + ',.35)'; x.fillRect(w0, y(L.ceil), w1 - w0, 1);
    x.fillStyle = 'rgba(' + O + ',.7)'; x.fillRect(w0, 0, 1, v.gy); x.fillRect(w1 - 1, 0, 1, v.gy);


}
function piece_door(x:CanvasRenderingContext2D,v:View,_index=0){

    exitDoor(x, v, 32, '#0a0603');

}
function piece_mirror(x:CanvasRenderingContext2D,v:View,_index=0){

    mirror(x, v);


}
function piece_ticker(x:CanvasRenderingContext2D,v:View,_index=0){

    // the back wall's top band: the Registry's strip running over the shelves
    ticker(x, v, { x: 330, h: 136, w: 290, tall: 10, text: 'ID REQUIRED FOR ALL PURCHASES   ·   CASH TRANSACTIONS ARE LOGGED   ·   SHOPLIFTING IS REPORTED TO THE REGISTRY   ·   CURFEW 01:00', col: ALARM, speed: 0.4 });


}
function piece_limit(x:CanvasRenderingContext2D,v:View,_index=0){
const {sx,y,t}=v;
    // the shelf's limit: a printed label with the tell (it is something you can use)
    paperSign(x, t, sx(330), y(130), 52, 12, { lines: [inputs.labels?.limit ?? 'LIMIT 3'], tell: 0, tellAt: [22, 4] });


}
function piece_vending(x:CanvasRenderingContext2D,v:View,_index=0){
const {sx,y,t}=v;
    const M = L.vend, mx = sx(M.x);
    if (onScreen(v, mx - 20, M.w + 40)) {
      const g = x.createRadialGradient(mx + M.w / 2, y(50), 4, mx + M.w / 2, y(40), 70);
      g.addColorStop(0, 'rgba(0,255,255,.12)'); g.addColorStop(1, 'rgba(0,255,255,0)');
      x.fillStyle = g; x.fillRect(mx - 50, y(110), M.w + 100, 110);
      box(x, mx, y(M.h), M.w, M.h, '#0d1416', 'rgba(' + C + ',.7)');
      box(x, mx + 4, y(M.h - 4), M.w - 8, 42, '#04191b', 'rgba(' + C + ',.35)');
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { x.fillStyle = ['#d83a2a', '#e8c83a', '#5aa83a', '#f08a2a'][(r + c) % 4]; x.globalAlpha = 0.75; x.fillRect(mx + 7 + c * 7, y(M.h - 8) + r * 10, 4, 7); x.globalAlpha = 1; }
      box(x, mx + 4, y(30), M.w - 8, 10, '#020606', 'rgba(' + C + ',.35)');
      text(x, (inputs.labels?.vending??'THIRST'), mx + M.w / 2, y(25), 'rgba(' + C + ',' + (0.6 + 0.3 * Math.sin(t * 0.05)) + ')', 7, '600');
      x.fillStyle = '#020303'; x.fillRect(mx + 8, y(12), M.w - 16, 6);
    }

}
function piece_fridge(x:CanvasRenderingContext2D,v:View,_index=0){

    fridge(x, v, L.fridge);

}
function piece_advert(x:CanvasRenderingContext2D,v:View,_index=0){

    adScreen(x, v, { x: L.fridge.x + L.fridge.w / 2, h: 116, w: 96, tall: 26, mount: 'hang', to: L.ceil, ads: [['COLD DRINKS', 'VERIFIED RESIDENTS'], ['OXYGEN SURCHARGE', 'IN EFFECT'], ['WATER 2L', 'PER ID PER DAY']], period: 240 });


}
function piece_floor(x:CanvasRenderingContext2D,v:View,_index=0){
const {sx}=v;const w0=sx(0);const w1=sx(L.width);
    // the floor: worn tiles
    x.fillStyle = '#060403'; x.fillRect(w0, v.gy, w1 - w0, v.viewH - v.gy);
    x.fillStyle = 'rgba(' + O + ',.6)'; x.fillRect(w0, v.gy, w1 - w0, 1);
    for (let r = 0; r < 4; r++) for (let c = 0; c < L.width; c += 24) {
      if ((c / 24 + r) % 2) continue;
      const tx = sx(c) + r * 6;
      if (tx < w0 || tx > w1 - 20) continue;
      x.fillStyle = 'rgba(255,217,165,.04)'; x.fillRect(tx, v.gy + 3 + r * 12, 20, 10);
    }

}
function piece_reflection(x:CanvasRenderingContext2D,v:View,_index=0){
const {sx}=v;
    // the fridges' glow on the floor
    const fx = sx(L.fridge.x);
    x.fillStyle = 'rgba(220,235,255,.05)'; x.fillRect(fx, v.gy + 1, L.fridge.w, 10);

}
function piece_window_back(x:CanvasRenderingContext2D,v:View,_index=0){
const {sx,y}=v;
    // far band: the street through the window, people passing in the rain
    const W = L.window, wx = sx(W.x), top = y(W.h1), wh = W.h1 - W.h0;
    if (onScreen(v, wx, W.w)) {
      // the street outside at this hour (sets/sky.ts: the window looks west across Downtown's street)
      const lt = inputs.lighting;
      x.save(); x.beginPath(); x.rect(wx, top, W.w, wh); x.clip();
      drawPane(x, wx, top, W.w, wh, lt, { facing: SHOP_FACING, seed: 51, towers: [[0.07, 0.25, 0.22], [0.42, 0.35, 0.1], [0.82, 0.25, 0.32]], horizon: 0.5 });
      x.restore();
    }

}
function piece_window_front(x:CanvasRenderingContext2D,v:View,_index=0){
const {sx,y,t}=v;
    // far band: the street through the window, people passing in the rain
    const W = L.window, wx = sx(W.x), top = y(W.h1), wh = W.h1 - W.h0;
    if (onScreen(v, wx, W.w)) {
      const lt = inputs.lighting;
      x.save(); x.beginPath(); x.rect(wx, top, W.w, wh); x.clip();
      drawGrade(x, v, lt, true);
      x.strokeStyle = 'rgba(170,210,255,.25)';
      if ((lt.w?.rain ?? 0) > 0.05) for (const [rx, ry, sp] of RAIN) { const yy = (ry + t * sp * 2) % wh; x.beginPath(); x.moveTo(wx + rx, top + yy); x.lineTo(wx + rx - 1, top + yy + 4); x.stroke(); }
      x.restore();
      x.strokeStyle = 'rgba(' + O + ',.8)'; x.strokeRect(wx + 0.5, top + 0.5, W.w - 1, wh - 1);
      x.fillStyle = 'rgba(' + O + ',.8)'; x.fillRect(wx + W.w / 2, top, 1, wh);
      text(x, 'NEPO', wx + W.w / 2, top + wh - 10, 'rgba(255,136,0,.6)', 8, '600');
      box(x, wx + 22, top + wh - 30, W.w - 44, 11, 'rgba(255,217,165,.18)', 'rgba(' + PAPER + ',.4)');
      text(x, '24/7', wx + W.w / 2, top + wh - 24.5, 'rgba(' + PAPER + ',.85)', 7, '600');
      windowShaft(x, { l: wx, r: wx + W.w, t: top, b: y(W.h0) }, y(0), Math.min(v.viewH, y(0) + 16), lt, SHOP_FACING);
    }

}
function piece_lottery(x:CanvasRenderingContext2D,v:View,_index=0){
const {sx}=v;
    // the counter: lottery behind, the camera over the till, the keeper
    const K = L.counter, kx = sx(K.x);
    if (onScreen(v, kx - 60, K.w + 120)) {
      lotteryScreen(x, v, { x: K.x + 120, h: 76, w: 80, tall: 36, mount: 'wall' });
    }

}
function piece_cash_sign(x:CanvasRenderingContext2D,v:View,_index=0){
const {sx}=v;
    // the counter: lottery behind, the camera over the till, the keeper
    const K = L.counter, kx = sx(K.x);
    if (onScreen(v, kx - 60, K.w + 120)) {
      wallSign(x, v, { x: K.x + 60, h: 126, text: (inputs.labels?.cash??'CASH ONLY'), col: O, size: 8, phase: 90 });
    }

}
function piece_camera(x:CanvasRenderingContext2D,v:View,_index=0){
const {sx}=v;
    // the counter: lottery behind, the camera over the till, the keeper
    const K = L.counter, kx = sx(K.x);
    if (onScreen(v, kx - 60, K.w + 120)) {
      camera(x, v, { x: K.x + 14, h: 134, facing: 1, phase: 3 });
    }

}
function piece_counter(x:CanvasRenderingContext2D,v:View,_index=0){
const {sx,y}=v;
    // the counter: lottery behind, the camera over the till, the keeper
    const K = L.counter, kx = sx(K.x);
    if (onScreen(v, kx - 60, K.w + 120)) {
      box(x, kx, y(K.h), K.w, K.h, '#24130a', 'rgba(' + O + ',.85)');
      x.fillStyle = 'rgba(' + O + ',.9)'; x.fillRect(kx, y(K.h), K.w, 2);
    }

}
function piece_till(x:CanvasRenderingContext2D,v:View,_index=0){
const {sx,y,t}=v;
    // the counter: lottery behind, the camera over the till, the keeper
    const K = L.counter, kx = sx(K.x);
    if (onScreen(v, kx - 60, K.w + 120)) {
      // the till (paying is something you can do: a cyan edge), a jar of sweets, the plate
      box(x, kx + 18, y(K.h + 14), 26, 14, '#1a120b', 'rgba(' + C + ',.6)');
      x.fillStyle = 'rgba(' + C + ',.5)'; x.fillRect(kx + 21, y(K.h + 11), 14, 3);
      tell(x, t, kx + 40, y(K.h + 4), 1);
    }

}
function piece_sweets(x:CanvasRenderingContext2D,v:View,_index=0){
const {sx,y}=v;
    // the counter: lottery behind, the camera over the till, the keeper
    const K = L.counter, kx = sx(K.x);
    if (onScreen(v, kx - 60, K.w + 120)) {
      box(x, kx + 56, y(K.h + 12), 10, 12, 'rgba(200,210,220,.15)', 'rgba(220,220,230,.5)');
      for (let i = 0; i < 6; i++) { x.fillStyle = ['#d83a2a', '#e8c83a', '#5aa83a'][i % 3]; x.fillRect(kx + 58 + (i % 3) * 2, y(K.h + 4 + Math.floor(i / 3) * 3), 2, 2); }
    }

}
function piece_counter_label(x:CanvasRenderingContext2D,v:View,_index=0){
const {sx,y}=v;
    // the counter: lottery behind, the camera over the till, the keeper
    const K = L.counter, kx = sx(K.x);
    if (onScreen(v, kx - 60, K.w + 120)) {
      paperSign(x, v.t, kx + 136, y(K.h - 6), 48, 14, { lines: [inputs.labels?.counter ?? 'NO LOGS'], edge: 'rgba(' + O + ',.6)', ink: 'rgba(' + PAPER + ',.85)' });
    }

}
function piece_stickers(x:CanvasRenderingContext2D,v:View,_index=0){
const {sx,y}=v;
    // the counter: lottery behind, the camera over the till, the keeper
    const K = L.counter, kx = sx(K.x);
    if (onScreen(v, kx - 60, K.w + 120)) {
      // stickers on the counter front, faded
      x.fillStyle = 'rgba(232,200,58,.35)'; x.fillRect(kx + 80, y(K.h - 8), 8, 6);
      x.fillStyle = 'rgba(216,58,42,.35)'; x.fillRect(kx + 92, y(K.h - 12), 6, 6);
    }

}
function drawFront(x: CanvasRenderingContext2D, v: View) {
    // a near rack of crisps at the bottom of the view, every bag a different colour
    const s = v.sx(250, inputs.foregroundParallax??1.25), base = v.gy + 56;
    if (!onScreen(v, s, 90)) return;
    box(x, s, base - 34, 90, 34, '#020100', 'rgba(' + O + ',.3)');
    const cols = ['#d83a2a', '#e8c83a', '#5aa83a', '#f08a2a', '#3a6ad8', '#c83a8a'];
    for (let i = 6, k = 0; i < 84; i += 14, k++) { x.fillStyle = cols[k % cols.length]; x.globalAlpha = 0.32; x.fillRect(s + i, base - 30, 10, 12); x.globalAlpha = 1; }
  }
return { upstairsSlab, upstairsRoom, upstairsPipes, drawFront, clear:piece_clear, wall:piece_wall, wall_edges:piece_wall_edges, window_back:piece_window_back, window_front:piece_window_front, door:piece_door, mirror:piece_mirror, ticker:piece_ticker, limit:piece_limit, vending:piece_vending, fridge:piece_fridge, advert:piece_advert, lottery:piece_lottery, cash_sign:piece_cash_sign, camera:piece_camera, counter:piece_counter, till:piece_till, sweets:piece_sweets, counter_label:piece_counter_label, stickers:piece_stickers, floor:piece_floor, reflection:piece_reflection };
}
