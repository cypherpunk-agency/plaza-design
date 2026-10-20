/** Pure Galleria architectural and shop kernels. Scene adapters prepare heights, riders and light. */
import type { PreparedCharacter } from '../../runtime/characters';
import { box,C,exitDoor,GREEN,notice,O,onScreen,PAPER,RED,reflect,rng,sign,tell,text } from '../core/primitives';
import type { View } from '../core/view';
import { drawPane,glass } from '../environment/sky';
import { menuBoard,ticker,wallSign,YELLOW } from '../signage/screens';
import { booth,shelf,type ShelfSpec,type StallSpec } from './construction';
import type { MallVisual } from './mall-state';
interface Shop{id:string;x:number;w:number;sign:string;col:string;tint:string;keeper:string;back?:(x:CanvasRenderingContext2D,v:View,s0:number,w:number)=>void;counter?:(x:CanvasRenderingContext2D,v:View,s0:number,w:number)=>void;plate?:string}
export interface MallLayout{width:number;ceil:number;fascia:number;slab:number;rail:number;far0:number;step:number;storey:number;escalator:{x:number;h:number;w:number}}
export interface MallArtworkInputs{x:number;width:number;shop:string;sign:string;tint:string;col:string;label:string;visual:MallVisual;vendorPose?:PreparedCharacter}
export function createMallArtwork(inputs:MallArtworkInputs){const L=inputs.visual.layout,FAR=.55;const farLevels=(_v:View)=>inputs.visual.levels;
const PAWN_SHELF: ShelfSpec = { x: 466, w: 70, h: 84, rows: 3, seed: 81, stock: 'household' };

const SHOPS: Shop[] = [
  { id: 'implants', x: 170, w: 180, sign: 'VANTA IMPLANTS', col: PAPER, tint: '230,235,255', keeper: "implantClerk", plate: 'FINANCE AVAILABLE',
    back: (x, v, s0) => {
      const { y, t } = v;
      for (let k = 0; k < 3; k++) {
        const cx = s0 + 14 + k * 44;
        box(x, cx, y(96), 34, 40, 'rgba(220,235,255,.1)', 'rgba(220,230,240,.5)');
        x.fillStyle = 'rgba(240,248,255,.6)'; x.fillRect(cx + 2, y(95), 30, 1);
        if (k === 0) { for (let j = 0; j < 2; j++) { x.fillStyle = '#e8e4dc'; x.beginPath(); x.arc(cx + 10 + j * 14, y(76), 5, 0, 7); x.fill(); x.fillStyle = j ? '#c86a2a' : '#5a8a3a'; x.fillRect(cx + 8 + j * 14, y(78), 4, 4); } }
        else if (k === 1) { box(x, cx + 8, y(90), 18, 30, '#8e949e', 'rgba(220,220,230,.6)'); x.fillStyle = '#ffb030'; x.fillRect(cx + 16, y(80), 2, 2); }
        else { for (let j = 0; j < 4; j++) { x.fillStyle = (Math.floor(t / 20) + j) % 4 ? 'rgba(255,190,110,.8)' : 'rgba(255,190,110,.2)'; x.fillRect(cx + 6 + j * 6, y(74), 3, 8); } }
        box(x, cx - 2, y(56), 38, 4, '#2a2622', 'rgba(220,200,160,.5)');
      }
    },
    counter: (x, v, s0) => { box(x, s0 + 20, v.y(34), 30, 8, 'rgba(220,235,255,.18)', 'rgba(220,230,240,.6)'); x.fillStyle = '#e8e4dc'; x.fillRect(s0 + 28, v.y(30), 6, 3); } },
  { id: 'pawn', x: 450, w: 180, sign: 'PAWN · MEMORY', col: YELLOW, tint: '255,200,120', keeper: "pawnbroker", plate: 'PRICE PER MEGABYTE',
    back: (x, v, s0) => {
      const { y, t } = v;
      shelf(x,v,{...PAWN_SHELF,x:inputs.x+16});
      // the memory chair: a helmet on an arm, a meter counting megabytes
      const hx = s0 + 112;
      box(x, hx, y(40), 22, 6, '#3a2a2a', 'rgba(220,200,160,.5)'); box(x, hx + 16, y(64), 6, 24, '#3a2a2a', 'rgba(220,200,160,.5)');
      x.strokeStyle = 'rgba(220,200,160,.6)'; x.beginPath(); x.moveTo(hx + 19, y(64)); x.lineTo(hx + 8, y(78)); x.stroke();
      x.fillStyle = '#8e949e'; x.beginPath(); x.arc(hx + 6, y(74), 7, Math.PI, 0); x.fill();
      x.strokeStyle = 'rgba(' + YELLOW + ',.5)'; x.beginPath(); x.moveTo(hx + 6, y(74)); x.quadraticCurveTo(hx + 30, y(96), hx + 44, y(88)); x.stroke();
      box(x, hx + 36, y(98), 26, 16, '#050303', 'rgba(' + O + ',.55)');
      text(x, String(100 + (Math.floor(t / 8) % 900)), hx + 49, y(93), 'rgba(' + YELLOW + ',.95)', 7, '600');
      text(x, 'MB', hx + 49, y(86), 'rgba(' + PAPER + ',.6)', 7, '600');
      // a guitar on the wall, nobody's anymore
      x.fillStyle = '#8a5a2a'; x.beginPath(); x.ellipse(s0 + 96, y(58), 6, 8, 0, 0, 7); x.fill(); x.fillRect(s0 + 95, y(92), 2, 30);
    },
    counter: (x, v, s0) => { x.fillStyle = 'rgba(232,222,196,.8)'; x.fillRect(s0 + 24, v.y(28), 10, 2); box(x, s0 + 40, v.y(34), 14, 8, '#3a3a2a', 'rgba(220,200,160,.5)'); } },
  { id: 'florist', x: 1220, w: 180, sign: 'FLORIST', col: PAPER, tint: '210,240,190', keeper: "florist", plate: 'DO NOT TOUCH',
    back: (x, v, s0) => {
      const { y, t } = v, r = rng(17);
      for (let k = 0; k < 9; k++) {
        const px = s0 + 10 + k * 18, ph = k % 3 === 0 ? 84 : k % 3 === 1 ? 56 : 30, sway = Math.sin(t * 0.02 + k) * 1;
        box(x, px, y(ph), 12, 8, ['#8a4a2a', '#5a3a2a', '#c8b8a0'][k % 3], 'rgba(220,200,160,.4)');
        for (let j = -2; j <= 2; j++) { x.fillStyle = ['#4e7a3a', '#3e6a2e', '#6a8a3a'][(j + 5 + k) % 3]; x.beginPath(); x.ellipse(px + 6 + j * 3 + sway, y(ph + 8 + 6 - Math.abs(j) * 2), 2.5, 6, j * 0.4, 0, 7); x.fill(); }
        if (r() < 0.5) { x.fillStyle = ['#e85a6a', '#e8c83a', '#e8e0d0'][k % 3]; x.fillRect(px + 4, y(ph + 20), 3, 3); }
      }
      x.fillStyle = 'rgba(' + O + ',.5)'; x.fillRect(s0 + 6, y(84), 168, 1); x.fillRect(s0 + 6, y(56), 168, 1);
    },
    counter: (x, v, s0) => { box(x, s0 + 20, v.y(32), 14, 6, '#e8dcc0'); x.fillStyle = '#4e7a3a'; x.fillRect(s0 + 24, v.y(36), 5, 4); } },
  { id: 'keys', x: 1540, w: 150, sign: 'KEYS CUT', col: O, tint: '255,190,110', keeper: "keyCutter", plate: 'REGISTERED ONLY',
    back: (x, v, s0) => {
      const { y } = v;
      box(x, s0 + 8, y(100), 90, 60, '#2a1d14', 'rgba(220,200,160,.4)');
      for (let r = 0; r < 6; r++) for (let c = 0; c < 10; c++) {
        x.fillStyle = (r + c) % 3 ? 'rgba(214,170,60,.85)' : 'rgba(190,190,200,.8)';
        if ((r * 7 + c) % 4 === 0) { x.fillRect(s0 + 14 + c * 8, y(96 - r * 9), 5, 3); } else { x.fillRect(s0 + 15 + c * 8, y(96 - r * 9), 2, 6); x.fillRect(s0 + 14 + c * 8, y(96 - r * 9), 4, 2); }
      }
    },
    counter: (x, v, s0) => {
      const { y, t } = v;
      box(x, s0 + 18, y(40), 24, 14, '#4a4a50', 'rgba(220,220,230,.6)'); x.fillStyle = '#8e949e'; x.beginPath(); x.arc(s0 + 30, y(36), 5, 0, 7); x.fill();
      if (Math.floor(t / 6) % 5 < 2) for (let i = 0; i < 4; i++) { x.fillStyle = 'rgba(255,200,90,.9)'; x.fillRect(s0 + 34 + ((t * 3 + i * 7) % 12), y(34) - ((i * 5 + t) % 8), 1, 1); }
    } },
  { id: 'noodles', x: 1830, w: 140, sign: 'NOODLES', col: O, tint: '255,190,110', keeper: "cook-0",
    back: (x, v) => menuBoard(x, v, { x: inputs.x+100, h: 54, w: 76, tall: 42, title: 'NOODLES', items: [['NO. 4', '1T'], ['NO. 5', '1T'], ['NO. 6', '1T']], phase: 10 }),
    counter: (x, v, s0) => steam(x, v, s0 + 24, v.y(30)) },
  { id: 'burger', x: 1980, w: 140, sign: 'VAT BURGER', col: RED, tint: '255,170,120', keeper: "cook-1",
    back: (x, v) => menuBoard(x, v, { x: inputs.x+100, h: 54, w: 76, tall: 42, title: 'VAT', items: [['SINGLE', '1T'], ['DOUBLE', '2T'], ['FRIES', '1T']], col: RED, phase: 90 }),
    counter: (x, v, s0) => { box(x, s0 + 18, v.y(34), 30, 8, '#3a3634', 'rgba(220,200,180,.5)'); x.fillStyle = 'rgba(255,120,40,.6)'; x.fillRect(s0 + 20, v.y(34), 26, 2); } },
  { id: 'dumplings', x: 2130, w: 140, sign: 'DUMPLINGS', col: YELLOW, tint: '255,210,140', keeper: "cook-2",
    back: (x, v) => menuBoard(x, v, { x: inputs.x+100, h: 54, w: 76, tall: 42, title: 'STEAMED', items: [['SIX', '1T'], ['TWELVE', '2T'], ['TEA', '1T']], phase: 170 }),
    counter: (x, v, s0) => { for (let i = 0; i < 2; i++) box(x, s0 + 18, v.y(32 + i * 6), 22, 6, '#a8824a', 'rgba(60,40,20,.6)'); steam(x, v, s0 + 22, v.y(42)); } },
];

const SHOP = Object.fromEntries(SHOPS.map((s) => [s.id, s])) as Record<string, Shop>;


const DECK: StallSpec = { x: 1080, w: 100, seed: 61, sign: 'DECK REPAIR', col: O, awning: 'tin', light: 'tube', vendor: undefined,
  back: (x, v, p) => { for (let i = 0; i < 3; i++) { box(x, v.sx(p.x + 8 + i * 28), v.y(p.h1 - 6), 22, 16, '#050303', 'rgba(' + O + ',.5)'); x.fillStyle = 'rgba(' + GREEN + ',.6)'; for (let r = 0; r < 3; r++) x.fillRect(v.sx(p.x + 10 + i * 28), v.y(p.h1 - 9) + r * 4, 6 + ((r + i + Math.floor(v.t / 40)) % 3) * 4, 1); } } };

const CASES: StallSpec = { x: 1434, w: 68, seed: 62, sign: 'CASES', col: PAPER, awning: 'none', light: 'tube', vendor: undefined, note: ['NO', 'REFUNDS'] };



const FAR_SHOPS=['PHARMACY','OPTICIAN','SHOES','TELECOM','NEOBANK','TAILOR','CREDIT ADVICE','JEWELLER','TOYS','INSURANCE','TO LET','BEAUTY','SPORT','ELECTRONICS'];const SHOP_W=118;const DROPS=(()=>{const r=rng(83);return Array.from({length:40},(_,i)=>[i%2?1:-1,r()]);})();
function steam(x:CanvasRenderingContext2D,v:View,sx:number,sy:number){
  for (let i = 0; i < 3; i++) {
    const ph = v.t * 0.04 + i * 2 + sx; x.strokeStyle = 'rgba(255,255,255,' + (0.1 + 0.05 * Math.sin(ph)) + ')'; x.beginPath();
    for (let j = 0; j < 14; j++) { const yy = sy - j * 1.6, xx = sx + i * 5 + Math.sin(ph + j * 0.35) * 2.5; j ? x.lineTo(xx, yy) : x.moveTo(xx, yy); }
    x.stroke();
  }
}
function far_shell(x:CanvasRenderingContext2D,v:View){  const { y } = v, levels = farLevels(v), roofH = levels[levels.length - 1] + L.storey + 18;
  const sky = y(roofH);
  if (sky > 0) {
    // the sky of the moment through the skylight (sets/sky.ts): looking up, so only its upper part
    drawPane(x, 0, 0, v.viewW, sky, inputs.visual.light, { facing: 180, seed: 61, towers: false, horizon: 1.8 });
    const glow = x.createLinearGradient(0, 0, 0, sky);
    glow.addColorStop(0, 'rgba(194,65,12,.03)'); glow.addColorStop(1, 'rgba(194,65,12,.09)');
    x.fillStyle = glow; x.fillRect(0, 0, v.viewW, sky);
    x.strokeStyle = 'rgba(' + O + ',.15)';
    for (let wx = 0; wx < 2800; wx += 40) { const s = v.sx(wx, 0.4); if (s < -2 || s > v.viewW + 2) continue; x.beginPath(); x.moveTo(s + 0.5, 0); x.lineTo(s + 0.5, sky); x.stroke(); }
    x.fillStyle = '#0d0907'; x.fillRect(0, sky - 14, v.viewW, 14);
    x.strokeStyle = 'rgba(' + O + ',.22)'; x.strokeRect(-1, sky - 13.5, v.viewW + 2, 13);
    x.beginPath(); for (let wx = 0; wx < 2800; wx += 20) { const s = v.sx(wx, 0.4); if (s < -20 || s > v.viewW) continue; x.moveTo(s, sky - 1); x.lineTo(s + 10, sky - 13); x.lineTo(s + 20, sky - 1); } x.stroke();
  }
  x.fillStyle = '#0a0706'; x.fillRect(0, Math.max(0, sky), v.viewW, y(L.slab) - Math.max(0, sky));
  // daylight from the skylight, falling into the atrium (none at night: the shops' lights then)
  const lt = inputs.visual.light, [gc, ga] = glass(lt);
  if (ga > 0.02 && sky > -400) {
    const dl = x.createLinearGradient(0, Math.max(0, sky), 0, v.gy);
    dl.addColorStop(0, 'rgba(' + gc + ',' + (ga * 0.5).toFixed(3) + ')'); dl.addColorStop(1, 'rgba(' + gc + ',0)');
    x.fillStyle = dl; x.fillRect(0, Math.max(0, sky), v.viewW, v.gy - Math.max(0, sky));
  }

}
function far_shops(x:CanvasRenderingContext2D,v:View){const {y}=v,levels=inputs.visual.levels;
  levels.forEach((lv, li) => {
    for (let i = 0; i < 26; i++) {
      const s = v.sx(i * (SHOP_W + 6) - 40, FAR);
      if (!onScreen(v, s, SHOP_W)) continue;
      const name = FAR_SHOPS[(i + li * 5) % FAR_SHOPS.length], lit = name !== 'TO LET' && (i * 7 + li * 3) % 6 !== 0, top = y(lv + L.storey - 8);
      box(x, s, top, SHOP_W, L.storey - 8, lit ? '#140d08' : '#070504', 'rgba(' + O + ',.22)');
      if (lit) { x.fillStyle = 'rgba(255,190,110,.08)'; x.fillRect(s + 2, top + 12, SHOP_W - 4, L.storey - 22); }
      x.fillStyle = 'rgba(' + O + ',.18)'; for (let m = 30; m < SHOP_W; m += 30) x.fillRect(s + m, top + 12, 1, L.storey - 20);
      box(x, s + 10, top + 2, SHOP_W - 20, 9, '#0c0806');
      text(x, lit ? name : name === 'TO LET' ? 'TO LET' : 'CLOSED', s + SHOP_W / 2, top + 6.5, 'rgba(' + PAPER + ',' + (lit ? 0.42 : 0.18) + ')', 7);
    }
    x.fillStyle = '#120b07'; x.fillRect(0, y(lv), v.viewW, 8);
    x.fillStyle = 'rgba(' + O + ',.3)'; x.fillRect(0, y(lv), v.viewW, 1);
  });

}
function far_rails(x:CanvasRenderingContext2D,v:View){const {y}=v,levels=inputs.visual.levels;
  levels.forEach((lv) => { x.fillStyle = 'rgba(170,210,255,.04)'; x.fillRect(0, y(lv + 20), v.viewW, 12); x.fillStyle = 'rgba(' + O + ',.25)'; x.fillRect(0, y(lv + 20), v.viewW, 1); });

}
function gallery_back(x:CanvasRenderingContext2D,v:View){x.fillStyle='#0f0906';x.fillRect(0,v.y(L.slab+40),v.viewW,40);
}
function gallery_front(x:CanvasRenderingContext2D,v:View){const {sx,y}=v;
    x.fillStyle = 'rgba(170,210,255,.05)'; x.fillRect(0, y(L.rail), v.viewW, L.rail - L.slab);
    x.fillStyle = 'rgba(' + O + ',.4)'; x.fillRect(0, y(L.rail), v.viewW, 1);
    x.fillStyle = 'rgba(' + O + ',.2)'; for (let wx = 0; wx < L.width + 400; wx += 60) { const s = sx(wx); if (s > -2 && s < v.viewW + 2) x.fillRect(s, y(L.rail), 1, L.rail - L.slab); }
    box(x, -2, y(L.slab), v.viewW + 4, L.slab - L.fascia, '#160d08', 'rgba(' + O + ',.6)');
    for (let wx = 40; wx < L.width; wx += 160) { const s = sx(wx); if (!onScreen(v, s - 6, 12)) continue; x.fillStyle = 'rgba(255,230,190,.8)'; x.fillRect(s - 4, y(L.fascia) - 1, 8, 2); }
    ticker(x, v, { x: 960, h: L.slab + 2, w: 300, tall: 10, mount: 'wall', col: YELLOW, speed: 0.45,
      text: 'ANNOUNCEMENT · THE GALLERIA CLOSES AT 01:00 · UNVERIFIED VISITORS PROCEED TO EXIT B · LOST CHILDREN ARE HELD AT SECURITY DESK 2 · LOITERING IS MONITORED · MEMBER PRICES REQUIRE IDENTITY VERIFICATION' });


}
function ground_wall(x:CanvasRenderingContext2D,v:View){const {sx,y}=v;
    x.fillStyle = '#110a06'; x.fillRect(0, y(L.fascia), v.viewW, L.fascia);
    x.fillStyle = 'rgba(' + O + ',.07)'; for (let wx = 0; wx < L.width; wx += 40) { const s = sx(wx); if (s > -2 && s < v.viewW) x.fillRect(s, y(L.fascia), 1, L.fascia - 20); }
    box(x, -2, y(20), v.viewW + 4, 20, '#160c08'); x.fillStyle = 'rgba(' + O + ',.3)'; x.fillRect(0, y(20), v.viewW, 1);
    x.fillStyle = 'rgba(' + O + ',.4)'; x.fillRect(0, y(L.fascia), v.viewW, 1);


}
function metro_door(x:CanvasRenderingContext2D,v:View){const{sx,y,t}=v;
    exitDoor(x, v, inputs.x, '#0a0603', '< METRO');
    box(x, sx(inputs.x) - 1, y(L.fascia), 3, L.fascia - 96, '#2a160a');
    sign(x, t, 'EXIT', sx(inputs.x), y(92), GREEN, { size: 8, phase: 60 });

}
function directory(x:CanvasRenderingContext2D,v:View){const{sx,y,t}=v;
    const kx = sx(inputs.x);
    if (onScreen(v, kx - 30, 60)) { box(x, kx - 1, y(44), 3, 44, '#2a160a'); notice(x, t, kx, y(76), 54, 30, ['YOU ARE', 'HERE']); }


}
function shop_interior(x:CanvasRenderingContext2D,v:View){const s={...SHOP[inputs.shop],x:inputs.x,w:inputs.width,sign:inputs.sign||SHOP[inputs.shop].sign,tint:inputs.tint||SHOP[inputs.shop].tint,col:inputs.col||SHOP[inputs.shop].col},s0=Math.round(v.sx(s.x)),w=s.w,{y}=v;if(!onScreen(v,s0-10,w+20))return;
  // the interior, lit
  box(x, s0, y(L.ceil), w, L.ceil, '#1c120c');
  const g = x.createLinearGradient(0, y(L.ceil), 0, y(0));
  g.addColorStop(0, 'rgba(' + s.tint + ',.2)'); g.addColorStop(1, 'rgba(' + s.tint + ',.05)');
  x.fillStyle = g; x.fillRect(s0, y(L.ceil), w, L.ceil);
  x.fillStyle = 'rgba(' + s.tint + ',.85)'; x.fillRect(s0 + 10, y(L.ceil - 2), w - 20, 2);

}
function shop_stock(x:CanvasRenderingContext2D,v:View){const s={...SHOP[inputs.shop],x:inputs.x,w:inputs.width,sign:inputs.sign||SHOP[inputs.shop].sign,tint:inputs.tint||SHOP[inputs.shop].tint,col:inputs.col||SHOP[inputs.shop].col},s0=Math.round(v.sx(s.x)),w=s.w;if(!onScreen(v,s0-10,w+20))return;
s.back?.(x,v,s0,w);
}
function shop_front(x:CanvasRenderingContext2D,v:View){const s={...SHOP[inputs.shop],x:inputs.x,w:inputs.width,sign:inputs.sign||SHOP[inputs.shop].sign,tint:inputs.tint||SHOP[inputs.shop].tint,col:inputs.col||SHOP[inputs.shop].col},s0=Math.round(v.sx(s.x)),w=s.w,{y}=v;if(!onScreen(v,s0-10,w+20))return;
  // the counter across the shop's front half
  const cl = s0 + Math.round(w * 0.35), cw = Math.round(w * 0.6);
  box(x, cl, y(28), cw, 28, '#2a1a10', 'rgba(' + O + ',.85)');
  x.fillStyle = 'rgba(' + s.tint + ',.6)'; x.fillRect(cl, y(28), cw, 2);
  s.counter?.(x, v, cl, cw);
  if (s.plate) { box(x, cl + 6, y(20), Math.min(cw - 12, s.plate.length * 4.6 + 8), 10, '#e0d4b8', 'rgba(40,30,20,.8)'); text(x, s.plate, cl + 6 + Math.min(cw - 12, s.plate.length * 4.6 + 8) / 2, y(15), 'rgba(30,18,8,.95)', 7, '700'); }
  // the rolled-up shutter, the jambs, the glow on the floor
  box(x, s0, y(L.ceil), w, 6, '#2a2420', 'rgba(220,200,160,.4)');
  box(x, s0 - 4, y(L.fascia), 6, L.fascia, '#1e140c', 'rgba(' + O + ',.6)'); box(x, s0 + w - 2, y(L.fascia), 6, L.fascia, '#1e140c', 'rgba(' + O + ',.6)');
  wallSign(x, v, { x: s.x + w / 2, h: L.ceil + 9, text: s.sign, col: s.col, size: 8, phase: s.x });
  reflect(x, v, s0 + w / 2, s.tint, 0.9, Math.round(w * 0.6));

}
function food_sign(x:CanvasRenderingContext2D,v:View){wallSign(x,v,{x:inputs.x,h:L.slab+22,text:'FOOD COURT',col:O,size:9,phase:300});
}
function door(x:CanvasRenderingContext2D,v:View){exitDoor(x,v,inputs.x,'#0a0603',inputs.label);
}
function pillar(x:CanvasRenderingContext2D,v:View){const s=v.sx(inputs.x),y=v.y;if(!onScreen(v,s-20,40))return;box(x,s-14,y(L.slab),28,L.slab,'#1a0f09','rgba('+O+',.8)');box(x,s-18,y(14),36,14,'#22130b','rgba('+O+',.8)');
}
function registry(x:CanvasRenderingContext2D,v:View){
  const { y, t } = v, kx = v.sx(inputs.x);
  if (!onScreen(v, kx - 40, 80)) return;
  const g = x.createRadialGradient(kx, y(60), 3, kx, y(50), 60);
  g.addColorStop(0, 'rgba(220,235,255,.12)'); g.addColorStop(1, 'rgba(220,235,255,0)');
  x.fillStyle = g; x.fillRect(kx - 60, y(120), 120, 120);
  box(x, kx - 16, y(84), 32, 84, '#c8c4bc', 'rgba(255,255,255,.7)');
  box(x, kx - 12, y(78), 24, 28, '#04191b', 'rgba(' + C + ',.7)');
  // a face outline, and a scan line running over it
  x.strokeStyle = 'rgba(' + C + ',.6)'; x.beginPath(); x.ellipse(kx, y(65), 6, 8, 0, 0, 7); x.stroke();
  x.fillStyle = 'rgba(' + C + ',.8)'; x.fillRect(kx - 10, y(77) + ((t * 0.5) % 24), 20, 1);
  x.fillStyle = 'rgba(' + RED + ',' + (Math.floor(t / 25) % 2 ? 0.9 : 0.3) + ')'; x.fillRect(kx - 2, y(82), 4, 2);
  tell(x, t, kx + 9, y(46));
  box(x, kx - 8, y(42), 16, 4, '#202024');
  // the seal and the header plate over it
  box(x, kx - 48, y(112), 96, 22, '#e8e4dc', 'rgba(40,30,20,.9)');
  text(x, 'VERIFY YOUR IDENTITY', kx, y(106), 'rgba(110,20,20,.95)', 7, '700');
  text(x, 'FOR MEMBER PRICES', kx, y(97), 'rgba(30,18,8,.95)', 7, '700');
  x.fillStyle = '#2a2622'; x.fillRect(kx - 1, y(90), 2, 6);

}
function escalator_back(x:CanvasRenderingContext2D,v:View){const E={x:inputs.x,w:inputs.width},{y,t}=v,a=v.sx(E.x),b=v.sx(E.x+E.w);if(b< -20||a>v.viewW+20)return;const y0=y(0),y1=y(L.slab);
  // the side panel (dark), the steps' line, the riders, the glass balustrade and the handrail
  x.fillStyle = '#1a100a'; x.beginPath(); x.moveTo(a - 10, y0); x.lineTo(b, y1 + 14); x.lineTo(b, y1 + 30); x.lineTo(a + 20, y0); x.closePath(); x.fill();
  x.strokeStyle = 'rgba(' + O + ',.7)'; x.stroke();
  x.fillStyle = 'rgba(' + O + ',.35)';
  for (let k = 0; k < 16; k++) { const f = ((k + t * 0.012) % 16) / 16; x.fillRect(Math.round(a + (b - a) * f), Math.round(y0 + (y1 - y0) * f) - 1, 6, 1); }

}
function escalator_front(x:CanvasRenderingContext2D,v:View){const E={x:inputs.x,w:inputs.width},{y}=v,a=v.sx(E.x),b=v.sx(E.x+E.w);if(b< -20||a>v.viewW+20)return;const y0=y(0),y1=y(L.slab);
  x.fillStyle = 'rgba(170,210,255,.07)'; x.beginPath(); x.moveTo(a, y0 - 2); x.lineTo(b, y1 - 2); x.lineTo(b, y1 - 20); x.lineTo(a, y0 - 20); x.closePath(); x.fill();
  x.strokeStyle = 'rgba(30,20,14,1)'; x.lineWidth = 3; x.beginPath(); x.moveTo(a - 4, y0 - 20); x.lineTo(b, y1 - 20); x.stroke(); x.lineWidth = 1;
  x.strokeStyle = 'rgba(' + O + ',.55)'; x.beginPath(); x.moveTo(a - 4, y0 - 21.5); x.lineTo(b, y1 - 21.5); x.stroke();
  box(x, a - 14, y(10), 22, 10, '#2a1a10', 'rgba(' + O + ',.7)');

}
function escalator_sign(x:CanvasRenderingContext2D,v:View){const{sx,y,t}=v;
    const es = sx(inputs.x);
    if (onScreen(v, es - 30, 60)) { box(x, es - 1, y(40), 3, 40, '#2a160a'); notice(x, t, es, y(66), 50, 26, ['UP', 'ONLY'], 2); }

}
function fountain(x:CanvasRenderingContext2D,v:View){
  const { y, t } = v, F = {x:inputs.x,w:inputs.width}, fx = v.sx(F.x);
  if (!onScreen(v, fx - 110, 220)) return;
  const g = x.createRadialGradient(fx, y(20), 4, fx, y(30), 110);
  g.addColorStop(0, 'rgba(170,210,255,.12)'); g.addColorStop(1, 'rgba(170,210,255,0)');
  x.fillStyle = g; x.fillRect(fx - 110, y(120), 220, 120);
  box(x, fx - 4, y(44), 8, 30, '#1e110a', 'rgba(' + O + ',.7)');
  box(x, fx - 16, y(46), 32, 4, '#1e110a', 'rgba(' + O + ',.7)');
  for (const [side, ph] of DROPS) {
    const f = (ph + t * 0.012) % 1, dx = side * f * 56, dh = 46 + 34 * f - 70 * f * f;
    x.fillStyle = 'rgba(200,225,255,' + (0.7 - f * 0.4) + ')'; x.fillRect(Math.round(fx + dx), y(dh), 2, 2);
  }
  box(x, fx - F.w / 2, y(18), F.w, 18, '#1e110a', 'rgba(' + O + ',.85)');
  x.fillStyle = 'rgba(170,210,255,' + (0.35 + 0.1 * Math.sin(t * 0.08)) + ')'; x.fillRect(fx - F.w / 2 + 4, y(18), F.w - 8, 2);
  // coins on the bottom, glinting
  for (let i = 0; i < 9; i++) { x.fillStyle = (Math.floor(t / 30) + i) % 5 ? 'rgba(214,170,60,.5)' : 'rgba(255,230,150,.9)'; x.fillRect(Math.round(fx - 60 + i * 14 + (i % 3) * 3), y(16) + 3, 2, 1); }
  box(x, fx - 26, y(13), 52, 10, '#1a120b', 'rgba(' + O + ',.6)');
  text(x, 'FOUNTAIN', fx, y(8), 'rgba(' + PAPER + ',.85)', 7, '600');
  tell(x, t, fx + 22, y(4));

}
function deck_booth(x:CanvasRenderingContext2D,v:View){booth(x,v,{...DECK,x:inputs.x,w:inputs.width},{vendorPose:inputs.vendorPose});
}
function cases_booth(x:CanvasRenderingContext2D,v:View){booth(x,v,{...CASES,x:inputs.x,w:inputs.width},{vendorPose:inputs.vendorPose});
}
function table(x:CanvasRenderingContext2D,v:View){
  const s = v.sx(inputs.x), { y } = v;
  if (!onScreen(v, s - 40, 80)) return;
  x.fillStyle = '#2a1d14'; x.fillRect(s - 1, y(20), 3, 20);
  box(x, s - 18, y(22), 36, 3, '#3a2a1e', 'rgba(255,190,120,.6)');
  x.fillStyle = '#e8e0d0'; x.fillRect(s - 8, y(25), 6, 3); x.fillStyle = '#d84a2a'; x.fillRect(s + 4, y(26), 4, 4);

}
function security(x:CanvasRenderingContext2D,v:View){
  const { y, t } = v, s = v.sx(inputs.x);
  if (!onScreen(v, s - 10, 120)) return;
  for (let i = 0; i < 3; i++) {
    const mx = s + 6 + i * 30;
    box(x, mx, y(66), 26, 18, '#050505', 'rgba(220,220,230,.5)');
    x.fillStyle = 'rgba(200,215,200,.18)'; x.fillRect(mx + 2, y(64), 22, 14);
    x.fillStyle = 'rgba(220,230,220,.5)'; for (let k = 0; k < 3; k++) x.fillRect(mx + 4 + ((t * 0.1 * (k + 1) + k * 9 + i * 5) % 18), y(56) - 2, 1, 3);
    text(x, 'CAM ' + (11 + i * 3), mx + 13, y(52) + 3, 'rgba(' + PAPER + ',.6)', 7);
  }
  box(x, s, y(30), 100, 30, '#24130a', 'rgba(' + O + ',.85)');
  box(x, s + 30, y(24), 40, 10, '#e0d4b8', 'rgba(40,30,20,.8)'); text(x, 'DESK 2', s + 50, y(19), 'rgba(30,18,8,.95)', 7, '700');

}
function bench(x:CanvasRenderingContext2D,v:View){const s=v.sx(inputs.x),y=v.y;if(!onScreen(v,s-30,60))return;box(x,s-26,y(14),52,4,'#2a160a','rgba('+O+',.8)');box(x,s-22,y(10),3,10,'#2a160a');box(x,s+19,y(10),3,10,'#2a160a');
}
function floor(x:CanvasRenderingContext2D,v:View){const{gy}=v;
    x.fillStyle = '#070504'; x.fillRect(0, gy, v.viewW, v.viewH - gy);
    x.fillStyle = 'rgba(' + O + ',.55)'; x.fillRect(0, gy, v.viewW, 1);

}
function shop_reflection(x:CanvasRenderingContext2D,v:View){reflect(x,v,v.sx(inputs.x+inputs.width/2),inputs.tint,.7,Math.round(inputs.width*.5));
}
function fountain_reflection(x:CanvasRenderingContext2D,v:View){const fx=v.sx(inputs.x),{gy}=v;for(let i=0;i<6;i++){x.fillStyle='rgba(170,210,255,'+.05*(1-i/6)+')';x.fillRect(fx-60,gy+3+i*5,120,2);}
}
function pillar_reflection(x:CanvasRenderingContext2D,v:View){const s=v.sx(inputs.x);x.fillStyle='rgba('+O+',.06)';x.fillRect(s-14,v.gy+2,28,30);
}
function foreground_pillar(x:CanvasRenderingContext2D,v:View){
    // a near pillar sliding past, with a planter at its foot
    const s = v.sx(inputs.x,1.35);
    if (!onScreen(v, s - 24, 48)) return;
    box(x, s - 22, 0, 44, v.viewH, '#020100', 'rgba(' + O + ',.25)');

}
return{far_shell,far_shops,far_rails,gallery_back,gallery_front,ground_wall,metro_door,directory,shop_interior,shop_stock,shop_front,food_sign,door,pillar,registry,escalator_back,escalator_front,escalator_sign,fountain,deck_booth,cases_booth,table,security,bench,floor,shop_reflection,fountain_reflection,pillar_reflection,foreground_pillar};
}
