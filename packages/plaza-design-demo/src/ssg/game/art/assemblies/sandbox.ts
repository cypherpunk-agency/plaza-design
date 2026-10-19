import { sandboxPulse as pulse,SandboxViewState,type SandboxSnapshot } from './sandbox-state';
/** Extracted artwork. Scene-owned layout, actors and visual inputs are supplied explicitly. */
import { box,C,drawTowers,GREEN,notice,O,onScreen,PAPER,RED,rng,RUST,tell,text,towers } from "../core/primitives";
import { type View } from "../core/view";
import { taped,YELLOW } from "../signage/screens";
export interface SandboxLayout {door:number;spawn:number;plan:number;reset:number;dispenser:number;radiator:number;bench:number;window:{x0:number;x1:number;h0:number;h1:number};end:number}
export interface Station {n:number;x0:number;x1:number;sign?:number;title:string;sub:string}
export interface ArtworkInputs {SANDBOX_W:number;STATIONS:Station[];SB:SandboxLayout;visual:SandboxSnapshot;originX?:number;ceiling?:number;decorX?:number}
export function createSandboxArtwork(inputs: ArtworkInputs) {
const {SANDBOX_W,SB}=inputs;
const at=(v:View,id:string)=>{const s=inputs.visual.spots[id];if(!s)throw new Error('Missing Sandbox visual spot '+id);return{l:Math.round(v.sx(s.x-s.w/2)),t:Math.round(v.y(s.y+s.h)),w:s.w,h:s.h,cx:Math.round(v.sx(s.x)),b:Math.round(v.y(s.y))};};

const CEIL=inputs.ceiling??170,originX=inputs.originX??0;


const rgba = (c: string, a: number) => 'rgba(' + c + ',' + a + ')';


/** A small plate on the wall with one or two lines (screws at the corners): signs and labels. */
function plate(x: CanvasRenderingContext2D, cx: number, top: number, lines: string[], opt: { col?: string; size?: number; fill?: string; rim?: string } = {}) {
  const size = opt.size ?? 7, w = Math.round(Math.max(...lines.map((l) => l.length)) * size * 0.62 + 10), h = lines.length * (size + 3) + 5;
  const l = Math.round(cx - w / 2);
  box(x, l, top, w, h, opt.fill ?? '#1a120b', opt.rim ?? rgba(O, 0.7));
  x.fillStyle = 'rgba(160,120,90,.6)'; x.fillRect(l + 1, top + 1, 1, 1); x.fillRect(l + w - 2, top + 1, 1, 1);
  lines.forEach((ln, i) => text(x, ln, cx, top + 4 + size / 2 + i * (size + 3), opt.col ?? rgba(PAPER, 0.92), size, '600'));
  return { l, w, h };
}


/** A bench top on legs, `h` high. */
function bench(x: CanvasRenderingContext2D, v: View, x0: number, x1: number, h = 28) {
  const a = v.sx(x0), w = x1 - x0;
  if (!onScreen(v, a, w)) return;
  x.fillStyle = 'rgba(0,0,0,.5)'; x.fillRect(a + 2, v.y(h) + 3, w - 4, h - 3);
  box(x, a, v.y(h), w, 4, '#4a3a2c', rgba(PAPER, 0.45));
  x.fillStyle = '#241a12';
  for (const lx of [a + 3, a + w - 6]) x.fillRect(lx, v.y(h - 4), 3, h - 4);
  x.fillRect(a + 3, v.y(8), w - 6, 2);
}


/** A device's kind on a strip below it (station 01): what you are looking at. */
const kindTag = (x: CanvasRenderingContext2D, cx: number, top: number, s: string) => plate(x, cx, top, [s], { col: rgba(C, 0.9), fill: '#06121a', rim: rgba(C, 0.45) });


/** The QA-WD lamp over a device on the watchdog's route: red while the watchdog sits on it. */
function wdLamp(x: CanvasRenderingContext2D, m: SandboxViewState, v: View, id: string) {
  const r = at(v, id), on = m.frozen(id);
  box(x, r.cx - 6, r.t - 12, 12, 7, '#140808', rgba(on ? RED : O, 0.6));
  x.fillStyle = rgba(RED, on ? (Math.floor(v.t / 8) % 2 ? 0.95 : 0.6) : 0.15); x.fillRect(r.cx - 4, r.t - 10, 8, 3);
  if (on) { const g = x.createRadialGradient(r.cx, r.t - 9, 1, r.cx, r.t - 9, 18); g.addColorStop(0, rgba(RED, 0.25)); g.addColorStop(1, rgba(RED, 0)); x.fillStyle = g; x.fillRect(r.cx - 18, r.t - 27, 36, 36); }
}


// ---------- the hall ----------

/** Ducts and girders over the ceiling, for views taller than the hall (middle band, dim). */
function overhead(x: CanvasRenderingContext2D, v: View, w0: number, w1: number) {
  const { y, sx } = v;
  for (let k = 0, h0 = CEIL + 12; y(h0) > 0; k++, h0 += 70) {
    x.fillStyle = k % 2 ? '#060404' : '#070505'; x.fillRect(w0, y(h0 + 70), w1 - w0, 70);
    x.fillStyle = 'rgba(' + RUST + ',.22)'; x.fillRect(w0, y(h0 + 34), w1 - w0, 1);
    for (let gx = originX; gx < originX + SANDBOX_W; gx += 240) { const s = sx(gx); if (onScreen(v, s, 8)) { x.fillStyle = '#0c0807'; x.fillRect(s, y(h0 + 70), 6, 70); } }
    // a duct, with its seams
    x.fillStyle = '#0d0a08'; x.fillRect(w0, y(h0 + 22), w1 - w0, 12);
    x.fillStyle = 'rgba(' + RUST + ',.3)'; for (let gx = originX; gx < originX + SANDBOX_W; gx += 90) { const s = sx(gx + k * 30); if (onScreen(v, s, 2)) x.fillRect(s, y(h0 + 22), 1, 12); }
  }
}


/** The back wall: panels to the ceiling, a dado rail, the hazard strip at the foot, the tube lights. */
function hall(x: CanvasRenderingContext2D, v: View, w0: number, w1: number) {
  const { y, sx } = v;
  box(x, w0, y(CEIL), w1 - w0, CEIL, '#110d0b');
  box(x, w0, y(46), w1 - w0, 46, '#15100d');
  x.fillStyle = 'rgba(' + PAPER + ',.035)';
  for (let wx = originX; wx < originX + SANDBOX_W; wx += 60) { const s = sx(wx); if (onScreen(v, s, 1)) x.fillRect(s, y(CEIL), 1, CEIL - 46); }
  x.fillStyle = 'rgba(' + O + ',.3)'; x.fillRect(w0, y(46), w1 - w0, 1);
  // the hazard strip along the foot of the wall
  for (let wx = originX; wx < originX + SANDBOX_W; wx += 12) { const s = sx(wx); if (onScreen(v, s, 12)) { x.fillStyle = (wx / 12) % 2 ? 'rgba(' + YELLOW + ',.18)' : 'rgba(0,0,0,.4)'; x.fillRect(s, y(5), 12, 5); } }
  // the ceiling beam and the tubes, each throwing a cone down
  box(x, w0, y(CEIL + 12), w1 - w0, 12, '#0c0807');
  x.fillStyle = 'rgba(' + O + ',.45)'; x.fillRect(w0, y(CEIL), w1 - w0, 1);

}


/** Yellow-and-black pillars between the stations, so each bench reads as its own bay. */
function pillar(x:CanvasRenderingContext2D,v:View,px:number){    const s = v.sx(px);
    if (!onScreen(v, s - 6, 12)) return;
    box(x, s - 5, v.y(CEIL), 10, CEIL, '#1d1712', rgba(O, 0.4));
    for (let h = 0; h < 30; h += 6) { x.fillStyle = (h / 6) % 2 ? rgba(YELLOW, 0.55) : '#0a0806'; x.fillRect(s - 4, v.y(h + 6), 8, 6); }
}

/** Each station's plate high on the wall: BAY 3·0N and what it tests; its number painted on the floor. */
function stationSign(x:CanvasRenderingContext2D,v:View,st:Station){const cx=v.sx((st.x0+st.x1)/2);if(!onScreen(v,cx-200,400))return;
    // two rods up to the ceiling beam: it hangs, it does not float
    const p = plate(x, cx, v.y(150), ['BAY 3·' + String(st.n).padStart(2, '0') + '  ' + st.title, st.sub], { size: 7 });
    x.fillStyle = 'rgba(120,90,70,.7)'; x.fillRect(p.l + 6, v.y(CEIL), 1, v.y(150) - v.y(CEIL)); x.fillRect(p.l + p.w - 7, v.y(CEIL), 1, v.y(150) - v.y(CEIL));
}
function stationCard(x:CanvasRenderingContext2D,v:View,st:Station){const cx=v.sx((st.x0+st.x1)/2);if(!onScreen(v,cx-200,400))return;
    // the readable test card at its foot (E there for how to test it)
    const sx = v.sx(st.sign??(st.x0+st.x1)/2);
    box(x, sx - 9, v.y(52), 18, 22, '#1a120b', rgba(O, 0.7));
    box(x, sx - 7, v.y(50), 14, 18, rgba(PAPER, 0.75));
    for (let k = 0; k < 4; k++) { x.fillStyle = 'rgba(40,24,12,.7)'; x.fillRect(sx - 5, v.y(46 - k * 4), k === 3 ? 6 : 10, 1); }
    x.fillStyle = '#2a1d14'; x.fillRect(sx - 1, v.y(30), 2, 30);
    tell(x, v.t, sx + 7, v.y(32), st.n);
}
// ---------- the intake: reset console, plan, header ----------




// ---------- station 01: noun kinds ----------




// ---------- station 02: cables ----------




// ---------- station 03: guards ----------




// ---------- station 04: sealed sectors ----------




// ---------- station 05: trace ----------




// ---------- station 06: the net ----------




// ---------- station 07: the watchdog ----------




// ---------- station 08: everyday use ----------




// ---------- station 09: the break room ----------




// ---------- station 10: the window, the time and the weather ----------

const SKYLINE = towers(77, 900, [14, 34], [40, 110], 0.18);

const DROPS = (() => { const r = rng(55); return Array.from({ length: 50 }, () => [r() * 260, r() * 122, 0.6 + r()]); })();


function windowBack(x: CanvasRenderingContext2D, v: View, m: SandboxViewState) {
  const { sx, y, t } = v, W = SB.window, l = sx(W.x0), top = y(W.h1), w = W.x1 - W.x0, h = W.h1 - W.h0;
  if (!onScreen(v, l - 20, w + 40)) return;
  const wx = m.snapshot.weather, d = m.snapshot.daylight;
  x.save(); x.beginPath(); x.rect(l, top, w, h); x.clip();
  // the sky by the hour, greyer under cloud and in smog
  const sky = x.createLinearGradient(0, top, 0, top + h);
  const lift = d * (1 - wx.cloud * 0.4);
  sky.addColorStop(0, 'rgb(' + Math.round(6 + 70 * lift) + ',' + Math.round(8 + 90 * lift) + ',' + Math.round(18 + 110 * lift) + ')');
  sky.addColorStop(1, 'rgb(' + Math.round(20 + 110 * lift + 40 * wx.smog) + ',' + Math.round(12 + 80 * lift + 30 * wx.smog) + ',' + Math.round(10 + 60 * lift) + ')');
  x.fillStyle = sky; x.fillRect(l, top, w, h);
  if (d < 0.3) { const r = rng(3); for (let i = 0; i < 18; i++) { x.fillStyle = 'rgba(255,217,165,' + (0.4 - d) * (0.3 + r()) + ')'; x.fillRect(l + r() * w, top + r() * h * 0.5, 1, 1); } }
  // the city, through the glass
  const vv = { ...v, sx: (wx2: number, p = 1) => Math.round(l + (wx2 - (v.cam - W.x0) * 0.12) * p) };
  drawTowers(x, vv, SKYLINE, 1, top + h, 0.35 - d * 0.15, d > 0.5 ? '#1c1a1c' : '#040200', 2);
  // weather: rain and storm streaks, fog and smog veils, a lightning flash
  if (wx.rain > 0.05 || wx.storm > 0.05) {
    x.strokeStyle = 'rgba(170,210,255,' + (0.2 + 0.25 * (wx.rain + wx.storm)) + ')';
    for (const [rx, ry, sp] of DROPS) { const yy = (ry + t * sp * 3) % h; x.beginPath(); x.moveTo(l + rx, top + yy); x.lineTo(l + rx - 2, top + yy + 6); x.stroke(); }
  }
  if (wx.storm > 0.3 && t % 400 < 4) { x.fillStyle = 'rgba(230,235,255,.5)'; x.fillRect(l, top, w, h); }
  if (wx.fog > 0.05) { x.fillStyle = 'rgba(150,150,165,' + 0.5 * wx.fog + ')'; x.fillRect(l, top, w, h); }
  if (wx.smog > 0.05) { x.fillStyle = 'rgba(120,92,36,' + 0.4 * wx.smog + ')'; x.fillRect(l, top, w, h); }
  if (wx.heat > 0.05) { x.fillStyle = 'rgba(255,170,90,' + 0.12 * wx.heat + ')'; x.fillRect(l, top, w, h); }
  x.restore();
}
function windowFront(x:CanvasRenderingContext2D,v:View){
  const { sx, y } = v, W = SB.window, l = sx(W.x0), top = y(W.h1), w = W.x1 - W.x0, h = W.h1 - W.h0;
  if (!onScreen(v, l - 20, w + 40)) return;

  // the frame and its mullions; the sill
  x.strokeStyle = rgba(O, 0.85); x.lineWidth = 2; x.strokeRect(l, top, w, h); x.lineWidth = 1;
  x.fillStyle = rgba(O, 0.7); x.fillRect(l + w / 3, top, 2, h); x.fillRect(l + (2 * w) / 3, top, 2, h);
  box(x, l - 6, y(W.h0), w + 12, 5, '#2a1a10', rgba(O, 0.75));

}
function wallClock(x:CanvasRenderingContext2D,v:View,m:SandboxViewState){const {sx,y}=v;
  // the clock and the forecast over the window
  const cx = sx(inputs.decorX??0);
  box(x, cx - 2, y(164), 4, 6, '#2a2420');
  x.fillStyle = '#d8d2c6'; x.beginPath(); x.arc(cx, y(150), 11, 0, 7); x.fill();
  x.strokeStyle = rgba(O, 0.8); x.stroke();
  const mm = m.snapshot.minute, ha = ((mm / 60) % 12) / 12 * Math.PI * 2 - Math.PI / 2, ma = (mm % 60) / 60 * Math.PI * 2 - Math.PI / 2;
  x.strokeStyle = '#1a120b'; x.lineWidth = 2; x.beginPath(); x.moveTo(cx, y(150)); x.lineTo(cx + Math.cos(ha) * 6, y(150) + Math.sin(ha) * 6); x.stroke();
  x.lineWidth = 1; x.beginPath(); x.moveTo(cx, y(150)); x.lineTo(cx + Math.cos(ma) * 9, y(150) + Math.sin(ma) * 9); x.stroke();
  plate(x, cx, y(136), [m.snapshot.hourLabel], { size: 7, col: rgba(PAPER, 0.95) });

}






/** Draw the bay and everything in it. */


function drawHeader(x:CanvasRenderingContext2D,v:View,_m:SandboxViewState){
const y = v.y;
const hx = v.sx(inputs.decorX ?? 0);
if (onScreen(v, hx - 150, 300)) {
    const p = plate(x, hx, y(162), ['REGISTRY QA BAY 3', 'DEVICES UNDER TEST'], { size: 9, col: rgba(PAPER, 0.95), rim: rgba(O, 0.85) });
    x.fillStyle = 'rgba(120,90,70,.7)'; x.fillRect(p.l + 8, y(CEIL), 1, 8); x.fillRect(p.l + p.w - 9, y(CEIL), 1, 8);
  }
}

function drawReset(x:CanvasRenderingContext2D,v:View,_m:SandboxViewState){
const y = v.y;
const t = v.t;
const rx = v.sx(inputs.decorX ?? 0);
if (onScreen(v, rx - 30, 60)) {
    box(x, rx - 12, y(34), 24, 34, '#2a2620', rgba(PAPER, 0.5));
    box(x, rx - 15, y(38), 30, 6, '#3a342c', rgba(PAPER, 0.55));
    x.fillStyle = rgba(RED, 0.95); x.beginPath(); x.arc(rx, y(42), 5, Math.PI, 0); x.fill();
    x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(rx - 2, y(46), 2, 1);
    x.strokeStyle = rgba(YELLOW, 0.7); x.strokeRect(rx - 7.5, y(48) + 0.5, 15, 6);
    plate(x, rx, y(30), ['RESET', 'BAY 3'], { col: rgba(RED, 0.95), fill: '#1a0808', rim: rgba(RED, 0.5) });
    tell(x, t, rx + 10, y(8), 9);
  }
}

function drawSensor(x:CanvasRenderingContext2D,v:View,m:SandboxViewState){
const r = at(v, 'sensor');
if (onScreen(v, r.l - 10, 40)) {
    const p = pulse(m, 'sensor');
    x.fillStyle = '#2a2420'; x.fillRect(r.cx - 1, r.t + 10, 3, r.h - 10);
    box(x, r.l + 2, r.t, r.w - 4, 12, '#d8d2c6', rgba(PAPER, 0.7));
    x.fillStyle = p > 0 ? rgba(RED, 0.5 + p * 0.5) : rgba(C, 0.55); x.beginPath(); x.arc(r.cx, r.t + 6, 4, 0, 7); x.fill();
    if (p > 0) { x.strokeStyle = rgba(RED, p * 0.6); x.beginPath(); x.arc(r.cx, r.t + 6, 6 + (1 - p) * 10, 0, 7); x.stroke(); }
    kindTag(x, r.cx, r.b + 6, 'SENSE');
  }
}

function drawLamp(x:CanvasRenderingContext2D,v:View,m:SandboxViewState){
const r = at(v, 'lamp');
if (onScreen(v, r.l - 30, 80)) {
    const on = !!m.get('lampOn');
    if (on) { const g = x.createRadialGradient(r.cx, r.t + 8, 2, r.cx, r.t + 8, 46); g.addColorStop(0, 'rgba(255,220,140,.35)'); g.addColorStop(1, 'rgba(255,220,140,0)'); x.fillStyle = g; x.fillRect(r.cx - 46, r.t - 38, 92, 92); }
    box(x, r.l + 3, r.b - 4, r.w - 6, 4, '#3a342c');
    x.fillStyle = '#4a4038'; x.fillRect(r.cx - 1, r.t + 14, 2, r.h - 18);
    x.fillStyle = on ? 'rgba(255,230,160,.98)' : 'rgba(120,110,90,.6)'; x.beginPath(); x.arc(r.cx, r.t + 8, 6, 0, 7); x.fill();
    x.strokeStyle = 'rgba(200,190,170,.7)'; x.beginPath(); x.arc(r.cx, r.t + 8, 8, 0, 7); x.moveTo(r.cx - 8, r.t + 8); x.lineTo(r.cx + 8, r.t + 8); x.moveTo(r.cx, r.t); x.lineTo(r.cx, r.t + 16); x.stroke();
    kindTag(x, r.cx, r.b + 6, 'ACT');
  }
}

function drawMemo(x:CanvasRenderingContext2D,v:View,m:SandboxViewState){
const r = at(v, 'memo');
if (onScreen(v, r.l - 10, 60)) {
    box(x, r.l, r.t, r.w, r.h - 4, '#141210', rgba(PAPER, 0.5));
    box(x, r.l + 2, r.t + 2, r.w - 4, r.h - 9, '#041416', rgba(C, 0.55));
    const memo = Number(m.get('memo') ?? 0);
    text(x, memo === 2 ? 'EMPTY' : 'MEMO ' + (memo + 1), r.cx, r.t + 8, rgba(C, 0.95), 7, '600');
    for (let k = 0; k < (memo === 2 ? 0 : 2); k++) { x.fillStyle = rgba(C, 0.45); x.fillRect(r.l + 5, r.t + 13 + k * 3, r.w - 10 - k * 8 - memo * 4, 1); }
    x.fillStyle = '#2a2420'; x.fillRect(r.cx - 4, r.b - 4, 8, 4);
    kindTag(x, r.cx, r.b + 6, 'STORE');
  }
}

function drawPort(x:CanvasRenderingContext2D,v:View,m:SandboxViewState){
const t = v.t;
const r = at(v, 'port');
if (onScreen(v, r.l - 10, 50)) {
    box(x, r.l, r.t, r.w, r.h, '#d8d2c6', rgba(PAPER, 0.75));
    box(x, r.cx - 5, r.t + 6, 10, 8, '#0a0a0c');
    const up = m.net.get('qasrv') === 'connected';
    x.fillStyle = up ? rgba(GREEN, 0.95) : rgba(C, Math.sin(t * 0.08) > 0 ? 0.9 : 0.3); x.fillRect(r.cx - 1, r.t + 17, 3, 2);
    x.strokeStyle = 'rgba(80,140,200,.7)'; x.beginPath(); x.moveTo(r.cx, r.t + 14); x.quadraticCurveTo(r.cx + 10, r.b + 20, r.cx + 4, v.y(30)); x.stroke();
    kindTag(x, r.cx, r.t - 13, 'LINK');
  }
}

function drawUnit7(x:CanvasRenderingContext2D,v:View,_m:SandboxViewState){
const t = v.t;
const r = at(v, 'unit7');
if (onScreen(v, r.l - 10, 50)) {
    box(x, r.l, r.t, r.w, r.h, '#2e3a40', rgba(PAPER, 0.55));
    box(x, r.l + 3, r.t + 4, r.w - 6, 20, '#041416', rgba(C, 0.7));
    const blink = Math.floor(t / 90) % 6 === 0;
    x.fillStyle = rgba(C, 0.95);
    if (!blink) { x.fillRect(r.cx - 7, r.t + 10, 3, 4); x.fillRect(r.cx + 4, r.t + 10, 3, 4); } else { x.fillRect(r.cx - 7, r.t + 12, 3, 1); x.fillRect(r.cx + 4, r.t + 12, 3, 1); }
    x.fillRect(r.cx - 4, r.t + 18, 8, 1);
    box(x, r.l + 6, r.t + 30, r.w - 12, 6, '#1a2428');
    text(x, '7', r.cx, r.t + 44, rgba(PAPER, 0.8), 8, '600');
    tell(x, t, r.l + r.w - 4, r.b - 4, 1);
    kindTag(x, r.cx, r.t - 13, 'DAEMON');
  }
}

function drawMetronome(x:CanvasRenderingContext2D,v:View,m:SandboxViewState){
const r = at(v, 'metronome');
if (onScreen(v, r.l - 10, 40)) {
    x.fillStyle = '#5a3a24'; x.beginPath(); x.moveTo(r.l + 2, r.b); x.lineTo(r.l + r.w - 2, r.b); x.lineTo(r.cx + 3, r.t); x.lineTo(r.cx - 3, r.t); x.closePath(); x.fill();
    x.strokeStyle = rgba(O, 0.6); x.stroke();
    const next = m.clocks.next('metronome.beat'), side = m.get('phase') === 'tick' ? 1 : -1;
    const ang = next ? side * 0.5 * Math.cos(Math.PI * (1 - next.ms / 1500)) : 0;
    x.strokeStyle = next ? 'rgba(230,220,200,.95)' : 'rgba(160,150,130,.6)'; x.lineWidth = 1.5;
    x.beginPath(); x.moveTo(r.cx, r.b - 4); x.lineTo(r.cx + Math.sin(ang) * 24, r.b - 4 - Math.cos(ang) * 24); x.stroke(); x.lineWidth = 1;
    x.fillStyle = 'rgba(230,220,200,.95)'; x.fillRect(Math.round(r.cx + Math.sin(ang) * 16) - 2, Math.round(r.b - 4 - Math.cos(ang) * 16) - 2, 4, 3);
    kindTag(x, r.cx, r.b + 6, 'CLOCK');
  }
}

function drawRecorder(x:CanvasRenderingContext2D,v:View,m:SandboxViewState){
const t = v.t;
const r = at(v, 'recorder');
if (onScreen(v, r.l - 10, 50)) {
    const on = !!m.get('recOn');
    box(x, r.l, r.t + 4, r.w, r.h - 4, '#2a2622', rgba(PAPER, 0.5));
    for (const dx of [-7, 7]) {
      const cx = r.cx + dx, cy = r.t + 10, a = on ? t * 0.12 : 0;
      x.strokeStyle = 'rgba(210,200,180,.85)'; x.beginPath(); x.arc(cx, cy, 5, 0, 7); x.stroke();
      x.beginPath(); x.moveTo(cx + Math.cos(a) * 5, cy + Math.sin(a) * 5); x.lineTo(cx - Math.cos(a) * 5, cy - Math.sin(a) * 5); x.stroke();
    }
    x.fillStyle = rgba(RED, on && Math.floor(t / 20) % 2 ? 0.95 : 0.2); x.fillRect(r.l + r.w - 5, r.b - 5, 3, 2);
    kindTag(x, r.cx, r.b + 6, 'LOG');
  }
}

function drawButtonCounterConduit(x:CanvasRenderingContext2D,v:View,m:SandboxViewState){
const y = v.y;
const b = at(v, 'button');
const c = at(v, 'counter');
if (onScreen(v, b.l - 10, c.l - b.l + 60)) {
    x.fillStyle = '#3a2a1c'; x.fillRect(b.cx - 1, y(52), 4, b.t - y(52)); x.fillRect(b.cx - 1, y(52), c.cx - b.cx + 2, 4);
    // and up into the counter's foot
    x.fillStyle = '#3a2a1c'; x.fillRect(c.cx - 2, c.b, 4, y(52) - c.b + 4);
    x.fillStyle = rgba(O, 0.6); x.fillRect(b.cx - 1, y(52), c.cx - b.cx + 2, 1);
    const live = pulse(m, 'button');
    if (live > 0) { x.fillStyle = rgba(YELLOW, live * 0.8); x.fillRect(b.cx, y(51), Math.round((c.l - b.cx) * (1 - live)), 2); }
    text(x, 'CONDUIT · FIXED', (b.cx + c.l) / 2 + 4, y(57), rgba(PAPER, 0.5), 7, '600');
  }
}

function drawButton(x:CanvasRenderingContext2D,v:View,m:SandboxViewState){
const t = v.t;
const b = at(v, 'button');
if (onScreen(v, b.l - 10, 40)) {
    const p = pulse(m, 'button');
    box(x, b.cx - 4, b.t + 8, 8, b.h - 8, '#3a342c', rgba(PAPER, 0.5));
    box(x, b.l, b.t + 4, b.w, 6, '#2a2620', rgba(PAPER, 0.6));
    x.fillStyle = rgba(RED, 0.95); x.beginPath(); x.arc(b.cx, b.t + 5 + (p > 0.5 ? 2 : 0), 7, Math.PI, 0); x.fill();
    tell(x, t, b.cx + 6, b.b - 6, 2);
  }
}

function drawBeacon(x:CanvasRenderingContext2D,v:View,m:SandboxViewState){
const t = v.t;
const r = at(v, 'beacon');
if (onScreen(v, r.l - 40, 100)) {
    const on = !!m.get('beaconOn');
    box(x, r.cx - 8, r.b - 3, 16, 3, '#3a342c');
    if (on) {
      const a = t * 0.15, dx = Math.cos(a);
      const g = x.createRadialGradient(r.cx + dx * 20, r.t + 10, 1, r.cx + dx * 20, r.t + 10, 34);
      g.addColorStop(0, 'rgba(255,150,40,.35)'); g.addColorStop(1, 'rgba(255,150,40,0)'); x.fillStyle = g; x.fillRect(r.cx - 54, r.t - 24, 108, 68);
    }
    x.fillStyle = on ? 'rgba(255,160,50,.95)' : 'rgba(150,90,40,.6)'; x.beginPath(); x.arc(r.cx, r.b - 3, 8, Math.PI, 0); x.fill();
    x.fillStyle = 'rgba(255,255,255,.3)'; x.fillRect(r.cx - 4, r.b - 9, 2, 3);
  }
}

function drawHorn(x:CanvasRenderingContext2D,v:View,m:SandboxViewState){
const r = at(v, 'horn');
if (onScreen(v, r.l - 20, 70)) {
    const p = pulse(m, 'horn');
    box(x, r.l, r.t + 5, 8, 8, '#4a4038', rgba(PAPER, 0.5));
    x.fillStyle = '#6a5a48'; x.beginPath(); x.moveTo(r.l + 8, r.t + 7); x.lineTo(r.l + r.w, r.t); x.lineTo(r.l + r.w, r.t + r.h); x.lineTo(r.l + 8, r.t + 11); x.closePath(); x.fill();
    if (p > 0) for (let k = 0; k < 3; k++) { x.strokeStyle = rgba(YELLOW, p * (0.8 - k * 0.2)); x.beginPath(); x.arc(r.l + r.w, r.t + r.h / 2, 5 + k * 5 + (1 - p) * 6, -0.8, 0.8); x.stroke(); }
  }
}

function drawCounter(x:CanvasRenderingContext2D,v:View,m:SandboxViewState){
const c = at(v, 'counter');
if (onScreen(v, c.l - 10, 60)) {
    box(x, c.l, c.t, c.w, c.h, '#1a1612', rgba(PAPER, 0.55));
    box(x, c.l + 3, c.t + 3, c.w - 6, c.h - 6, '#0a0a06', rgba(YELLOW, 0.4));
    text(x, String(Math.min(9999, Number(m.get('count') ?? 0))).padStart(4, '0'), c.cx, c.t + c.h / 2 + 0.5, pulse(m, 'counter') > 0 ? rgba(YELLOW, 1) : rgba(YELLOW, 0.8), 9, '600');
  }
}

function drawPlate(x:CanvasRenderingContext2D,v:View,m:SandboxViewState){
const r = at(v, 'plate');
if (onScreen(v, r.l - 80, 220)) {
    const p = pulse(m, 'plate');
    for (let k = 0; k < r.w; k += 6) { x.fillStyle = (k / 6) % 2 ? rgba(YELLOW, 0.7) : '#0a0806'; x.fillRect(r.l + k, r.b - 6 + (p > 0.4 ? 1 : 0), 6, 3); }
    box(x, r.l + 3, r.b - 10 + (p > 0.4 ? 2 : 0), r.w - 6, 5, '#5a5048', rgba(PAPER, 0.6));
    x.fillStyle = p > 0 ? rgba(GREEN, 0.95) : rgba(C, 0.7); x.fillRect(r.cx - 1, r.t, 3, 3);
  }
}

function drawHatch(x:CanvasRenderingContext2D,v:View,m:SandboxViewState){
const r = at(v, 'hatch');
if (onScreen(v, r.l - 20, 70)) {
    const open = !!m.get('hatchOpen');
    box(x, r.l, r.t, r.w, r.h, 'rgba(0,0,0,0)', rgba(O, 0.8));
    x.fillStyle = '#2a1d14'; x.fillRect(r.l, r.t, 3, r.h); x.fillRect(r.l + r.w - 3, r.t, 3, r.h); x.fillRect(r.l, r.t, r.w, 3);
    if (open) { box(x, r.l + 3, r.t + 3, 8, r.h - 3, '#4a3a2c', rgba(PAPER, 0.5)); x.fillStyle = rgba(GREEN, 0.9); x.fillRect(r.cx - 2, r.t - 5, 5, 2); }
    else { box(x, r.l + 3, r.t + 3, r.w - 6, r.h - 3, '#3a2c20', rgba(PAPER, 0.4)); x.fillStyle = rgba(C, 0.85); x.fillRect(r.l + r.w - 9, r.t + r.h / 2, 2, 5); x.fillStyle = rgba(RED, 0.8); x.fillRect(r.cx - 2, r.t - 5, 5, 2); }
    x.fillStyle = '#1a120b'; x.fillRect(r.l - 3, r.b - 2, r.w + 6, 2);
  }
}

function drawFan(x:CanvasRenderingContext2D,v:View,m:SandboxViewState){
const t = v.t;
const r = at(v, 'fan');
if (onScreen(v, r.l - 10, 50)) {
    const on = !!m.get('fanOn'), a = on ? t * 0.4 : 0.3;
    box(x, r.l, r.t, r.w, r.h, '#1a1612', rgba(PAPER, 0.55));
    x.fillStyle = '#5a5048';
    for (let k = 0; k < 3; k++) { const aa = a + k * 2.09; x.beginPath(); x.moveTo(r.cx, r.t + r.h / 2); x.arc(r.cx, r.t + r.h / 2, 11, aa, aa + 0.8); x.closePath(); x.fill(); }
    x.strokeStyle = 'rgba(200,190,170,.5)'; for (let k = 0; k < 3; k++) { x.beginPath(); x.arc(r.cx, r.t + r.h / 2, 5 + k * 4, 0, 7); x.stroke(); }
    if (on) { x.strokeStyle = rgba(C, 0.25); for (let k = 0; k < 3; k++) { const yy = r.b + 4 + ((t * 0.8 + k * 6) % 18); x.beginPath(); x.moveTo(r.cx - 8, yy); x.lineTo(r.cx + 8, yy); x.stroke(); } }
  }
}

function drawLogin(x:CanvasRenderingContext2D,v:View,m:SandboxViewState){
const r = at(v, 'login');
if (onScreen(v, r.l - 10, 60)) {
    const ok = !!m.get('loginOk'), locked = m.lockLeft('login.login') > 0;
    x.fillStyle = '#2a2420'; x.fillRect(r.cx - 2, r.t + 26, 4, r.h - 26); x.fillRect(r.cx - 9, r.b - 2, 18, 2);
    box(x, r.l, r.t, r.w, 28, '#1a1612', rgba(PAPER, 0.55));
    box(x, r.l + 3, r.t + 3, r.w - 6, 20, '#041416', rgba(ok ? GREEN : locked ? RED : C, 0.7));
    text(x, ok ? 'OPEN' : locked ? 'LOCKED' : 'LOGIN', r.cx, r.t + 13, rgba(ok ? GREEN : locked ? RED : C, 0.95), 7, '600');
    box(x, r.l + r.w - 8, r.t - 3, 9, 8, 'rgba(240,220,90,.9)');
  }
}

function drawRings(x:CanvasRenderingContext2D,v:View,m:SandboxViewState){
const t = v.t;
const r = at(v, 'rings');
if (onScreen(v, r.l - 10, 60)) {
    const open = !!m.get('ringsOpen');
    box(x, r.l, r.t, r.w, r.h, '#3a4048', rgba(PAPER, 0.55));
    for (let k = 0; k < 3; k++) { x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(r.l + 4, r.t + 4 + k * 3, r.w - 8, 1); }
    const cx = r.cx, cy = r.t + 26;
    [10, 7, 4].forEach((rad, k) => {
      const a = open ? -Math.PI / 2 : t * [0.04, -0.055, 0.07][k];
      x.strokeStyle = open ? rgba(GREEN, 0.8) : rgba(C, 0.8 - k * 0.15); x.beginPath(); x.arc(cx, cy, rad, a + 0.5, a + 0.5 + Math.PI * 1.65); x.stroke();
    });
    if (open) { box(x, r.l + r.w - 2, r.t + 2, 6, r.h - 2, '#4a5058', rgba(PAPER, 0.5)); }
  }
}

function drawCipher(x:CanvasRenderingContext2D,v:View,m:SandboxViewState){
const t = v.t;
const r = at(v, 'cipher');
if (onScreen(v, r.l - 10, 50)) {
    const open = !!m.get('cipherOpen');
    box(x, r.l, r.t + 6, r.w, r.h - 6, '#5a3a24', rgba(PAPER, 0.5));
    if (open) { box(x, r.l, r.t - 6, r.w, 4, '#6a4a30', rgba(GREEN, 0.7)); }
    else {
      x.strokeStyle = 'rgba(220,180,90,.9)'; x.beginPath(); x.arc(r.cx, r.t + 6, 8, Math.PI, 0); x.stroke();
      for (let k = 0; k < 5; k++) { const a = Math.PI + k * 0.7 + t * 0.01; x.fillStyle = 'rgba(220,180,90,.8)'; x.fillRect(Math.round(r.cx + Math.cos(a) * 6), Math.round(r.t + 6 + Math.sin(a) * 6), 1, 1); }
    }
    tell(x, t, r.l + r.w - 3, r.b - 3, 4);
  }
}

function drawCryptex(x:CanvasRenderingContext2D,v:View,m:SandboxViewState){
const r = at(v, 'cryptex');
if (onScreen(v, r.l - 10, 50)) {
    const open = !!m.get('cryptexOpen'), gap = open ? 5 : 0;
    x.fillStyle = '#2a1d14'; x.fillRect(r.l + 2, r.b - 3, r.w - 4, 3);
    box(x, r.l - gap, r.t + 3, 5, 10, '#8a6a30');
    for (let k = 0; k < 4; k++) box(x, r.l + 6 + k * 6 - (k < 2 ? gap : -gap), r.t + 2, 5, 12, '#c8a24a', 'rgba(60,40,10,.8)');
    box(x, r.l + r.w - 5 + gap, r.t + 3, 5, 10, '#8a6a30');
    if (open) { x.fillStyle = rgba(PAPER, 0.9); x.fillRect(r.cx - 4, r.t + 6, 8, 3); }
  }
}

function drawMorse(x:CanvasRenderingContext2D,v:View,m:SandboxViewState){
const t = v.t;
const r = at(v, 'morse');
if (onScreen(v, r.l - 30, 80)) {
    const open = !!m.get('morseOpen');
    x.fillStyle = '#2a2420'; x.fillRect(r.l - 6, r.t + 10, 8, 3); x.fillRect(r.l - 8, r.t + 4, 3, 16);
    box(x, r.l, r.t, r.w, r.h, '#3a342c', rgba(PAPER, 0.5));
    // O = ---, K = -.- : units of 220 ms, a dash 3 units, 1 between marks, 3 between letters, 10 at the end
    const seq = [3, 1, 3, 1, 3, 3, 3, 1, 1, 1, 3, 10], unit = 13; // frames per unit (about 220 ms)
    let at0 = Math.floor(t / unit) % seq.reduce((a, b) => a + b, 0), on = false;
    for (let i = 0; i < seq.length; i++) { if (at0 < seq[i]) { on = i % 2 === 0; break; } at0 -= seq[i]; }
    const lit = open || on;
    if (lit) { const g = x.createRadialGradient(r.cx, r.t + r.h / 2, 1, r.cx, r.t + r.h / 2, 26); g.addColorStop(0, rgba(open ? GREEN : '255,230,160', 0.35)); g.addColorStop(1, rgba(open ? GREEN : '255,230,160', 0)); x.fillStyle = g; x.fillRect(r.cx - 26, r.t - 13, 52, 52); }
    x.fillStyle = open ? rgba(GREEN, 0.95) : on ? 'rgba(255,240,190,.98)' : 'rgba(90,80,60,.8)'; x.beginPath(); x.arc(r.cx, r.t + r.h / 2, 7, 0, 7); x.fill();
  }
}

function drawCutter(x:CanvasRenderingContext2D,v:View,m:SandboxViewState){
const t = v.t;
const r = at(v, 'cutter');
if (onScreen(v, r.l - 10, 50)) {
    const p = pulse(m, 'cutter');
    x.fillStyle = '#2a2420'; x.fillRect(r.cx - 2, r.b, 4, Math.max(0, v.gy - r.b)); x.fillRect(r.cx - 8, v.gy - 2, 16, 2);
    box(x, r.l, r.t, r.w, r.h, '#4a4a50', rgba(PAPER, 0.55));
    box(x, r.cx - 6, r.t + 8, 12, 3, '#0a0a0c', rgba(C, 0.7));
    if (p > 0) for (let k = 0; k < 5; k++) { x.fillStyle = rgba(YELLOW, p); x.fillRect(r.cx - 6 + ((k * 37 + Math.floor(t)) % 12), r.t + 6 - k, 1, 1); }
    x.fillStyle = 'rgba(200,170,90,.9)'; x.fillRect(r.cx + 2, r.t + 15, 6, 3);
  }
}

function drawCabinet(x:CanvasRenderingContext2D,v:View,m:SandboxViewState){
const r = at(v, 'cabinet');
if (onScreen(v, r.l - 10, 60)) {
    box(x, r.l, r.t, r.w, r.h, '#3a3e44', rgba(PAPER, 0.6));
    const drawers: [string, string][] = [['keyed', 'A · KEY'], ['seq', 'B · SEQ'], ['cond', 'C · IF']];
    drawers.forEach(([id, label], k) => {
      const open = m.opened.has('cabinet/' + id), top = r.t + 6 + k * 24, out = open ? 6 : 0;
      box(x, r.l + 3 + out, top, r.w - 6, 20, '#4a4e56', rgba(PAPER, 0.5));
      text(x, label, r.cx + out, top + 7, rgba(PAPER, 0.85), 7, '600');
      x.fillStyle = open ? rgba(GREEN, 0.95) : rgba(RED, 0.85); x.fillRect(r.cx - 2 + out, top + 13, 5, 3);
    });
  }
}

function drawRgb(x:CanvasRenderingContext2D,v:View,m:SandboxViewState){
const r = at(v, 'rgb');
if (onScreen(v, r.l - 10, 60)) {
    box(x, r.l, r.t, r.w, r.h, '#1a1612', rgba(PAPER, 0.55));
    (['red', 'green', 'blue'] as const).forEach((n, k) => {
      const p = pulse(m, 'rgb.' + n), col = [RED, GREEN, '80,140,255'][k];
      x.fillStyle = rgba(col, 0.55 + p * 0.45); x.beginPath(); x.arc(r.l + 8 + k * 13, r.t + r.h / 2, 4.5, 0, 7); x.fill();
      if (p > 0) { x.strokeStyle = rgba(col, p); x.beginPath(); x.arc(r.l + 8 + k * 13, r.t + r.h / 2, 6 + (1 - p) * 4, 0, 7); x.stroke(); }
    });
  }
}

function drawMains(x:CanvasRenderingContext2D,v:View,m:SandboxViewState){
const t = v.t;
const r = at(v, 'mains');
if (onScreen(v, r.l - 10, 50)) {
    const up = !!m.get('mains');
    box(x, r.l, r.t, r.w, r.h, '#4a2a1a', rgba(PAPER, 0.55));
    box(x, r.cx - 2, r.t + 6, 4, r.h - 12, '#141416');
    x.fillStyle = up ? rgba(GREEN, 0.9) : rgba(RED, 0.9); x.fillRect(r.cx - 6, up ? r.t + 6 : r.b - 12, 12, 6);
    text(x, 'MAINS', r.cx, r.t - 5, rgba(PAPER, 0.85), 7, '600');
    tell(x, t, r.l + r.w - 3, r.b - 3, 6);
  }
}

function drawAudit(x:CanvasRenderingContext2D,v:View,m:SandboxViewState){
const t = v.t;
const tr = m.traceOf('audit');
const locked = m.lockLeft('audit');
const r = at(v, 'audit');
if (onScreen(v, r.l - 10, 70)) {
    const on = !!m.get('auditOn');
    box(x, r.l, r.b - 22, r.w, 4, '#4a3a2c', rgba(PAPER, 0.45));
    x.fillStyle = '#241a12'; x.fillRect(r.l + 3, r.b - 18, 3, 18); x.fillRect(r.l + r.w - 6, r.b - 18, 3, 18);
    box(x, r.l + 3, r.t, r.w - 6, 22, '#1a1612', rgba(PAPER, 0.55));
    box(x, r.l + 5, r.t + 3, r.w - 10, 16, '#160404', rgba(locked ? RED : C, 0.6));
    text(x, locked ? 'LOCK ' + Math.ceil(locked / 1000) + 'S' : 'LOG ' + Math.round(tr) + '%', r.cx, r.t + 11, rgba(locked ? RED : tr > 70 ? RED : PAPER, 0.95), 7, '600');
    x.fillStyle = rgba(RED, on && Math.floor(t / 18) % 2 ? 0.95 : 0.2); x.fillRect(r.l + r.w - 12, r.t - 4, 4, 3);
  }
}

function drawSpool(x:CanvasRenderingContext2D,v:View,m:SandboxViewState){
const t = v.t;
const tr = m.traceOf('audit');
const locked = m.lockLeft('audit');
const r = at(v, 'spool');
if (onScreen(v, r.l - 10, 60)) {
    const turning = !!m.get('auditOn') && m.links.some((l) => l.from === 'audit.log:entry') && tr > 0 && !locked;
    box(x, r.l, r.t, r.w, r.h, '#1a1612', rgba(PAPER, 0.5));
    const a = turning ? t * 0.1 : 0;
    x.strokeStyle = 'rgba(210,200,180,.85)'; x.beginPath(); x.arc(r.cx, r.t + r.h / 2, 11, 0, 7); x.stroke();
    for (let k = 0; k < 3; k++) { const aa = a + k * 2.09; x.beginPath(); x.moveTo(r.cx, r.t + r.h / 2); x.lineTo(r.cx + Math.cos(aa) * 11, r.t + r.h / 2 + Math.sin(aa) * 11); x.stroke(); }
    // the cable from the desk, along the wall
    const d = at(v, 'audit');
    x.strokeStyle = m.links.some((l) => l.from === 'audit.log:entry') ? rgba(RED, 0.5) : 'rgba(80,60,50,.4)';
    x.beginPath(); x.moveTo(d.l + d.w - 8, d.t + 6); x.quadraticCurveTo(d.l + d.w + 10, r.b + 16, r.l, r.t + r.h / 2); x.stroke();
  }
}

function drawTraceMeter(x:CanvasRenderingContext2D,v:View,m:SandboxViewState){
const y = v.y;
const t = v.t;
const tr = m.traceOf('audit');
const locked = m.lockLeft('audit');
const mx = v.sx(inputs.decorX ?? 0);
if (onScreen(v, mx - 30, 60)) {
    box(x, mx - 14, y(118), 28, 74, '#1a1612', rgba(PAPER, 0.55));
    box(x, mx - 9, y(112), 18, 56, '#0a0606', rgba(RED, 0.4));
    const fh = Math.round(54 * tr / 100);
    if (locked) { for (let k = 0; k < 56; k += 4) { x.fillStyle = rgba(RED, (k / 4) % 2 ? 0.7 : 0.25); x.fillRect(mx - 8, y(57) - k, 16, 4); } }
    else { x.fillStyle = tr > 70 ? rgba(RED, Math.floor(t / 10) % 2 ? 0.95 : 0.6) : rgba(YELLOW, 0.85); x.fillRect(mx - 8, y(57) - fh, 16, fh); }
    text(x, 'TRACE', mx, y(50), rgba(PAPER, 0.85), 7, '600');
    text(x, locked ? Math.ceil(locked / 1000) + 'S' : Math.round(tr) + '%', mx, y(124), rgba(locked || tr > 70 ? RED : PAPER, 0.95), 7, '600');
  }
}

function drawNetjack(x:CanvasRenderingContext2D,v:View,_m:SandboxViewState){
const t = v.t;
const r = at(v, 'netjack');
if (onScreen(v, r.l - 10, 60)) {
    box(x, r.l, r.t, r.w, r.h, '#d8d2c6', rgba(PAPER, 0.75));
    box(x, r.cx - 5, r.t + 8, 10, 8, '#0a0a0c');
    x.fillStyle = rgba(C, Math.sin(t * 0.07) > 0 ? 0.95 : 0.35); x.fillRect(r.cx - 1, r.t + 20, 3, 2);
    text(x, 'LAN', r.cx, r.t + 27, 'rgba(40,30,20,.85)', 7, '600');
  }
}

function drawServerRack(x:CanvasRenderingContext2D,v:View,m:SandboxViewState){
const y = v.y;
const t = v.t;
const kx = v.sx(inputs.decorX ?? 0);
if (onScreen(v, kx - 20, 40)) {
    const up = m.net.get('qasrv') === 'connected';
    box(x, kx - 17, y(92), 34, 92, '#121418', rgba(PAPER, 0.4));
    for (let k = 0; k < 8; k++) {
      box(x, kx - 14, y(88 - k * 10), 28, 8, '#1a1c22', 'rgba(255,255,255,.08)');
      const lit = (Math.floor(t / (6 + k)) + k) % 3 !== 0;
      x.fillStyle = up ? rgba(GREEN, lit ? 0.9 : 0.3) : rgba(C, lit ? 0.6 : 0.2); x.fillRect(kx + 8, y(85 - k * 10), 2, 2);
    }
    plate(x, kx, y(104), ['QA-SRV 01'], { size: 7 });
    // its cable to the jack and to the bell
    const j = at(v, 'netjack'), b = at(v, 'bell');
    x.strokeStyle = 'rgba(80,140,200,.6)'; x.beginPath(); x.moveTo(j.l + j.w, j.t + 12); x.quadraticCurveTo(kx - 24, j.b + 14, kx - 17, y(60)); x.stroke();
    x.strokeStyle = 'rgba(120,90,70,.6)'; x.beginPath(); x.moveTo(kx + 17, y(80)); x.lineTo(b.l, b.t + 10); x.stroke();
  }
}

function drawBell(x:CanvasRenderingContext2D,v:View,m:SandboxViewState){
const t = v.t;
const r = at(v, 'bell');
if (onScreen(v, r.l - 20, 60)) {
    const p = pulse(m, 'bell'), sh = p > 0 ? Math.sin(t * 2) * 2 * p : 0;
    box(x, r.cx - 3, r.t - 2, 6, 3, '#3a342c');
    x.fillStyle = 'rgba(220,180,90,.95)'; x.beginPath(); x.arc(r.cx + sh, r.t + 12, 10, Math.PI, 0); x.fill();
    x.fillRect(r.cx - 10 + sh, r.t + 12, 20, 3);
    x.fillStyle = '#3a2a1a'; x.fillRect(r.cx - 1 - sh, r.t + 15, 3, 3);
    if (p > 0) for (let k = 0; k < 2; k++) { x.strokeStyle = rgba(YELLOW, p * 0.7); x.beginPath(); x.arc(r.cx, r.t + 10, 14 + k * 5 + (1 - p) * 6, Math.PI * 1.1, Math.PI * 1.9); x.stroke(); }
  }
}

function drawPrinter(x:CanvasRenderingContext2D,v:View,m:SandboxViewState){
const r = at(v, 'printer');
if (onScreen(v, r.l - 10, 50)) {
    const p = pulse(m, 'printer');
    x.fillStyle = '#2a2420'; x.fillRect(r.l + 2, r.b, 3, Math.max(0, v.gy - r.b)); x.fillRect(r.l + r.w - 5, r.b, 3, Math.max(0, v.gy - r.b)); x.fillRect(r.l, r.b, r.w, 3);
    box(x, r.l, r.t, r.w, r.h, '#c8c0b0', rgba(PAPER, 0.7));
    box(x, r.l + 4, r.t + 4, r.w - 8, 3, '#0a0a0c');
    if (p > 0) { const len = Math.round((1 - p) * 14); box(x, r.l + 6, r.t + 5 - len, r.w - 12, len, rgba(PAPER, 0.95)); }
    x.fillStyle = rgba(C, 0.8); x.fillRect(r.l + r.w - 6, r.t + r.h - 6, 3, 2);
  }
}

function drawStamp(x:CanvasRenderingContext2D,v:View,m:SandboxViewState){
const r = at(v, 'stamp');
if (onScreen(v, r.l - 10, 50)) {
    const p = pulse(m, 'stamp'), ram = p > 0 ? Math.round(Math.sin(p * Math.PI) * 12) : 0, fr = m.frozen('stamp');
    box(x, r.l, r.t, r.w, 6, '#4a4a50', rgba(PAPER, 0.5));
    x.fillStyle = '#3a3a40'; x.fillRect(r.l + 2, r.t, 4, r.h); x.fillRect(r.l + r.w - 6, r.t, 4, r.h);
    box(x, r.cx - 6, r.t + 6 + ram, 12, 14, fr ? '#5a2a2a' : '#6a6a70', rgba(PAPER, 0.5));
    box(x, r.l + 6, r.b - 10, r.w - 12, 10, '#2a2420', rgba(PAPER, 0.4));
    box(x, r.cx - 8, r.b - 13, 16, 3, rgba(PAPER, 0.85));
    if (Number(m.get('stamped') ?? 0) > 0) { x.fillStyle = rgba(RED, 0.75); x.fillRect(r.cx - 3, r.b - 13, 6, 2); }
    wdLamp(x, m, v, 'stamp');
  }
}

function drawConveyor(x:CanvasRenderingContext2D,v:View,m:SandboxViewState){
const t = v.t;
const r = at(v, 'conveyor');
if (onScreen(v, r.l - 10, 100)) {
    const moving = !!m.get('belt') && !m.frozen('conveyor');
    box(x, r.l, r.t + 16, r.w, 8, '#2a2622', rgba(PAPER, 0.5));
    x.fillStyle = '#241a12'; x.fillRect(r.l + 4, r.t + 24, 3, r.h - 24); x.fillRect(r.l + r.w - 7, r.t + 24, 3, r.h - 24);
    const off = moving ? (t * 0.6) % 26 : 0;
    for (let k = 0; k < 3; k++) {
      const bx = r.l + 2 + ((k * 26 + off) % (r.w - 16));
      box(x, Math.round(bx), r.t + 4, 12, 12, ['#8a6a40', '#7a5a38', '#9a7a48'][k], 'rgba(40,24,12,.8)');
    }
    for (let k = 0; k < 6; k++) { x.fillStyle = 'rgba(200,190,170,.4)'; x.fillRect(r.l + 4 + k * 14 + (moving ? Math.floor(t / 4) % 3 : 0), r.t + 19, 2, 2); }
    wdLamp(x, m, v, 'conveyor');
  }
}

function drawSiren(x:CanvasRenderingContext2D,v:View,m:SandboxViewState){
const t = v.t;
const r = at(v, 'siren');
if (onScreen(v, r.l - 40, 100)) {
    const p = pulse(m, 'siren');
    box(x, r.cx - 6, r.b - 3, 12, 3, '#3a342c');
    if (p > 0) { const a = t * 0.3, g = x.createRadialGradient(r.cx + Math.cos(a) * 18, r.t + 10, 1, r.cx + Math.cos(a) * 18, r.t + 10, 30); g.addColorStop(0, rgba(RED, 0.4 * p)); g.addColorStop(1, rgba(RED, 0)); x.fillStyle = g; x.fillRect(r.cx - 50, r.t - 20, 100, 60); }
    x.fillStyle = p > 0 ? rgba(RED, 0.95) : 'rgba(140,40,40,.7)'; x.beginPath(); x.arc(r.cx, r.b - 3, 8, Math.PI, 0); x.fill();
    wdLamp(x, m, v, 'siren');
  }
}

function drawCoffee(x:CanvasRenderingContext2D,v:View,m:SandboxViewState){
const t = v.t;
const r = at(v, 'coffee');
if (onScreen(v, r.l - 10, 60)) {
    const p = pulse(m, 'coffee.cup');
    box(x, r.l, r.t, r.w, r.h, '#2a2a30', rgba(PAPER, 0.55));
    box(x, r.l + 4, r.t + 4, r.w - 8, 12, '#041416', rgba(C, 0.6));
    text(x, Number(m.get('cups') ?? 0) + ' CUP', r.cx, r.t + 10, rgba(C, 0.95), 7, '600');
    box(x, r.l + 6, r.t + 26, r.w - 12, 20, '#0a0a0c');
    box(x, r.cx - 4, r.t + 38, 8, 8, 'rgba(230,220,200,.9)');
    if (p > 0) for (let k = 0; k < 3; k++) { x.fillStyle = 'rgba(230,230,230,' + 0.4 * p + ')'; x.fillRect(r.cx - 3 + k * 3, r.t + 36 - ((t * 0.5 + k * 4) % 10), 1, 2); }
    tell(x, t, r.l + r.w - 4, r.b - 4, 7);
  }
}

function drawReader(x:CanvasRenderingContext2D,v:View,m:SandboxViewState){
const r = at(v, 'reader');
if (onScreen(v, r.l - 10, 50)) {
    const p = pulse(m, 'reader');
    x.fillStyle = '#2a2420'; x.fillRect(r.cx - 2, r.b, 4, Math.max(0, v.gy - r.b)); x.fillRect(r.cx - 8, v.gy - 2, 16, 2);
    box(x, r.l, r.t, r.w, r.h, '#1a2a2a', rgba(PAPER, 0.55));
    box(x, r.l + 4, r.t + 4, r.w - 8, 8, '#041416', rgba(p > 0 ? GREEN : C, 0.7));
    box(x, r.cx - 6, r.t + 16, 12, 2, '#000');
    x.fillStyle = rgba(p > 0 ? GREEN : C, 0.9); x.fillRect(r.cx - 1, r.t + 21, 3, 2);
  }
}

function drawChipDispenser(x:CanvasRenderingContext2D,v:View,_m:SandboxViewState){
const y = v.y;
const t = v.t;
const dx = v.sx(inputs.decorX ?? 0);
if (onScreen(v, dx - 20, 40)) {
    box(x, dx - 12, y(78), 24, 34, '#22302a', rgba(PAPER, 0.5));
    box(x, dx - 9, y(74), 18, 14, '#0a100e', rgba(PAPER, 0.3));
    for (let k = 0; k < 4; k++) { x.fillStyle = 'rgba(190,200,210,.75)'; x.fillRect(dx - 7 + (k % 2) * 8, y(72) + Math.floor(k / 2) * 6, 6, 4); }
    box(x, dx - 5, y(52), 10, 4, '#020303', rgba(C, 0.7));
    plate(x, dx, y(92), ['BLANK CHIPS'], { size: 7 });
    tell(x, t, dx + 9, y(47), 8);
  }
}

function drawTill(x:CanvasRenderingContext2D,v:View,m:SandboxViewState){
const r = at(v, 'till');
if (onScreen(v, r.l - 10, 50)) {
    const p = pulse(m, 'till');
    box(x, r.l, r.t + 8, r.w, r.h - 8, '#3a342c', rgba(PAPER, 0.55));
    box(x, r.l + 4, r.t, r.w - 8, 10, '#041416', rgba(C, 0.6));
    text(x, (Number(m.get('paid') ?? 0)) + 'T', r.cx, r.t + 5.5, rgba(C, 0.95), 7, '600');
    if (p > 0) { box(x, r.l + 2, r.b - 6, r.w - 4, 5, '#4a4038', rgba(PAPER, 0.5)); box(x, r.cx - 3, r.t - 4 - Math.round((1 - p) * 6), 6, 6, rgba(PAPER, 0.95)); }
    plate(x, r.cx, r.b + 6, ['1 TOKEN'], { size: 7, col: rgba(YELLOW, 0.9) });
  }
}

function drawRadiator(x:CanvasRenderingContext2D,v:View,_m:SandboxViewState){
const y = v.y;
const t = v.t;
const rx = v.sx(inputs.decorX ?? 0);
if (onScreen(v, rx - 30, 60)) {
    box(x, rx - 22, y(22), 44, 20, '#4a3a34', rgba(PAPER, 0.4));
    for (let k = 0; k < 7; k++) { x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(rx - 19 + k * 6, y(20), 2, 16); }
    for (let k = 0; k < 3; k++) { x.fillStyle = 'rgba(255,150,90,.12)'; x.fillRect(rx - 12 + k * 10, y(26 + ((t * 0.3 + k * 9) % 18)), 1, 3); }
  }
}

function drawTeaTable(x:CanvasRenderingContext2D,v:View,_m:SandboxViewState){
const y = v.y;
const t = v.t;
const tx = v.sx(inputs.decorX ?? 0);
if (onScreen(v, tx - 60, 120)) {
    box(x, tx - 14, y(24), 28, 3, '#5a4a3a', rgba(PAPER, 0.4));
    x.fillStyle = '#2a1d14'; x.fillRect(tx - 1, y(21), 2, 21);
    box(x, tx - 8, y(31), 7, 7, '#d8d2c6'); box(x, tx + 3, y(30), 5, 6, '#c86a3a');
    x.fillStyle = 'rgba(230,230,230,.35)'; x.fillRect(tx - 5, y(34 + (t * 0.2) % 6), 1, 2);

  }
}

function drawTeaStool(x:CanvasRenderingContext2D,v:View,_m:SandboxViewState){const{sx,y}=v;if(onScreen(v,sx((inputs.decorX??0)+25)-60,120)){    const stool = sx(inputs.decorX??0);
    box(x, stool - 7, y(16), 14, 3, '#3a2a1c', rgba(O, 0.5)); x.fillStyle = '#241a12'; x.fillRect(stool - 1, y(13), 2, 13);
}}
function drawTeaPlant(x:CanvasRenderingContext2D,v:View,_m:SandboxViewState){const{sx,y}=v;if(onScreen(v,sx((inputs.decorX??0)+60)-60,120)){    const px = sx(inputs.decorX??0);
    box(x, px - 6, y(12), 12, 12, '#5a3a24', rgba(O, 0.4));
    x.fillStyle = 'rgba(60,140,70,.85)'; for (let k = 0; k < 5; k++) x.fillRect(px - 6 + k * 3, y(24 + (k % 2) * 6), 2, 12 + (k % 2) * 6);}}
function drawRoomNotices(x:CanvasRenderingContext2D,v:View,_m:SandboxViewState){
const t = v.t;
const sx = v.sx;
const y = v.y;
const bx = v.sx(inputs.decorX ?? 0);
if (onScreen(v, bx - 60, 120)) {
    notice(x, t, sx((inputs.decorX ?? 0)-65), y(110), 44, 30, ['SHIFT', 'ROTA']);
    taped(x, v, { x: (inputs.decorX ?? 0)+10, h: 100, text: ['HAPPY 1,000,000TH', 'TEST, UNIT 7', '- BAY 3'], tilt: 0.04 });
  }
}

function drawNightlight(x:CanvasRenderingContext2D,v:View,m:SandboxViewState){
const r = at(v, 'nightlight');
if (onScreen(v, r.l - 50, 120)) {
    const on = !!m.get('nightLight');
    if (on) { const g = x.createRadialGradient(r.cx, r.t + 6, 2, r.cx, r.t + 6, 70); g.addColorStop(0, 'rgba(255,210,130,.35)'); g.addColorStop(1, 'rgba(255,210,130,0)'); x.fillStyle = g; x.fillRect(r.cx - 70, r.t - 64, 140, 140); }
    x.fillStyle = '#2a2420'; x.fillRect(r.cx - 1, r.t + 10, 3, r.h - 10); x.fillRect(r.cx - 7, r.b - 2, 14, 2);
    x.fillStyle = '#3a342c'; x.beginPath(); x.moveTo(r.cx - 9, r.t + 12); x.lineTo(r.cx + 9, r.t + 12); x.lineTo(r.cx + 5, r.t + 4); x.lineTo(r.cx - 5, r.t + 4); x.closePath(); x.fill();
    x.fillStyle = on ? 'rgba(255,230,160,.98)' : 'rgba(90,80,60,.8)'; x.fillRect(r.cx - 6, r.t + 12, 12, 2);
    x.fillStyle = m.value('night') ? rgba(C, 0.9) : rgba(YELLOW, 0.9); x.fillRect(r.cx - 1, r.t + 1, 3, 3);
    plate(x, r.cx, r.t - 14, ['18–06'], { size: 7 });
  }
}

function drawRain(x:CanvasRenderingContext2D,v:View,m:SandboxViewState){
const t = v.t;
const r = at(v, 'rain');
if (onScreen(v, r.l - 10, 50)) {
    const wx = m.snapshot.weather, a = t * (0.05 + wx.wind * 0.3);
    box(x, r.l + 3, r.t + 8, r.w - 6, r.h - 8, '#d8d2c6', rgba(PAPER, 0.8));
    x.fillStyle = '#2a2420'; x.fillRect(r.cx - 1, r.t + 2, 2, 6);
    for (let k = 0; k < 3; k++) { const aa = a + k * 2.09; x.fillStyle = 'rgba(230,220,200,.95)'; x.fillRect(Math.round(r.cx + Math.cos(aa) * 8) - 2, r.t + 1 + Math.round(Math.sin(aa) * 2), 4, 3); }
    x.fillStyle = wx.rain > 0.05 ? rgba(C, 0.95) : rgba(C, 0.5); x.fillRect(r.cx - 1, r.b - 5, 3, 2);
  }
}

function drawVent(x:CanvasRenderingContext2D,v:View,m:SandboxViewState){
const t = v.t;
const r = at(v, 'vent');
if (onScreen(v, r.l - 10, 60)) {
    const open = !!m.get('ventOpen');
    box(x, r.l, r.t, r.w, r.h, '#1a1612', rgba(PAPER, 0.6));
    for (let k = 0; k < 4; k++) { x.fillStyle = 'rgba(200,190,170,.75)'; x.fillRect(r.l + 3, r.t + 3 + k * 4, r.w - 6, open ? 1 : 3); }
    tell(x, t, r.l + r.w - 3, r.b - 3, 5);
  }
}

function drawWaitBench(x:CanvasRenderingContext2D,v:View,_m:SandboxViewState){
const y = v.y;
const bx = v.sx(inputs.decorX ?? 0);
if (onScreen(v, bx - 40, 80)) {
    box(x, bx - 34, y(14), 68, 4, '#4a2a1a', rgba(O, 0.6));
    x.fillStyle = '#2a1a10'; x.fillRect(bx - 30, y(10), 3, 10); x.fillRect(bx + 27, y(10), 3, 10);
  }
}

function drawEndWall(x:CanvasRenderingContext2D,v:View,_m:SandboxViewState){
const ex = v.sx(inputs.decorX ?? 0);
if (onScreen(v, ex - 4, 40)) { x.fillStyle = '#0a0706'; x.fillRect(ex, 0, 40, v.gy); x.fillStyle = rgba(O, 0.7); x.fillRect(ex, 0, 1, v.gy); }
}

function tube(x:CanvasRenderingContext2D,v:View,tx:number,flicker:boolean){const{sx,y,t}=v;    const lx = sx(tx);
    if (!onScreen(v, lx - 100, 200)) return;
    const dead = flicker && t % 300 > 270;
    const g = x.createLinearGradient(0, y(CEIL - 4), 0, y(0));
    g.addColorStop(0, 'rgba(225,240,255,' + (dead ? 0.02 : 0.08) + ')'); g.addColorStop(1, 'rgba(225,240,255,0)');
    x.fillStyle = g; x.beginPath(); x.moveTo(lx - 26, y(CEIL - 4)); x.lineTo(lx - 90, y(0)); x.lineTo(lx + 90, y(0)); x.lineTo(lx + 26, y(CEIL - 4)); x.closePath(); x.fill();
    box(x, lx - 26, y(CEIL - 2), 52, 3, dead ? 'rgba(225,240,255,.2)' : 'rgba(235,245,255,.85)');
}
return {overhead,hall,pillar,stationSign,stationCard,bench,windowBack,windowFront,wallClock,tube,drawHeader,drawReset,drawSensor,drawLamp,drawMemo,drawPort,drawUnit7,drawMetronome,drawRecorder,drawButtonCounterConduit,drawButton,drawBeacon,drawHorn,drawCounter,drawPlate,drawHatch,drawFan,drawLogin,drawRings,drawCipher,drawCryptex,drawMorse,drawCutter,drawCabinet,drawRgb,drawMains,drawAudit,drawSpool,drawTraceMeter,drawNetjack,drawServerRack,drawBell,drawPrinter,drawStamp,drawConveyor,drawSiren,drawCoffee,drawReader,drawChipDispenser,drawTill,drawRadiator,drawTeaTable,drawTeaStool,drawTeaPlant,drawRoomNotices,drawNightlight,drawRain,drawVent,drawWaitBench,drawEndWall};
}
