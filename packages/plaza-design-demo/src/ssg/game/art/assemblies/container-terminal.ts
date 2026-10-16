/** Extracted artwork. Scene-owned layout, actors and visual inputs are supplied explicitly. */
import { type View } from "../../scenes/kit";
import { drawSpire } from "../architecture/spire";
import { gullFlying } from "../characters/gull";
import { box,C,drawTowers,GREEN,notice,O,onScreen,PAPER,RED,rng,sign,tell,text,towers } from "../core/primitives";
import { placed } from "../core/view";
import { seaCols,sunPath } from "../environment/sky";
import { drawGantry,STS2 } from "../machinery/crane";
import { CH,container } from "../props/containers";
import { camera as securityCamera,taped,ticker,YELLOW } from "../signage/screens";
import { TerminalViewState,type TerminalVisual } from './terminal-state';
export interface TerminalLayout {booth:{x:number;w:number;h:number};gate:number;spawn:number;gatekeeper:number;notice:number;lane:number;blocks:{x:number;tiers:number}[];legs:number[];ladder:number;signaller:number;inspector:number;quay:number;kiosk:number;hatch:{x0:number;x1:number};lasher:number;bridge:{x0:number;x1:number};boom:number}
export interface ArtworkInputs {L:TerminalLayout;STACKS_W:number;STACKS_HZ:number;x:number;width:number;visual:TerminalVisual;part?:'far'|'near';open?:boolean;}
export function createContainerTerminalArtwork(inputs:ArtworkInputs){
const {L,STACKS_W}=inputs,HZ=inputs.STACKS_HZ;
const SKYLINE=towers(57,1700,[16,40],[18,66],.08);
const ripples:[number,number,number][]=(()=>{const r=rng(61);return Array.from({length:90},()=>[r()*2000,4+r()*70,4+r()*14]);})();
function far_band(x:CanvasRenderingContext2D,v:View){
const m=new TerminalViewState(inputs.visual);

  const { y, t } = v;
  drawTowers(x, v, SKYLINE, 0.12, y(HZ), 0.12, '#030100', 1);
  // the Spire: its foot in the bay, its towers on a deck, the antenna on the tallest (a landmark: the one bright thing far off)
  const sp = v.sx(1500, 0.1);
  if (onScreen(v, sp - 80, 200)) placed(x, sp, y(HZ), 1, () => drawSpire(x, { t }));
  // the water
  // the water takes the sky of the moment (black at night), the sun's or the moon's path on it (sets/sky.ts)
  const lt = inputs.visual.light, [c0, c1, c2] = seaCols(lt), wg = x.createLinearGradient(0, y(HZ), 0, v.gy);
  wg.addColorStop(0, c0); wg.addColorStop(0.35, c1); wg.addColorStop(1, c2);
  x.fillStyle = wg; x.fillRect(0, y(HZ), v.viewW, v.gy - y(HZ));
  sunPath(x, v, lt, y(HZ), v.gy);
  x.fillStyle = 'rgba(' + O + ',.1)'; x.fillRect(0, y(HZ), v.viewW, 1);
  const span = v.viewW + 40;
  for (const [rx, rh, len] of ripples) {
    const px = (((rx - v.cam * (0.12 + 0.4 * (1 - rh / HZ)) + t * 0.08) % span) + span) % span - 20;
    x.fillStyle = 'rgba(170,210,255,' + (0.04 + 0.06 * (1 - rh / HZ)) + ')'; x.fillRect(Math.round(px), y(rh), Math.round(len), 1);
  }
  // the Spire's lights lying on the water
  if (onScreen(v, sp - 20, 40)) for (let i = 0; i < 6; i++) { x.fillStyle = 'rgba(' + RED + ',' + 0.05 * (1 - i / 6) + ')'; x.fillRect(sp - 6 + Math.sin(t * 0.04 + i) * 2, y(HZ - 4 - i * 6), 8, 1); }
  // a ship at anchor, and once the ferry has gone, its lights far out on the water
  const s1 = v.sx(260, 0.12);
  if (onScreen(v, s1, 200)) { x.fillStyle = '#040302'; x.fillRect(s1, y(HZ + 10), 190, 10); for (let k = 10; k < 150; k += 9) x.fillRect(s1 + k, y(HZ + 26), 8, 16); x.fillStyle = 'rgba(' + GREEN + ',.4)'; x.fillRect(s1 + 2, y(HZ + 12), 2, 2); }
  if (m.get('departed')) {
    const fx = v.sx(1900 - Math.min(700, (t % 40000) * 0.02), 0.25), wl = y(HZ - 18);
    if (onScreen(v, fx - 40, 80)) { x.fillStyle = '#060403'; x.fillRect(fx - 30, wl - 6, 60, 6); x.fillStyle = 'rgba(255,217,165,.6)'; for (let i = -24; i < 24; i += 6) x.fillRect(fx + i, wl - 4, 2, 2); x.fillStyle = 'rgba(' + GREEN + ',.7)'; x.fillRect(fx + 28, wl - 8, 2, 2); }
  }
  // gulls high up
  for (let i = 0; i < 5; i++) {
    const wx = ((i * 431 + t * (0.3 + i * 0.07)) % 2200) - 200, s = v.sx(wx, 0.8);
    if (s > -10 && s < v.viewW + 10) gullFlying(x, s, y(150 + i * 22 + Math.sin(t * 0.02 + i) * 8), t + i * 9, 1);
  }

}
function sky_glow(x:CanvasRenderingContext2D,v:View){
const {y}=v;
  const glow = x.createLinearGradient(0, y(HZ + 70), 0, y(HZ));
  glow.addColorStop(0, 'rgba(194,65,12,0)'); glow.addColorStop(1, 'rgba(194,65,12,.12)');
  x.fillStyle = glow; x.fillRect(0, y(HZ + 70), v.viewW, 70);

}
function garden(x:CanvasRenderingContext2D,v:View){
  // someone's tomatoes in paint tins on top of block A, with a watering can: a garden on a box
  const g = v.sx(inputs.x), top = v.y(2 * CH);
  if (onScreen(v, g - 10, 80)) {
    for (let i = 0; i < 4; i++) {
      const px = g + i * 14;
      box(x, px, top - 9, 9, 9, ['#8a8e96', '#c8b890', '#6a6e78', '#a8642a'][i], 'rgba(255,217,165,.4)');
      x.fillStyle = '#3e6a2a'; x.fillRect(px + 4, top - 18, 1, 9); x.fillRect(px + 1, top - 15, 7, 2); x.fillRect(px + 2, top - 19, 5, 2);
      x.fillStyle = '#c83a2a'; x.fillRect(px + 1, top - 13, 2, 2); if (i % 2) x.fillRect(px + 6, top - 16, 2, 2);
    }
    box(x, g + 60, top - 7, 10, 7, '#5a8a3a', 'rgba(255,217,165,.35)'); x.fillStyle = '#5a8a3a'; x.fillRect(g + 70, top - 7, 5, 1);
  }

}
function gantry_back(x:CanvasRenderingContext2D,v:View){
placed(x,v.sx(inputs.x),v.y(0),1,()=>drawGantry(x,STS2,v.t,'back'));
}
function gantry_front(x:CanvasRenderingContext2D,v:View){
placed(x,v.sx(inputs.x),v.y(0),1,()=>drawGantry(x,STS2,v.t,'front'));
}
function ladder_panel(x:CanvasRenderingContext2D,v:View){
const m=new TerminalViewState(inputs.visual);
const {sx,y,t}=v;
  // the ladder and its cage
  const ld = sx(inputs.x);
  x.strokeStyle = 'rgba(' + PAPER + ',.35)'; x.beginPath(); x.moveTo(ld - 6.5, y(0)); x.lineTo(ld - 6.5, y(170)); x.moveTo(ld + 6.5, y(0)); x.lineTo(ld + 6.5, y(170)); x.stroke();
  x.fillStyle = 'rgba(' + PAPER + ',.3)'; for (let h = 6; h < 170; h += 8) x.fillRect(ld - 6, y(h), 12, 1);
  // the crane's ground panel by the ladder: cyan, it is a thing you use (its status lamp follows the crane)
  box(x, ld - 9, y(52), 18, 22, '#0d1416', 'rgba(' + C + ',.75)');
  const busy = m.scratch.liftT0 !== undefined || m.scratch.retT0 !== undefined;
  x.fillStyle = busy ? 'rgba(255,170,40,' + (Math.floor(t / 8) % 2 ? 0.95 : 0.3) + ')' : 'rgba(' + C + ',.5)'; x.fillRect(ld - 6, y(48), 12, 3);
  x.fillStyle = 'rgba(' + C + ',.35)'; for (let r = 0; r < 3; r++) x.fillRect(ld - 6, y(42) + r * 3, 8 + (r % 2) * 3, 1);
  tell(x, t, ld + 5, y(34), 3);

}
function berth_ticker(x:CanvasRenderingContext2D,v:View){
const m=new TerminalViewState(inputs.visual);
  // the berth ticker on the far leg
  ticker(x, v, { x: inputs.x, h: 120, w: 86, tall: 10, mount: 'wall', text: m.get('departed') ? 'BERTH 4 · NIGHT FERRY 8 · LOADING · DEPARTS WHEN FULL' : m.get('boxAt') === 'ferry' ? 'BERTH 4 · NIGHT FERRY 7 · 12 OF 12 · CLEARED TO DEPART' : 'BERTH 4 · NIGHT FERRY 7 · 11 OF 12 · AWAITING NRLU 404 0451', col: YELLOW, speed: 0.35 });

}
function trolley_cab(x:CanvasRenderingContext2D,v:View){
  const { sx, y } = v, tr = inputs.visual.trolley, tx = sx(tr.x), edge = 'rgba(' + O + ',.8)';
  if (!onScreen(v, tx - 90, 180)) return;
  box(x, tx - 12, y(L.boom - 6) + 3, 24, 7, '#2a160a', edge);
  // the cab, hanging beside the trolley, lit, with the operator in it
  const cabL = tx - 48, cabT = y(196);
  box(x, cabL, cabT, 26, 30, '#140b06', edge);
  x.fillStyle = 'rgba(255,200,130,.28)'; x.fillRect(cabL + 3, cabT + 4, 20, 16);

}
function trolley_rig(x:CanvasRenderingContext2D,v:View){
const cabL=v.sx(inputs.visual.trolley.x)-48,cabT=v.y(196);
const {sx,y}=v,tr=inputs.visual.trolley,tx=sx(tr.x),edge='rgba('+O+',.8)';if(!onScreen(v,tx-90,180))return;
  x.fillStyle = 'rgba(' + O + ',.8)'; x.fillRect(cabL + 3, cabT + 20, 20, 1);
  // ropes and spreader
  const top = tr.h + CH;
  x.strokeStyle = 'rgba(' + PAPER + ',.45)'; x.beginPath(); x.moveTo(tx - 5.5, y(L.boom - 6) + 10); x.lineTo(tx - 5.5, y(top + 4)); x.moveTo(tx + 5.5, y(L.boom - 6) + 10); x.lineTo(tx + 5.5, y(top + 4)); x.stroke();
  box(x, tx - 66, y(top + 4), 132, 4, '#2a160a', edge);
  for (const k of [-66, 60]) { x.fillStyle = 'rgba(' + YELLOW + ',.6)'; x.fillRect(tx + k, y(top + 4), 6, 4); }

}
function carried_load(x:CanvasRenderingContext2D,v:View){
const m=new TerminalViewState(inputs.visual),KIND={none:0,regular:1,box:2};
const {t}=v,tr=inputs.visual.trolley,tx=v.sx(tr.x);if(!onScreen(v,tx-90,180))return;
  if (!tr.carry) return;
  // what it carries, cut off at the deck when it goes down into the hold
  x.save(); x.beginPath(); x.rect(0, 0, v.viewW, v.gy - (tr.x > L.quay ? 0 : -60)); x.clip();
  if (tr.carry === KIND.box) reeferKernel(x, v, tr.x - 64, tr.h, false, t);
  else container(x, v, tr.x - 64, tr.h, { w: 128, p: [0, 3, 5, 6, 2][Number(m.get('loaded') ?? 0) % 5], seed: 70 + Number(m.get('loaded') ?? 0) % 9 });
  x.restore();


}
function reefer(x:CanvasRenderingContext2D,v:View){
reeferKernel(x,v,inputs.x,inputs.visual.geometry.H.deck,!!inputs.open,v.t);
}
function thermal_gate(x:CanvasRenderingContext2D,v:View){
const m=new TerminalViewState(inputs.visual),hover=inputs.visual.hover==='port',part=inputs.part??'near';

  const { sx, y, t } = v, g = sx(inputs.x), s = m.scratch, now = m.now();
  if (!onScreen(v, g - 40, 80)) return;
  const steel = '#2a2622', edge = 'rgba(220,200,160,.6)';
  const alarm = s.alarm !== undefined && now - s.alarm < 3500, cold = s.cold !== undefined && now - s.cold < 1200, warm = s.warm !== undefined && now - s.warm < 1500;
  const frozen = m.frozen('port');
  if (part === 'far') {
    box(x, g + 6, y(204), 6, 204, '#1c1a16', 'rgba(220,200,160,.35)');
    // the scanning sheet, a band of light across the boom's path
    const col = alarm || warm ? RED : cold ? GREEN : frozen ? '120,120,140' : RED;
    const sweep = (t * 2) % 70;
    x.fillStyle = 'rgba(' + col + ',' + (alarm ? 0.16 : 0.07) + ')'; x.fillRect(g - 3, y(196), 14, 76);
    if (!frozen) { x.fillStyle = 'rgba(' + col + ',.8)'; x.fillRect(g - 4, y(196 - sweep), 16, 1); }
    return;
  }
  box(x, g - 6, y(208), 8, 208, steel, edge);
  box(x, g - 10, y(214), 26, 8, steel, edge);
  for (let k = 0; k < 3; k++) { x.fillStyle = k % 2 ? 'rgba(20,12,6,1)' : 'rgba(' + YELLOW + ',.6)'; x.fillRect(g - 6, y(24 - k * 8), 8, 8); }
  // emitters along the post where the sheet is
  for (let h = 124; h < 196; h += 12) { x.fillStyle = frozen ? 'rgba(140,140,160,.5)' : 'rgba(' + RED + ',' + (0.4 + 0.4 * Math.sin(t * 0.2 + h)) + ')'; x.fillRect(g + 2, y(h), 3, 2); }
  // the beacon on top and its alarm
  const on = alarm && Math.floor(t / 6) % 2 === 0;
  x.fillStyle = on ? 'rgba(' + RED + ',1)' : 'rgba(' + RED + ',.25)'; x.fillRect(g - 4, y(222), 8, 6);
  if (on) {
    const glow = x.createRadialGradient(g, y(219), 2, g, y(219), 70);
    glow.addColorStop(0, 'rgba(' + RED + ',.3)'); glow.addColorStop(1, 'rgba(' + RED + ',0)');
    x.fillStyle = glow; x.fillRect(g - 70, y(290), 140, 140);
  }
  // the gate's panel at hand height: cyan, a thing you use; its plate printed, not neon
  box(x, g - 22, y(66), 30, 22, '#0d1416', 'rgba(' + C + ',.75)');
  text(x, frozen ? 'FROZEN' : alarm ? 'ALARM' : cold ? 'CLEAR' : 'SCAN', g - 7, y(58), frozen ? 'rgba(200,200,220,.9)' : alarm ? 'rgba(' + RED + ',.95)' : cold ? 'rgba(' + GREEN + ',.95)' : 'rgba(' + C + ',.85)', 7, '600');
  text(x, 'BERTH 4', g - 7, y(50), 'rgba(' + PAPER + ',.6)', 7, '600');
  box(x, g - 40, y(90), 64, 16, '#e0d4b8', 'rgba(40,30,20,.9)');
  text(x, 'THERMAL GATE', g - 8, y(85), 'rgba(30,18,8,.95)', 7, '700');
  text(x, 'PORT AUTHORITY', g - 8, y(78), 'rgba(110,20,20,.95)', 7, '700');
  tell(x, t, g + 6, y(38), 5);
  if (hover) { x.save(); x.strokeStyle = 'rgba(255,61,242,.85)'; x.shadowColor = 'rgba(255,61,242,.8)'; x.shadowBlur = 8; x.strokeRect(g - 26.5, y(152) - 0.5, 40, 154); x.restore(); }

}
function watchdog(x:CanvasRenderingContext2D,v:View){
const m=new TerminalViewState(inputs.visual),X=inputs.visual.geometry.X;

  const d = m.watchdogs()[0];
  if (!d) return;
  const at: Record<string, number> = { port: X.gate - 4, sts2: L.ladder + 40, ferry: L.kiosk + 6 };
  const k = d.progress * d.progress * (3 - 2 * d.progress);
  const wx = d.at ? at[d.at] : at[d.from] + (at[d.to] - at[d.from]) * k;
  const hh = d.at ? 132 + Math.sin(v.t * 0.05) * 3 : 150 + Math.sin(Math.PI * d.progress) * 24;
  const s = v.sx(wx), sy = v.y(hh);
  if (!onScreen(v, s - 30, 60)) return;
  if (d.at) {
    // sitting: it looks the device over, a cone of grey light
    x.fillStyle = 'rgba(200,205,220,.07)'; x.beginPath(); x.moveTo(s - 2, sy + 4); x.lineTo(s - 26, v.y(0)); x.lineTo(s + 26, v.y(0)); x.lineTo(s + 2, sy + 4); x.closePath(); x.fill();
  }
  box(x, s - 9, sy - 3, 18, 6, '#4a4e58', 'rgba(220,225,235,.6)');
  x.fillStyle = '#2a2e36'; x.fillRect(s - 15, sy - 5, 6, 1); x.fillRect(s + 9, sy - 5, 6, 1);
  const spin = Math.floor(v.t / 2) % 2;
  x.fillStyle = 'rgba(220,225,235,.5)'; x.fillRect(s - 17 + spin * 2, sy - 6, 6, 1); x.fillRect(s + 11 - spin * 2, sy - 6, 6, 1);
  x.fillStyle = 'rgba(' + RED + ',' + (Math.floor(v.t / 10) % 2 ? 1 : 0.4) + ')'; x.fillRect(s - 1, sy + 1, 3, 2);
  text(x, 'REGISTRY', s, sy - 9, 'rgba(' + PAPER + ',.45)', 7, '600');

}
function bridge(x:CanvasRenderingContext2D,v:View){
const m=new TerminalViewState(inputs.visual);
const {sx,y,t}=v,q=sx(L.quay),right=sx(STACKS_W);if(!onScreen(v,q,right-q))return;const name=m.get('departed')?'NIGHT FERRY 8':'NIGHT FERRY 7';
  // the bridge: tall, windows lit, a funnel and a mast with its lights
  const b0 = sx(inputs.x), b1 = sx((inputs.x+inputs.width));
  box(x, b0, y(108), b1 - b0, 108, '#2a0e0a', 'rgba(' + O + ',.7)');
  box(x, b0 + 18, y(146), b1 - b0 - 30, 38, '#240c08', 'rgba(' + O + ',.6)');
  x.fillStyle = 'rgba(255,217,165,.5)'; for (let i = b0 + 24; i < b1 - 18; i += 12) x.fillRect(i, y(136), 8, 6);
  x.fillStyle = 'rgba(255,217,165,.25)'; for (let r = 0; r < 3; r++) for (let i = b0 + 8; i < b1 - 8; i += 14) if ((i + r * 5) % 3) x.fillRect(i, y(90 - r * 24), 6, 5);
  box(x, b0 + 60, y(178), 24, 32, '#3a1a10', 'rgba(' + O + ',.6)'); x.fillStyle = 'rgba(' + RED + ',.7)'; x.fillRect(b0 + 60, y(172), 24, 3);
  box(x, b1 - 30, y(210), 2, 64, '#2a160a');
  x.fillStyle = Math.floor(t / 30) % 2 ? 'rgba(255,240,215,.95)' : 'rgba(255,240,215,.3)'; x.fillRect(b1 - 31, y(212), 4, 3);
  x.fillStyle = 'rgba(' + GREEN + ',.8)'; x.fillRect(b1 - 6, y(64), 3, 3);
  text(x, name, (b0 + b1) / 2, y(28), 'rgba(' + PAPER + ',.75)', 8, '700');

}
function ferry_hatch(x:CanvasRenderingContext2D,v:View){
const {sx,y}=v,q=sx(L.quay),right=sx(STACKS_W);if(!onScreen(v,q,right-q))return;  // the hatch coaming, the hold open behind it (regular boxes go down there)
  const h0 = sx(inputs.x), h1 = sx((inputs.x+inputs.width));
  box(x, h0, y(22), h1 - h0, 22, '#3a1a10', 'rgba(' + O + ',.7)');
  for (let i = h0 + 4; i < h1 - 4; i += 10) { x.fillStyle = 'rgba(' + YELLOW + ',.5)'; x.fillRect(i, y(22) + 2, 5, 2); }
  text(x, 'HOLD 2', (h0 + h1) / 2, y(10), 'rgba(' + PAPER + ',.55)', 7, '600');

}
function deck_lamp(x:CanvasRenderingContext2D,v:View){
const {sx,y}=v,lx=inputs.x; const s = sx(lx); box(x, s - 1, y(70), 3, 70, '#2a160a'); box(x, s - 5, y(76), 10, 6, '#3a3020', 'rgba(255,217,165,.6)'); const gl = x.createLinearGradient(0, y(70), 0, y(0)); gl.addColorStop(0, 'rgba(255,217,165,.12)'); gl.addColorStop(1, 'rgba(255,217,165,.02)'); x.fillStyle = gl; x.beginPath(); x.moveTo(s - 3, y(70)); x.lineTo(s - 40, y(0)); x.lineTo(s + 40, y(0)); x.lineTo(s + 3, y(70)); x.closePath(); x.fill();
}
function ferry_kiosk(x:CanvasRenderingContext2D,v:View){
const hover=inputs.visual.hover;
const {sx,y,t}=v,q=sx(L.quay),right=sx(STACKS_W);if(!onScreen(v,q,right-q))return;  // the gangway terminal: the purser's screen on a post
  const k = sx(inputs.x);
  box(x, k - 1, y(40), 3, 40, '#2a2622');
  box(x, k - 12, y(58), 24, 18, '#0d1416', 'rgba(' + C + ',.75)');
  x.fillStyle = 'rgba(' + C + ',.4)'; for (let r = 0; r < 3; r++) x.fillRect(k - 9, y(54) + r * 4, 12 + (r % 2) * 4, 1);
  tell(x, t, k + 8, y(36), 6);
  if (hover === 'ferry') { x.save(); x.strokeStyle = 'rgba(255,61,242,.85)'; x.shadowColor = 'rgba(255,61,242,.8)'; x.shadowBlur = 8; x.strokeRect(k - 15.5, y(60) - 0.5, 31, 62); x.restore(); }

}
function bulwark(x:CanvasRenderingContext2D,v:View){
const {sx,y}=v,q=sx(L.quay),right=sx(STACKS_W);if(!onScreen(v,q,right-q))return;const b0=sx(L.bridge.x0);
  // the bulwark rail along the deck's edge (behind the player), and the gangway down to the quay
  x.strokeStyle = 'rgba(' + O + ',.4)'; x.beginPath(); x.moveTo(q + 10, y(16) + 0.5); x.lineTo(b0, y(16) + 0.5); x.stroke();
  x.fillStyle = 'rgba(' + O + ',.4)'; for (let i = q + 10; i < b0; i += 24) x.fillRect(i, y(16), 1, 16);


}
function hull(x:CanvasRenderingContext2D,v:View){
const m=new TerminalViewState(inputs.visual);

  const { sx, gy, t } = v, q = sx(L.quay + 6), r = sx(STACKS_W + 20);
  if (r < 0 || q > v.viewW) return;
  x.fillStyle = '#3a120c'; x.fillRect(q, gy, r - q, 26);
  x.fillStyle = 'rgba(' + O + ',.6)'; x.fillRect(q, gy, r - q, 1);
  x.fillStyle = 'rgba(0,0,0,.25)'; for (let i = q; i < r; i += 30) x.fillRect(i, gy + 2, 1, 24);
  text(x, m.get('departed') ? 'NIGHT FERRY 8' : 'NIGHT FERRY 7', sx(1420), gy + 15, 'rgba(240,230,215,.7)', 9, '700');
  x.fillStyle = '#1a0806'; x.fillRect(q, gy + 26, r - q, 4);
  x.fillStyle = 'rgba(' + RED + ',.3)'; x.fillRect(q, gy + 30, r - q, 1);
  // the gap of black water between quay and hull, and fenders
  x.fillStyle = '#01030a'; x.fillRect(q - 8, gy, 8, 40);
  for (const fx of [1160, 1360, 1560]) { const s = sx(fx); x.fillStyle = '#141010'; x.beginPath(); x.ellipse(s, gy + 12, 6, 9, 0, 0, 7); x.fill(); }
  void t;

}
function booth(x:CanvasRenderingContext2D,v:View){

  const { sx, y, t } = v, B = {x:inputs.x,w:inputs.width,h:70}, b = sx(B.x);
  if (!onScreen(v, b - 10, B.w + 60)) return;
  box(x, b, y(B.h), B.w, B.h, '#140b06', 'rgba(' + O + ',.8)');
  box(x, b + 8, y(54), 24, 46, '#0a0603', 'rgba(' + O + ',.7)');
  text(x, '< PIER', b + 20, y(60), 'rgba(' + PAPER + ',.75)', 7, '600');
  box(x, b + 38, y(58), 18, 20, 'rgba(255,217,165,.16)', 'rgba(' + O + ',.6)');
  box(x, b - 4, y(B.h + 4), B.w + 8, 5, '#1c0f07', 'rgba(' + O + ',.8)');
  sign(x, t, 'TERMINAL 2', b + B.w / 2, y(B.h + 14), O, { size: 8, phase: 20 });
  // the barrier arm, up
  box(x, b + B.w + 2, y(26), 6, 26, '#2a2622', 'rgba(220,200,160,.5)');
  x.save(); x.translate(b + B.w + 5, y(24)); x.rotate(-1.2);
  for (let i = 0; i < 70; i += 10) { x.fillStyle = (i / 10) % 2 ? 'rgba(' + RED + ',.8)' : 'rgba(240,230,215,.8)'; x.fillRect(i, -2, 10, 3); }
  x.restore();

}
function lane(x:CanvasRenderingContext2D,v:View){

  const { sx, y, t } = v, s = sx(inputs.x);
  if (!onScreen(v, s - 40, 80)) return;
  // the lane recedes: darker asphalt, a lamp far down it, the warehouse's end wall
  x.fillStyle = '#060403'; x.fillRect(s - 22, y(70), 44, 70);
  box(x, s - 16, y(64), 32, 50, '#120a06', 'rgba(' + O + ',.35)');
  x.fillStyle = 'rgba(255,217,165,' + (0.25 + 0.1 * Math.sin(t * 0.03)) + ')'; x.fillRect(s - 2, y(58), 4, 3);
  text(x, 'WH 4', s, y(36), 'rgba(' + PAPER + ',.35)', 7, '600');
  // the sign over the lane's mouth, on a post at its corner
  box(x, s - 24, y(104), 3, 104, '#2a160a');
  box(x, s - 22, y(104), 46, 14, '#e0d4b8', 'rgba(40,30,20,.9)');
  text(x, 'WAREHOUSE 4', s + 1, y(99), 'rgba(30,18,8,.95)', 7, '700');

}
function straddle(x:CanvasRenderingContext2D,v:View){

  const P = 2200, u = v.t % P, a = inputs.x, b = inputs.x-270;
  const k = u < 800 ? u / 800 : u < 1100 ? 1 : u < 1900 ? 1 - (u - 1100) / 800 : 0;
  const e = k * k * (3 - 2 * k), wx = a + (b - a) * e, loaded = u < 1100 || u > 2100;
  const s = v.sx(wx, 0.92), { y } = v;
  if (!onScreen(v, s - 50, 100)) return;
  const col = '#8a5a1a', edge = 'rgba(' + YELLOW + ',.55)';
  box(x, s - 36, y(96), 72, 6, col, edge);
  for (const lx of [-36, 32]) box(x, s + lx, y(96), 4, 96, col, edge);
  box(x, s + 14, y(110), 18, 14, '#1a0e06', edge);
  x.fillStyle = 'rgba(255,200,130,.3)'; x.fillRect(s + 16, y(108), 14, 6);
  x.fillStyle = Math.floor(v.t / 9) % 2 ? 'rgba(255,170,40,.95)' : 'rgba(255,170,40,.3)'; x.fillRect(s - 2, y(100), 4, 3);
  for (const lx of [-34, 34]) { x.fillStyle = '#0c0a08'; x.beginPath(); x.arc(s + lx, y(5), 5, 0, 7); x.fill(); }
  if (loaded) { x.save(); x.globalAlpha = 0.9; box(x, s - 30, y(78), 60, 30, '#2c2824', 'rgba(225,215,200,.5)'); x.restore(); }
  text(x, 'SC-11', s, y(92), 'rgba(20,12,6,.9)', 7, '700');

}
function chassis(x:CanvasRenderingContext2D,v:View){
const m=new TerminalViewState(inputs.visual),H=inputs.visual.geometry.H,KIND={none:0,regular:1,box:2};

  const { sx, y } = v, c = sx(inputs.x - 64), s = m.scratch;
  if (!onScreen(v, c - 10, 150)) return;
  box(x, c - 4, y(12), 136, 4, '#2a2622', 'rgba(220,200,160,.5)');
  for (const k of [6, 18, 104, 116]) { x.fillStyle = '#0c0a08'; x.beginPath(); x.arc(c + k, y(5), 5, 0, 7); x.fill(); x.strokeStyle = 'rgba(220,200,160,.4)'; x.stroke(); }
  const taken = s.liftT0 !== undefined && s.liftKind === KIND.regular && m.now() - s.liftT0 > 1000;
  if (!taken) container(x, v, inputs.x - 64, H.chassis, { w: 128, p: [5, 0, 3, 6, 2][(Number(m.get('loaded') ?? 0) + 1) % 5], seed: 71 + Number(m.get('loaded') ?? 0) % 9 });

}
function urn(x:CanvasRenderingContext2D,v:View){

  const { sx, y, t } = v, u = sx(inputs.x);
  if (!onScreen(v, u - 20, 70)) return;
  box(x, u - 12, y(22), 24, 22, '#5a3a1e', 'rgba(255,190,110,.5)');
  box(x, u - 6, y(40), 12, 18, '#8a8e96', 'rgba(240,236,224,.6)');
  x.fillStyle = '#2a2624'; x.fillRect(u - 3, y(44), 6, 4); x.fillRect(u + 6, y(30), 4, 2);
  for (let i = 0; i < 3; i++) { x.fillStyle = 'rgba(235,240,245,' + (0.12 - i * 0.03) + ')'; x.fillRect(u - 2 + Math.sin(t * 0.05 + i) * 2, y(46 + i * 5), 3, 2); }
  box(x, u + 20, y(10), 22, 10, '#4a3420', 'rgba(255,190,110,.4)');

}
function board(x:CanvasRenderingContext2D,v:View){

  const { sx, y, t } = v, s = sx(inputs.x);
  if (!onScreen(v, s - 40, 80)) return;
  box(x, s - 24, y(40), 3, 40, '#2a160a'); box(x, s + 21, y(40), 3, 40, '#2a160a');
  notice(x, t, s, y(78), 56, 38, ['PORT', 'AUTHORITY', 'NOTICE']);

}
function quay_floor(x:CanvasRenderingContext2D,v:View){
const {sx,y}=v;
  x.fillStyle = '#0e0905'; x.fillRect(0, y(6), sx(L.quay), 6);
  x.fillStyle = 'rgba(' + O + ',.6)'; x.fillRect(0, y(6), sx(L.quay), 1);
  x.fillStyle = 'rgba(200,190,170,.25)'; x.fillRect(0, y(2), sx(L.quay), 1);

}
function crane_outline(x:CanvasRenderingContext2D,v:View){
const {sx,y}=v;
  if (inputs.visual.hover === 'sts2') { const s = sx(inputs.x); x.save(); x.strokeStyle = 'rgba(255,61,242,.85)'; x.shadowColor = 'rgba(255,61,242,.8)'; x.shadowBlur = 8; x.strokeRect(s - 22.5, y(110) - 0.5, 45, 112); x.restore(); }

}
function camera(x:CanvasRenderingContext2D,v:View){
securityCamera(x,v,{x:inputs.x,h:150,facing:-1,phase:17});
}
function tea_note(x:CanvasRenderingContext2D,v:View){
taped(x,v,{x:inputs.x,h:70,text:['TEA RUN','02:00','ASK BEFORE','YOU TAKE'],tilt:-.05});
}
function reefer_cable(x:CanvasRenderingContext2D,v:View){
const {sx,y}=v;
    x.strokeStyle = 'rgba(30,30,30,.9)'; x.beginPath(); x.moveTo(sx(inputs.x - 60), y(16)); x.quadraticCurveTo(sx(inputs.x - 80), y(2), sx(inputs.x - 100), y(2)); x.stroke();

}
function reefer_outline(x:CanvasRenderingContext2D,v:View){
const H=inputs.visual.geometry.H;
const {sx,y}=v;
    if (inputs.visual.hover === 'reefer') { const s = sx(inputs.x); x.save(); x.strokeStyle = 'rgba(255,61,242,.85)'; x.shadowColor = 'rgba(255,61,242,.8)'; x.shadowBlur = 8; x.strokeRect(s - 66.5, y(H.deck + CH + 2) - 0.5, 133, CH + 4); x.restore(); }
}
function quay_face(x:CanvasRenderingContext2D,v:View){
const {sx,gy}=v;
  x.fillStyle = '#0c0805'; x.fillRect(0, gy, sx(L.quay), 12);
  x.fillStyle = 'rgba(' + O + ',.55)'; x.fillRect(0, gy, sx(L.quay), 1);
  x.fillStyle = '#01030a'; x.fillRect(0, gy + 12, v.viewW, v.viewH - gy - 12);

}
function near_ripples(x:CanvasRenderingContext2D,v:View){
const {t,gy}=v;
  for (let k = 0; k < 6; k++) {
    const wy = gy + 34 + k * 6, sp = 0.2 + k * 0.08, a = 0.08 - k * 0.01;
    for (let wx = -60; wx < v.viewW + 60; wx += 46 + k * 9) {
      const px2 = ((wx - v.cam * (1 + k * 0.04) + t * sp) % (v.viewW + 120) + v.viewW + 120) % (v.viewW + 120) - 60;
      x.fillStyle = 'rgba(170,210,255,' + a + ')'; x.fillRect(Math.round(px2), Math.round(wy + Math.sin(t * 0.04 + wx) * 1.5), 14 + k * 2, 1);
    }
  }

}
function gate_reflection(x:CanvasRenderingContext2D,v:View){
const {sx,t,gy}=v;
  const gs = sx(inputs.x);
  for (let i = 0; i < 6; i++) { x.fillStyle = 'rgba(' + RED + ',' + 0.06 * (1 - i / 6) + ')'; x.fillRect(gs - 8 + Math.sin(t * 0.05 + i) * 2, gy + 34 + i * 4, 16, 2); }


}
function bollard(x:CanvasRenderingContext2D,v:View){

const fx=inputs.x;
    const s = v.sx(fx, 1.3), base = v.gy + 46;
    if (!onScreen(v, s - 20, 140)) return;
    box(x, s - 10, base - 18, 20, 18, '#020100', 'rgba(' + O + ',.3)'); box(x, s - 14, base - 22, 28, 5, '#020100', 'rgba(' + O + ',.3)');
    x.strokeStyle = 'rgba(120,90,60,.5)'; x.lineWidth = 2; x.beginPath(); x.moveTo(s + 10, base - 14); x.quadraticCurveTo(s + 60, base - 2, s + 120, base - 30); x.stroke(); x.lineWidth = 1;
}
function reeferKernel(x:CanvasRenderingContext2D,v:View,wx:number,h:number,open:boolean,t:number){
  const s0 = Math.round(v.sx(wx)), top = Math.round(v.y(h + CH)), w = 128;
  if (!onScreen(v, s0, w)) return;
  box(x, s0, top, w, CH, '#c8c4b8', 'rgba(242,238,228,.9)');
  x.fillStyle = 'rgba(0,0,0,.12)'; for (let i = 5; i < w - 20; i += 4) x.fillRect(s0 + i, top + 4, 1, CH - 8);
  x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(s0 + 1, top + 1, w - 2, 3); x.fillRect(s0 + 1, top + CH - 4, w - 2, 3);
  // the refrigeration unit: grille, a fan behind it, a lamp
  box(x, s0 + 3, top + 5, 20, CH - 10, '#5a5a5e', 'rgba(242,238,228,.6)');
  const a = t * 0.3;
  x.strokeStyle = '#2a2a2e'; x.beginPath(); x.moveTo(s0 + 13 + Math.cos(a) * 6, top + 20 + Math.sin(a) * 6); x.lineTo(s0 + 13 - Math.cos(a) * 6, top + 20 - Math.sin(a) * 6); x.stroke();
  x.fillStyle = 'rgba(0,0,0,.35)'; for (let r = 0; r < 5; r++) x.fillRect(s0 + 5, top + 32 + r * 3, 16, 1);
  // the intercom panel: cyan, a thing you use
  box(x, s0 + 6, top + CH - 20, 12, 10, '#0d1416', 'rgba(' + C + ',.8)');
  x.fillStyle = 'rgba(' + C + ',' + (0.4 + 0.3 * Math.sin(t * 0.08)) + ')'; x.fillRect(s0 + 8, top + CH - 17, 8, 2);
  // the code, stencilled, and the reading the label does not agree with
  text(x, 'NRLU 404 0451', s0 + 30, top + 11, 'rgba(30,24,18,.85)', 7, '700', 'left');
  text(x, 'SET 4°C', s0 + 30, top + 21, 'rgba(30,24,18,.6)', 7, '600', 'left');
  // the doors at the far end: closed bars, or one leaf ajar onto a dark inside
  if (open) {
    x.fillStyle = '#060404'; x.fillRect(s0 + w - 30, top + 4, 26, CH - 8);
    const g = x.createLinearGradient(s0 + w - 30, 0, s0 + w - 4, 0); g.addColorStop(0, 'rgba(255,200,130,.0)'); g.addColorStop(1, 'rgba(255,200,130,.12)');
    x.fillStyle = g; x.fillRect(s0 + w - 30, top + 4, 26, CH - 8);
    box(x, s0 + w - 2, top + 3, 14, CH - 6, '#bdb9ad', 'rgba(242,238,228,.8)');
  } else {
    x.fillStyle = 'rgba(40,36,30,.4)'; x.fillRect(s0 + w - 18, top + 5, 2, CH - 10); x.fillRect(s0 + w - 10, top + 5, 2, CH - 10);
  }
}
return{far_band,sky_glow,garden,gantry_back,gantry_front,ladder_panel,berth_ticker,trolley_cab,trolley_rig,carried_load,reefer,thermal_gate,watchdog,bridge,ferry_hatch,deck_lamp,ferry_kiosk,bulwark,hull,booth,lane,straddle,chassis,urn,board,quay_floor,crane_outline,camera,tea_note,reefer_cable,reefer_outline,quay_face,near_ripples,gate_reflection,bollard};
}
