/** Pure yard drawing kernels. Placement and immutable animation state are supplied by the scene adapter. */
import type { View } from '../core/view';
import { acUnit, fireEscape, wallTexture } from '../buildings/parts';
export interface YardVisual {layer:'all'|'world'|'devices';highlight:string;pan:number;gateOpen:boolean;gateAllowed:boolean;held:boolean;hookVisible:boolean;hookX:number;parcel:[number,number]|null;night:number}
export interface YardWall {width:number;roof:number;brick:boolean;cols:number[];from:number;seed:number}
export interface YardArtworkInputs {x:number;width:number;height:number;endHeight:number;roof:number;label:string;wall?:YardWall;visual:YardVisual}
export function createFixerYardArtwork(inputs:YardArtworkInputs){
const STOREY=70;
const hash=(n:number)=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);};
function sky(x:CanvasRenderingContext2D,v:View){
const {sx,viewW}=v;

  // the strip of sky over the roofs: city glow from somewhere else, a few stars
  const sky = x.createLinearGradient(0, 0, 0, 34);
  sky.addColorStop(0, 'rgba(255,100,0,0)'); sky.addColorStop(1, 'rgba(255,100,0,.08)');
  x.fillStyle = sky; x.fillRect(0, 0, viewW, 34);
  const night = inputs.visual.night;
  for (let i = 0; i < 18 && night > 0.05; i++) {
    const px = ((hash(i * 3 + 1) * viewW + sx(inputs.x + 0) * 0.05) % viewW + viewW) % viewW;
    x.fillStyle = 'rgba(255,217,165,' + ((0.15 + hash(i * 3 + 3) * 0.3) * night).toFixed(3) + ')';
    x.fillRect(Math.round(px), 1 + Math.floor(hash(i * 3 + 2) * 12), 1, 1);
  }


}

function back_wall(x:CanvasRenderingContext2D,v:View){
const {sx,y,viewW}=v,gy=y(0);

const b=inputs.wall!,i=b.seed;
    const l = sx(inputs.x), r = sx((inputs.x+b.width)), top = b.roof;
    if (r < 0 || l > viewW) return;
    x.fillStyle = b.brick ? '#0b0503' : '#090604'; x.fillRect(l, top, r - l, gy - top);
    const patches: [number, number][] = [], seamY: number[] = [], seamX: number[] = [];
    if (b.brick) for (let k = 0; k < 3; k++) patches.push([sx(inputs.x + 6 + Math.floor(hash(i * 7 + k) * ((inputs.x+b.width) - inputs.x - 40))), top + 4 + Math.floor((hash(i * 13 + k) * (gy - top - 30)) / 4) * 4]);
    else {
      for (let h = 35; y(h) > top; h += 35) seamY.push(y(h));
      for (let wx = inputs.x + 48; wx < (inputs.x+b.width) - 4; wx += 48) seamX.push(sx(wx));
    }
    wallTexture(x, b.brick, l, r, top, gy, patches, seamY, seamX);
    x.strokeStyle = 'rgba(194,65,12,.3)'; x.strokeRect(l + 0.5, top + 0.5, r - l - 1, gy - top);
    x.fillStyle = 'rgba(194,65,12,.5)'; x.fillRect(l, top, r - l, 2);

    // small windows, one row per storey; a few are lit from inside
    for (let h = b.from, row = 0; y(h + 14) >= top + 6; h += STOREY, row++) {
      b.cols.map(c=>inputs.x+c).forEach((c, ci) => {
        const wx = sx(c) - 5, wy = y(h + 14), lit = hash(i * 31 + row * 7 + ci) < 0.3;
        x.fillStyle = lit ? 'rgba(255,136,0,.22)' : '#030100'; x.fillRect(wx, wy, 10, 14);
        if (lit) { x.fillStyle = 'rgba(255,217,165,.12)'; x.fillRect(wx + 1, wy + 1, 3, 12); }
        x.strokeStyle = 'rgba(194,65,12,.35)'; x.strokeRect(wx + 0.5, wy + 0.5, 9, 13);
        x.fillStyle = 'rgba(194,65,12,.5)'; x.fillRect(wx - 1, wy + 14, 12, 1);
        if (!b.brick) { x.fillStyle = 'rgba(194,65,12,.06)'; x.fillRect(wx + 4, wy + 15, 2, 16); }
      });
    }

}

function drainpipe(x:CanvasRenderingContext2D,v:View){
const {sx,y}=v,gy=y(0);

const wx=inputs.x;
    const px = sx(wx);
    x.fillStyle = 'rgba(201,138,63,.28)'; x.fillRect(px, 20, 2, gy - 20);
    x.fillStyle = 'rgba(201,138,63,.4)'; for (let yy = gy - 30; yy > 24; yy -= 40) x.fillRect(px - 1, yy, 4, 1);

}

function passage(x:CanvasRenderingContext2D,v:View){
const {sx,y}=v,gy=y(0);

  const d = sx(inputs.x), pl = sx(inputs.x-18), pw = d + 16 - pl;
  x.fillStyle = '#000'; x.fillRect(pl, y(64), pw, 64);
  const spill = x.createLinearGradient(pl, 0, pl + pw, 0);
  spill.addColorStop(0, 'rgba(255,136,0,.22)'); spill.addColorStop(1, 'rgba(255,136,0,.04)');
  x.fillStyle = spill; x.fillRect(pl, y(63), pw, 63);
  x.fillStyle = '#1a0c04'; x.fillRect(pl, y(70), pw + 4, 6); x.strokeStyle = 'rgba(194,65,12,.6)'; x.strokeRect(pl + 0.5, y(70) + 0.5, pw + 3, 5);
  x.fillStyle = '#1a0c04'; x.fillRect(d + 16, y(64), 4, 64); x.fillStyle = 'rgba(255,136,0,.5)'; x.fillRect(d + 16, y(64), 1, 64);
  for (let i = 0; i < 4; i++) { x.fillStyle = 'rgba(255,136,0,' + (0.14 - i * 0.03) + ')'; x.fillRect(pl, gy + 1 + i * 3, pw - i * 8, 2); }


}

function sign_wash(x:CanvasRenderingContext2D,v:View){
const {sx,y}=v;
const wash=(cx:number,cy:number,r:number,a:number)=>{const g=x.createRadialGradient(cx,cy,0,cx,cy,r);g.addColorStop(0,'rgba(255,170,90,'+a+')');g.addColorStop(1,'rgba(255,170,90,0)');x.fillStyle=g;x.fillRect(cx-r,cy-r,r*2,r*2);};

  // the lamp over the yard sign lights the brick around it
  wash(sx(inputs.x + 0), y(126), 70, 0.07);


}

function fire_escape(x:CanvasRenderingContext2D,v:View){
const {sx,y}=v;

  // fire escape on the concrete house: landings one storey apart, stairs between, a drop ladder
  const fe0=inputs.x,fe1=inputs.x+88,feTop=inputs.roof+6;
  fireEscape(x, dx => sx(fe0 + dx), y, fe1 - fe0, 86, STOREY, feTop, 81);


}

function shutter(x:CanvasRenderingContext2D,v:View){
const {sx,y}=v,gy=y(0);

  // the roller shutter of the fixer's store room, behind the crates
  const s0 = sx(inputs.x + 0);
  x.fillStyle = '#070402'; x.fillRect(s0, y(60), 100, 60);
  x.fillStyle = 'rgba(194,65,12,.16)'; for (let yy = y(60) + 2; yy < gy; yy += 3) x.fillRect(s0 + 1, yy, 98, 1);
  x.fillStyle = '#140a04'; x.fillRect(s0 - 3, y(66), 106, 6); x.strokeStyle = 'rgba(194,65,12,.45)'; x.strokeRect(s0 - 2.5, y(66) + 0.5, 105, 5);
  x.fillStyle = 'rgba(194,65,12,.4)'; x.fillRect(s0 - 2, y(60), 2, 60); x.fillRect(s0 + 100, y(60), 2, 60);


}

function air_conditioner(x:CanvasRenderingContext2D,v:View){
const {sx,y}=v;

const wx=inputs.x,h=inputs.height;
    acUnit(x, y, sx(wx), h);

}

function kitchen_window(x:CanvasRenderingContext2D,v:View){
const {sx,y}=v,gy=y(0);
const wash=(cx:number,cy:number,r:number,a:number)=>{const g=x.createRadialGradient(cx,cy,0,cx,cy,r);g.addColorStop(0,'rgba(255,170,90,'+a+')');g.addColorStop(1,'rgba(255,170,90,0)');x.fillStyle=g;x.fillRect(cx-r,cy-r,r*2,r*2);};

  const kw = sx(inputs.x + 0);
  x.fillStyle = 'rgba(255,136,0,.24)'; x.fillRect(kw, y(40), 18, 18);
  x.strokeStyle = 'rgba(194,65,12,.5)'; x.strokeRect(kw + 0.5, y(40) + 0.5, 17, 17);
  x.fillStyle = 'rgba(40,20,5,.9)'; for (let k = 3; k < 18; k += 4) x.fillRect(kw + k, y(40) + 1, 1, 16);
  wash(kw + 9, y(30), 36, 0.06);
  x.fillStyle = 'rgba(255,136,0,.06)'; x.fillRect(kw - 30, gy + 1, 70, 3);

}

function broom(x:CanvasRenderingContext2D,v:View){
const {sx,y}=v;

  // broom against the wall
  x.strokeStyle = 'rgba(201,138,63,.45)'; x.beginPath(); x.moveTo(sx(inputs.x + 0) + 0.5, y(46)); x.lineTo(sx(inputs.x + 4) + 0.5, y(8)); x.stroke();
  x.fillStyle = 'rgba(201,138,63,.35)'; x.fillRect(sx(inputs.x + 0), y(8), 9, 8);

}

function chair(x:CanvasRenderingContext2D,v:View){
const {sx,y}=v;

  // plastic chair
  const ch = sx(inputs.x + 0);
  x.fillStyle = '#2a1608'; x.fillRect(ch - 6, y(14), 13, 2); x.fillRect(ch + 5, y(30), 2, 16); x.fillRect(ch - 1, y(30), 8, 2);
  x.fillRect(ch - 6, y(12), 1, 12); x.fillRect(ch + 6, y(12), 1, 12);

}

function spool_table(x:CanvasRenderingContext2D,v:View){
const {sx,y}=v;

  // cable spool for a table, an ashtray and a mug on it
  const sp = sx(inputs.x + 0);
  x.fillStyle = '#22120a'; x.fillRect(sp - 4, y(12), 8, 12); x.fillRect(sp - 8, y(14), 16, 2); x.fillRect(sp - 8, y(2), 16, 2);
  x.fillStyle = 'rgba(255,217,165,.4)'; x.fillRect(sp + 2, y(18), 3, 4); x.fillStyle = 'rgba(194,65,12,.6)'; x.fillRect(sp - 6, y(15), 5, 1);


}

function dumpster_lamp(x:CanvasRenderingContext2D,v:View){
const {sx,y}=v;
const wash=(cx:number,cy:number,r:number,a:number)=>{const g=x.createRadialGradient(cx,cy,0,cx,cy,r);g.addColorStop(0,'rgba(255,170,90,'+a+')');g.addColorStop(1,'rgba(255,170,90,0)');x.fillStyle=g;x.fillRect(cx-r,cy-r,r*2,r*2);};

  // the dumpster under a caged wall lamp
  wash(sx(inputs.x + 0), y(66), 50, 0.08);
  x.fillStyle = 'rgba(255,217,165,.7)'; x.fillRect(sx(inputs.x - 2), y(68), 4, 3);
  x.fillStyle = 'rgba(194,65,12,.6)'; x.fillRect(sx(inputs.x - 3), y(70), 6, 1); x.fillRect(sx(inputs.x - 3), y(65), 6, 1);

}

function dumpster(x:CanvasRenderingContext2D,v:View){
const {sx,y}=v,gy=y(0);

  const du = sx(inputs.x + 0);
  x.fillStyle = '#141008'; x.fillRect(du, y(24), 38, 24); x.strokeStyle = 'rgba(194,65,12,.55)'; x.strokeRect(du + 0.5, y(24) + 0.5, 37, 23);
  x.fillStyle = '#1e1609'; x.fillRect(du - 1, y(27), 40, 3);
  x.fillStyle = '#080503'; x.fillRect(du + 4, y(31), 10, 4); x.fillRect(du + 20, y(30), 8, 3);
  x.fillStyle = 'rgba(255,136,0,.06)'; x.fillRect(du - 10, gy + 1, 58, 3);


}

function washing_line(x:CanvasRenderingContext2D,v:View){
const {sx,y}=v,gy=y(0);

  // a washing line across the far end, sheets and shirts left out in the rain
  const lh = Math.min(150, gy - 60), l0 = inputs.x, l1 = inputs.x+276;
  const lineY = (u: number) => y(lh) + Math.round(10 * 4 * u * (1 - u));
  x.strokeStyle = 'rgba(255,217,165,.2)'; x.beginPath();
  for (let wx = l0; wx <= l1; wx += 4) { const u = (wx - l0) / (l1 - l0); wx === l0 ? x.moveTo(sx(wx), lineY(u) + 0.5) : x.lineTo(sx(wx), lineY(u) + 0.5); }
  x.stroke();
  x.fillStyle = 'rgba(194,65,12,.6)'; x.fillRect(sx(l0) - 1, y(lh) - 1, 3, 3); x.fillRect(sx(l1) - 1, y(lh) - 1, 3, 3);
  ([[0.14, 10, 12, 'rgba(255,217,165,.22)'], [0.27, 8, 9, 'rgba(194,65,12,.4)'], [0.4, 14, 16, 'rgba(255,217,165,.16)'],
    [0.6, 8, 9, 'rgba(201,138,63,.3)'], [0.72, 4, 6, 'rgba(255,217,165,.25)'], [0.8, 4, 6, 'rgba(255,217,165,.25)']] as const)
    .forEach(([u, w, h, col]) => { const cx = sx(l0 + u * (l1 - l0)); x.fillStyle = col; x.fillRect(cx - w / 2, lineY(u) + 1, w, h); });


}

function side_walls(x:CanvasRenderingContext2D,v:View){
const {sx,y,viewW,viewH}=v,gy=y(0);

  // the side walls: the buildings left and right of the yard, seen edge-on, running toward you
  const vx = viewW / 2, vy = y(90);
  const side = (cx0: number, edge: number) => {
    const out = (py: number, s: number) => [cx0 + (cx0 - vx) * s, py + (py - vy) * s];
    const [jx] = out(gy, (viewH - gy) / (gy - vy));
    x.fillStyle = '#050201'; x.beginPath();
    x.moveTo(cx0, -1); x.lineTo(cx0, gy); x.lineTo(jx, viewH + 1);
    const far = edge < cx0 ? Math.min(jx, edge) : Math.max(jx, edge);
    x.lineTo(far, viewH + 1); x.lineTo(far, -1); x.closePath(); x.fill();
    x.strokeStyle = 'rgba(194,65,12,.1)'; x.beginPath();
    for (let h = 9; y(h) > -40; h += 9) { const [ex, ey] = out(y(h), 3); x.moveTo(cx0, y(h) + 0.5); x.lineTo(ex, ey + 0.5); }
    x.stroke();
    const [px, pb] = out(gy, 0.35);
    x.fillStyle = 'rgba(201,138,63,.18)'; x.fillRect(Math.round(px), 0, 2, pb);
    x.strokeStyle = 'rgba(194,65,12,.4)'; x.beginPath(); x.moveTo(cx0, gy + 0.5); x.lineTo(jx, viewH + 0.5); x.stroke();
    x.fillStyle = 'rgba(194,65,12,.45)'; x.fillRect(cx0, 0, 1, gy);
  };
  if (sx(inputs.x+8) > 0) side(sx(inputs.x+8), -1);
  if (sx(inputs.x+inputs.width-8) < viewW) side(sx(inputs.x+inputs.width-8), viewW + 1);
}

function yard_sign(x:CanvasRenderingContext2D,v:View){
const {sx,y}=v;
const mono=(size:number,weight='')=>(weight?weight+' ':'')+size+'px "IBM Plex Mono", monospace';
const text=(s:string,cx:number,cy:number,col:string,size=7,weight='')=>{x.save();x.font=mono(size,weight);x.textAlign='center';x.fillStyle=col;x.fillText(s,cx,cy);x.restore();};

    // the yard sign, a plate bolted to the wall over the camera, lit by its own lamp
    const sg = sx(inputs.x + 0);
    x.fillStyle = '#1a0c04'; x.fillRect(sg - 67, y(126), 134, 15);
    x.strokeStyle = 'rgba(255,136,0,.7)'; x.strokeRect(sg - 66.5, y(126) + 0.5, 133, 14);
    x.fillStyle = 'rgba(255,217,165,.5)'; [-63, 62].forEach((d) => { x.fillRect(sg + d, y(124), 1, 1); x.fillRect(sg + d, y(114), 1, 1); });
    x.fillStyle = '#4a2408'; x.fillRect(sg - 1, y(134), 2, 8); x.fillRect(sg - 6, y(134), 12, 2);
    x.fillStyle = 'rgba(255,217,165,.85)'; x.fillRect(sg - 4, y(132), 8, 1);
    text("FIXER'S YARD · NO LOGS KEPT", sg, y(115), 'rgba(255,136,0,.9)', 8, '600');

}

function street_sign(x:CanvasRenderingContext2D,v:View){
const {sx,y}=v;
const mono=(size:number,weight='')=>(weight?weight+' ':'')+size+'px "IBM Plex Mono", monospace';
const text=(s:string,cx:number,cy:number,col:string,size=7,weight='')=>{x.save();x.font=mono(size,weight);x.textAlign='center';x.fillStyle=col;x.fillText(s,cx,cy);x.restore();};

    // a small street sign over the passage, on a bracket from the lintel (a way, not a machine: no cyan)
    const ex = sx(inputs.x) + 6;
    x.fillStyle = '#4a2408'; x.fillRect(ex - 1, y(78), 2, 8);
    x.fillStyle = '#140a04'; x.fillRect(ex - 24, y(90), 48, 12); x.strokeStyle = 'rgba(255,217,165,.5)'; x.strokeRect(ex - 23.5, y(90) + 0.5, 47, 11);
    text('< DOWNTOWN', ex, y(81), 'rgba(255,217,165,.85)', 7, '600');


}

function crate(x:CanvasRenderingContext2D,v:View){
const {sx,y}=v;
const mono=(size:number,weight='')=>(weight?weight+' ':'')+size+'px "IBM Plex Mono", monospace';
const text=(s:string,cx:number,cy:number,col:string,size=7,weight='')=>{x.save();x.font=mono(size,weight);x.textAlign='center';x.fillStyle=col;x.fillText(s,cx,cy);x.restore();};

      const c = sx(inputs.x),id=inputs.label;
      x.fillStyle = '#5a3410'; x.fillRect(c - 13, y(22), 26, 22); x.strokeStyle = 'rgba(201,138,63,.9)'; x.strokeRect(c - 12.5, y(22) + 0.5, 25, 21);
      x.beginPath(); x.moveTo(c - 12, y(22)); x.lineTo(c + 12, y(0)); x.moveTo(c + 12, y(22)); x.lineTo(c - 12, y(0)); x.strokeStyle = 'rgba(40,20,5,.8)'; x.stroke();
      x.fillStyle = '#ffd9a5'; x.fillRect(c - 9, y(19), 18, 7); text(id, c, y(13.5), '#1d0e05', 6, '600');

}

function fence(x:CanvasRenderingContext2D,v:View){
const {sx,y}=v;

    // a stretch of chain-link closes off the pickup corner; the hatch is the way through
    const f0 = sx(inputs.x + 0), f1 = sx(inputs.x + 58);
    x.save(); x.beginPath(); x.rect(f0, y(74), f1 - f0, 74); x.clip();
    x.strokeStyle = 'rgba(194,65,12,.3)'; x.beginPath();
    for (let d = -74; d < f1 - f0; d += 6) { x.moveTo(f0 + d, y(0)); x.lineTo(f0 + d + 74, y(74)); x.moveTo(f0 + d + 74, y(0)); x.lineTo(f0 + d, y(74)); }
    x.stroke(); x.restore();
    x.fillStyle = '#4a2408'; x.fillRect(f0 - 1, y(76), 3, 76); x.fillRect(f1 - 2, y(76), 3, 76); x.fillRect(f0, y(75), f1 - f0, 2);


}

function chute(x:CanvasRenderingContext2D,v:View){
const {sx,y}=v;

    // chute down to the hatch
    x.strokeStyle = 'rgba(255,136,0,.55)'; x.lineWidth = 3;
    x.beginPath(); x.moveTo(sx(inputs.x), y(inputs.height - 4)); x.lineTo(sx((inputs.x+inputs.width)), y(inputs.endHeight - 4)); x.stroke(); x.lineWidth = 1;
    x.fillStyle = '#2a1405'; x.fillRect(sx(inputs.x) - 2, y(inputs.height - 4), 3, inputs.height - 4);
}

function camera(x:CanvasRenderingContext2D,v:View){
const {sx,y,t}=v,highlight=inputs.visual.highlight;
const glow=(id:string,x0:number,top:number,w:number,h:number)=>{if(highlight!==id)return;x.save();x.strokeStyle='rgba(255,61,242,.85)';x.shadowColor='rgba(255,61,242,.8)';x.shadowBlur=8;x.strokeRect(x0-3.5,top-3.5,w+7,h+7);x.restore();};

    // CAM-1 on its pole: a lit pole with a rim so it reads against the brick
    const cx = sx(inputs.x + 0);
    x.fillStyle = '#000'; x.fillRect(cx - 2, y(72), 5, 72);
    x.fillStyle = '#4a2408'; x.fillRect(cx - 1, y(72), 3, 72); x.fillStyle = 'rgba(255,136,0,.55)'; x.fillRect(cx - 1, y(72), 1, 72);
    x.fillStyle = '#2a1405'; x.fillRect(cx - 5, y(2), 11, 2);
    x.fillStyle = '#1a0c04'; x.fillRect(cx - 12, y(84), 24, 12); x.strokeStyle = 'rgba(255,217,165,.6)'; x.strokeRect(cx - 11.5, y(84) + 0.5, 23, 11);
    x.fillStyle = Math.floor(t / 30) % 2 ? 'rgba(255,42,68,.95)' : 'rgba(255,42,68,.3)'; x.fillRect(cx - 9 + inputs.visual.pan * 3, y(80), 3, 3);
    glow('cam', cx - 12, y(86), 24, 86);


}

function crane(x:CanvasRenderingContext2D,v:View){
const {sx,y}=v,highlight=inputs.visual.highlight;
const glow=(id:string,x0:number,top:number,w:number,h:number)=>{if(highlight!==id)return;x.save();x.strokeStyle='rgba(255,61,242,.85)';x.shadowColor='rgba(255,61,242,.8)';x.shadowBlur=8;x.strokeRect(x0-3.5,top-3.5,w+7,h+7);x.restore();};

    // the crane: gantry, trolley, hook
    const g0 = sx(inputs.x + 0), g1 = sx(inputs.x+inputs.width);
    x.fillStyle = '#000'; x.fillRect(g0 - 1, y(129), 6, 129); x.fillRect(g1 - 5, y(129), 6, 129); x.fillRect(g0 - 1, y(129), g1 - g0 + 2, 7);
    x.fillStyle = '#4a2408'; x.fillRect(g0, y(128), 4, 128); x.fillRect(g1 - 4, y(128), 4, 128); x.fillRect(g0, y(128), g1 - g0, 5);
    x.fillStyle = 'rgba(255,136,0,.6)'; x.fillRect(g0, y(128), g1 - g0, 1); x.fillRect(g0, y(127), 1, 127); x.fillRect(g1 - 4, y(127), 1, 127);
    const hx = sx(inputs.visual.hookX);
    x.fillStyle = '#ff8800'; if(inputs.visual.hookVisible)x.fillRect(hx - 6, y(124), 12, 4);
    x.strokeStyle = 'rgba(201,168,127,.9)'; x.beginPath(); if(inputs.visual.hookVisible){x.moveTo(hx + 0.5, y(120)); x.lineTo(hx + 0.5, y(66));} x.stroke();
    x.beginPath(); if(inputs.visual.hookVisible){x.moveTo(hx - 5, y(66)); x.lineTo(hx - 5, y(62)); x.lineTo(hx + 5, y(62)); x.lineTo(hx + 5, y(66));} x.stroke();
    glow('crane', g0, y(128), g1 - g0, 128);


}

function hatch(x:CanvasRenderingContext2D,v:View){
const {sx,y}=v,highlight=inputs.visual.highlight;
const mono=(size:number,weight='')=>(weight?weight+' ':'')+size+'px "IBM Plex Mono", monospace';
const text=(s:string,cx:number,cy:number,col:string,size=7,weight='')=>{x.save();x.font=mono(size,weight);x.textAlign='center';x.fillStyle=col;x.fillText(s,cx,cy);x.restore();};
const glow=(id:string,x0:number,top:number,w:number,h:number)=>{if(highlight!==id)return;x.save();x.strokeStyle='rgba(255,61,242,.85)';x.shadowColor='rgba(255,61,242,.8)';x.shadowBlur=8;x.strokeRect(x0-3.5,top-3.5,w+7,h+7);x.restore();};

    // the hatch in the fence, HINGE's face on it, with a dark gap around it
    const gx = sx(inputs.x + 0), open = inputs.visual.gateOpen;
    x.fillStyle = '#000'; x.fillRect(gx - 18, y(66), 36, 66);
    x.fillStyle = open ? '#000' : '#1d0e05'; x.fillRect(gx - 16, y(64), 32, 64);
    x.strokeStyle = open ? 'rgba(34,197,94,.9)' : 'rgba(255,136,0,.75)'; x.strokeRect(gx - 15.5, y(64) + 0.5, 31, 63);
    if (!open) { for (let i = 0; i < 4; i++) { x.fillStyle = 'rgba(255,136,0,.18)'; x.fillRect(gx - 14, y(60) + i * 15, 28, 2); } }
    text(open ? '◕‿◕' : inputs.visual.gateAllowed ? '◔_◔' : '◔︵◔', gx, y(40), open ? 'rgba(34,197,94,.95)' : 'rgba(255,136,0,.95)', 9);
    glow('gate', gx - 16, y(64), 32, 64);

}

function tray(x:CanvasRenderingContext2D,v:View){
const {sx,y}=v;
const mono=(size:number,weight='')=>(weight?weight+' ':'')+size+'px "IBM Plex Mono", monospace';
const text=(s:string,cx:number,cy:number,col:string,size=7,weight='')=>{x.save();x.font=mono(size,weight);x.textAlign='center';x.fillStyle=col;x.fillText(s,cx,cy);x.restore();};

    // pickup tray past the hatch
    const tx = sx(inputs.x);
    x.fillStyle = '#1a0c04'; x.fillRect(tx - 14, y(8), 28, 8); x.strokeStyle = 'rgba(34,197,94,.6)'; x.strokeRect(tx - 13.5, y(8) + 0.5, 27, 7);
    x.fillStyle = '#4a2408'; x.fillRect(tx + 15, y(36), 2, 36);
    x.fillStyle = '#071209'; x.fillRect(tx + 2, y(46), 28, 10); x.strokeStyle = 'rgba(34,197,94,.6)'; x.strokeRect(tx + 2.5, y(46) + 0.5, 27, 9);
    text('PICKUP', tx + 16, y(38.5), 'rgba(34,197,94,.85)', 7);


}

function parcel(x:CanvasRenderingContext2D,v:View){
const {sx,y}=v;

    const p=inputs.visual.parcel;
    if (!p) {if(inputs.visual.held&&!inputs.visual.hookVisible){x.fillStyle='#c98a3f';x.strokeStyle='#ffd9a5';x.fillStyle='#6a3f12';}return;}
    const px = sx(p[0]);
    x.fillStyle = '#c98a3f'; x.fillRect(px - 7, y(p[1] + 10), 14, 10); x.strokeStyle = '#ffd9a5'; x.strokeRect(px - 6.5, y(p[1] + 10) + 0.5, 13, 9);
    x.fillStyle = '#6a3f12'; x.fillRect(px - 7, y(p[1] + 6), 14, 2);
}

function roof_vent(x:CanvasRenderingContext2D,v:View){const l=v.sx(inputs.x),top=inputs.roof,w=inputs.width,h=inputs.height;x.fillStyle='#050301';x.strokeStyle='rgba(194,65,12,.35)';x.fillRect(l,top-h,w,h);x.strokeRect(l+.5,top-h+.5,w-1,h-1);}
function roof_tank(x:CanvasRenderingContext2D,v:View){roof_vent(x,v);const l=v.sx(inputs.x);x.fillStyle='rgba(194,65,12,.35)';x.fillRect(l+3,inputs.roof,1,4);x.fillRect(l+inputs.width-4,inputs.roof,1,4);}
function roof_aerial(x:CanvasRenderingContext2D,v:View){const a=v.sx(inputs.x),top=inputs.roof;x.fillStyle='rgba(194,65,12,.4)';x.fillRect(a,top,1,16);x.fillRect(a-5,top+3,11,1);x.fillRect(a-3,top+7,7,1);}
return{sky,back_wall,roof_vent,roof_tank,roof_aerial,drainpipe,passage,sign_wash,fire_escape,shutter,air_conditioner,kitchen_window,broom,chair,spool_table,dumpster_lamp,dumpster,washing_line,side_walls,yard_sign,street_sign,crate,fence,chute,camera,crane,hatch,tray,parcel};
}
