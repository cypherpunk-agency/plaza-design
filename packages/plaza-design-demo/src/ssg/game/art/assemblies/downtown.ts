/** Downtown artwork extracted verbatim. Assembly decomposition follows after parity verification. */
import type { View } from '../core/view';
import { drawStreetSprite, streetSpriteKinds } from "../characters/street-sprite";
import { windowLit } from "../../world/light";
import { glass } from "../environment/sky";
import { addLight } from "../atmosphere/lighting";
const O = '255,136,0', C = '0,255,255';
const rng = (seed: number) => { let s = seed; return () => (s = (s * 9301 + 49297) % 233280) / 233280; };
export interface Front {x:number;w:number;h:number;roof?:boolean}
export interface Stall {x:number;w:number}
export class DowntownArtwork {
private v!: View;
private x!: CanvasRenderingContext2D;
private get t() { return this.v.t; }
private get gy() { return this.v.gy; }
private get cam() { return this.v.cam; }
private get viewW() { return this.v.viewW; }
private get viewH() { return this.v.viewH; }
set(ctx: CanvasRenderingContext2D, view: View) { this.x = ctx; this.v = view; }
  private sx(wx: number, parallax = 1) { return this.v.sx(wx, parallax); }
  private y(h: number) { return this.v.y(h); }
  private view() { return this.v; }
drawSkyline(parallax: number, seed: number, hMin: number, hMax: number, alpha: number, win: number, levelWidth: number) {
    const x = this.x, r = rng(seed), base = this.gy - 4, width = levelWidth * parallax + this.viewW + 40;
    for (let wx = -20; wx < width;) {
      const w = 14 + r() * 26, h = hMin + r() * (hMax - hMin), sx = Math.round(wx - this.cam * parallax);
      const lit: number[] = []; for (let i = 0; i < 24; i++) lit.push(r());
      if (sx + w > 0 && sx < this.viewW) {
        x.fillStyle = '#040200'; x.fillRect(sx, base - h, w, h);
        x.strokeStyle = 'rgba(194,65,12,' + alpha + ')'; x.lineWidth = 1; x.strokeRect(sx + 0.5, base - h + 0.5, w - 1, h);
        let i = 0;
        for (let yy = base - h + 5; yy < base - 4; yy += 6) for (let xx = sx + 3; xx < sx + w - 3; xx += 5) {
          if (lit[i++ % 24] < win && windowLit(seed * 7919 + wx * 13 + i, this.v.lighting)) { x.fillStyle = 'rgba(255,136,0,' + (0.18 + alpha) + ')'; x.fillRect(xx, yy, 2, 2); }
        }
      }
      wx += w + 2;
    }
  }
drawAntenna(wx: number) {
    const x = this.x, bx = this.sx(wx, 0.8), top = 8, base = this.gy - 4;
    if (bx < -60 || bx > this.viewW + 60) return;
    x.strokeStyle = 'rgba(194,65,12,.85)'; x.lineWidth = 1;
    x.beginPath(); x.moveTo(bx - 22, base); x.lineTo(bx, top); x.lineTo(bx + 22, base); x.stroke();
    for (let i = 1; i < 18; i++) {
      const y1 = base - ((base - top) * (i - 1)) / 18, y2 = base - ((base - top) * i) / 18, w1 = 22 * (1 - (i - 1) / 18), w2 = 22 * (1 - i / 18);
      x.beginPath(); x.moveTo(bx - w1, y1); x.lineTo(bx + w2, y2); x.moveTo(bx + w1, y1); x.lineTo(bx - w2, y2); x.stroke();
    }
    [0, 0.33, 0.66].forEach((f, i) => {
      x.fillStyle = Math.sin(this.t * 0.06 + i) > 0 ? 'rgba(255,42,68,1)' : 'rgba(255,42,68,.25)';
      x.fillRect(bx - 2, top + (base - top) * f, 4, 4);
    });
  }
neon(text: string, cx: number, cy: number, col: string, opt: { size?: number; vertical?: boolean; dead?: number; phase?: number } = {}) {
    const x = this.x, size = opt.size ?? 11, dead = opt.dead ?? -1;
    const flick = (this.t + (opt.phase ?? 0)) % 240 > 232 && Math.floor(this.t) % 4 < 2;
    x.save();
    x.font = '600 ' + size + 'px "IBM Plex Mono", monospace'; x.textAlign = 'center'; x.textBaseline = 'middle';
    [...text].forEach((ch, i) => {
      const off = flick || i === dead;
      x.fillStyle = 'rgba(' + col + ',' + (off ? 0.13 : 0.95) + ')';
      x.shadowColor = 'rgba(' + col + ',.9)'; x.shadowBlur = off ? 0 : 8;
      if (opt.vertical) x.fillText(ch, cx, cy + i * (size + 2));
      else x.fillText(ch, cx + (i - (text.length - 1) / 2) * size * 0.64, cy);
    });
    x.restore();
  }
drawAlley(origin: number, doorOffset: number) {
    const x = this.x, a0 = this.sx(origin + 0), a1 = this.sx(origin + 90), c = this.sx(origin + doorOffset), P = '255,61,242';
    if (a1 + 20 < 0 || a0 - 40 > this.viewW) return;
    const b0 = a0 + 18, b1 = a1 - 18, far = this.y(12), farTop = this.y(96);
    const poly = (pts: [number, number][], fill: string | CanvasGradient) => {
      x.beginPath(); pts.forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py))); x.closePath(); x.fillStyle = fill; x.fill();
    };

    // over the annex and above the far end: the backs of the houses across the yard (middle band, dim)
    x.fillStyle = '#0a0503'; x.fillRect(a0, this.y(170), a1 - a0, this.y(62) - this.y(170));
    x.strokeStyle = 'rgba(194,65,12,.22)'; x.lineWidth = 1; x.strokeRect(a0 + 0.5, this.y(170) + 0.5, a1 - a0 - 1, this.y(62) - this.y(170));
    for (const [wx, wh, lit] of [[982, 150, 1], [1004, 150, 0], [1024, 150, 1], [982, 124, 0], [1004, 124, 1], [1024, 124, 0]] as const) {
      x.fillStyle = lit ? 'rgba(255,136,0,.2)' : '#030100'; x.fillRect(this.sx(wx), this.y(wh), 8, 12);
    }

    // the yard beyond the far opening, bright under its lamp
    x.fillStyle = '#140904'; x.fillRect(b0, farTop, b1 - b0, far - farTop);
    const glow = x.createRadialGradient((b0 + b1) / 2, this.y(54), 3, (b0 + b1) / 2, this.y(40), 60);
    glow.addColorStop(0, 'rgba(255,180,100,.6)'); glow.addColorStop(1, 'rgba(255,180,100,0)');
    x.fillStyle = glow; x.fillRect(b0, farTop, b1 - b0, far - farTop);
    x.fillStyle = 'rgba(255,230,170,1)'; x.fillRect((b0 + b1) / 2 - 2, this.y(80), 4, 2);
    for (const [ox, w, h] of [[3, 12, 10], [16, 9, 7], [36, 11, 9]] as const) {
      x.fillStyle = '#4a2a0c'; x.fillRect(b0 + ox, far - h, w, h);
      x.strokeStyle = 'rgba(232,160,80,.95)'; x.strokeRect(b0 + ox + 0.5, far - h + 0.5, w - 1, h - 1);
    }

    // the crane: its gantry over the far end and the annex, a leg into the yard, the hook on its cable
    const k0 = b0 + 3, k1 = this.sx(origin + 84);
    x.fillStyle = '#3a1c08'; x.fillRect(k0, this.y(118), k1 - k0, 4); x.fillRect(k0, this.y(114), 3, 102); x.fillRect(k1 - 4, this.y(114), 3, 52);
    x.fillStyle = 'rgba(255,136,0,.75)'; x.fillRect(k0, this.y(118), k1 - k0, 1); x.fillRect(k0, this.y(114), 1, 102); x.fillRect(k1 - 4, this.y(114), 1, 52);
    x.fillStyle = '#ff8800'; x.fillRect(this.sx(origin + 56), this.y(114), 9, 3);
    x.fillStyle = 'rgba(201,168,127,.85)'; x.fillRect(this.sx(origin + 60), this.y(111), 1, 26);

    // the yard's fence across the far opening, the gate swung wide open towards you
    x.fillStyle = 'rgba(255,136,0,.85)'; x.fillRect(b0, farTop + 30, 1, far - farTop - 30); x.fillRect(b1 - 1, farTop + 30, 1, far - farTop - 30);
    poly([[b1 - 1, farTop + 34], [b1 + 9, farTop + 26], [b1 + 9, far + 5], [b1 - 1, far]], 'rgba(255,136,0,.16)');
    x.strokeStyle = 'rgba(255,136,0,.8)'; x.beginPath(); x.moveTo(b1 - 1, farTop + 34); x.lineTo(b1 + 9, farTop + 26); x.lineTo(b1 + 9, far + 5); x.stroke();

    // the passage's walls, receding: the stall building's side (tall) and the annex's side (low)
    poly([[a0, this.y(190)], [b0, this.y(190)], [b0, far], [a0, this.y(0)]], '#070302');
    poly([[a1, this.y(62)], [b1, this.y(58)], [b1, far], [a1, this.y(0)]], '#0a0402');
    x.fillStyle = 'rgba(194,65,12,.5)'; x.fillRect(a0 + 6, this.y(180), 2, 176);
    x.strokeStyle = 'rgba(255,136,0,.6)';
    x.beginPath(); x.moveTo(a0 + 0.5, this.y(0)); x.lineTo(b0 + 0.5, far); x.moveTo(a1 - 0.5, this.y(0)); x.lineTo(b1 - 0.5, far); x.moveTo(a1 - 0.5, this.y(62)); x.lineTo(b1 - 0.5, this.y(58)); x.stroke();

    // the floor: wet, the yard's light running down it and out across the pavement
    poly([[a0, this.y(0)], [a1, this.y(0)], [b1, far], [b0, far]], '#0c0603');
    const spill = x.createLinearGradient(0, far, 0, this.y(-16));
    spill.addColorStop(0, 'rgba(255,180,100,.45)'); spill.addColorStop(1, 'rgba(255,180,100,0)');
    poly([[b0 + 2, far], [b1 - 2, far], [a1 + 10, this.y(-16)], [a0 - 10, this.y(-16)]], spill);
    x.fillStyle = 'rgba(255,217,165,.4)'; x.fillRect(c - 8, this.y(3), 14, 1); x.fillRect(c + 10, this.y(6), 8, 1);

    // a string of bulbs across the passage, sagging between the two walls
    x.strokeStyle = 'rgba(120,70,30,.9)'; x.beginPath(); x.moveTo(a0, this.y(92));
    x.quadraticCurveTo((a0 + a1) / 2, this.y(78), a1, this.y(64)); x.stroke();
    for (let i = 1; i < 7; i++) {
      const t = i / 7, bx = a0 + (a1 - a0) * t, by = (1 - t) * (1 - t) * this.y(92) + 2 * (1 - t) * t * this.y(78) + t * t * this.y(64);
      x.fillStyle = (Math.floor(this.t / 40) + i) % 9 ? 'rgba(255,214,140,.95)' : 'rgba(255,214,140,.3)';
      x.fillRect(bx - 1, by + 1, 2, 2);
    }

    // the blade sign: sticks out from the corner on a bracket, readable from down the street
    const sx0 = a0 - 1;
    x.fillStyle = '#2a160a'; x.fillRect(sx0, this.y(148), 14, 2); x.fillRect(sx0, this.y(110), 14, 2);
    this.plate(sx0 + 14, this.y(129), 13, 42, P);
    this.neon('YARD', sx0 + 14, this.y(141), P, { size: 8, phase: 90, vertical: true });
  }
drawWindow(wx: number, wy: number, light: number, ac: boolean, seed: number) {
    const x = this.x;
    x.fillStyle = '#040201'; x.fillRect(wx, wy, 14, 28);
    // the room's light follows the clock (on at dusk, off after midnight); a dark pane reflects the sky by day
    if (light >= 0 && !windowLit(seed, this.v.lighting)) light = -1;
    if (light < 0) { const [gc, ga] = glass(this.v.lighting); if (ga > 0.02) { x.fillStyle = 'rgba(' + gc + ',' + ga.toFixed(3) + ')'; x.fillRect(wx + 1, wy + 1, 12, 26); } }
    if (light >= 0) addLight(this.v, { x: wx + 7 + this.cam, h: this.gy - wy - 14, kind: 'window', w: 12, hh: 26, r: 14, col: light >= 1 ? '150,170,220' : '255,150,70', a: 0.6 });
    if (light >= 1) {
      x.fillStyle = 'rgba(150,170,220,' + (0.1 + 0.06 * Math.sin(this.t * 0.05 + light * 3)) + ')'; x.fillRect(wx + 1, wy + 1, 12, 26);
    } else if (light >= 0) {
      x.fillStyle = 'rgba(255,136,0,' + (0.1 + 0.18 * light) + ')'; x.fillRect(wx + 1, wy + 1, 12, 26);
      if (light < 0.35) { x.fillStyle = 'rgba(0,0,0,.4)'; for (let b = 3; b < 27; b += 3) x.fillRect(wx + 1, wy + b, 12, 1); }
    }
    x.fillStyle = '#0a0503'; x.fillRect(wx, wy + 11, 14, 1); x.fillRect(wx + 7, wy, 1, 28);
    x.strokeStyle = 'rgba(194,65,12,.35)'; x.strokeRect(wx + 0.5, wy + 0.5, 13, 27);
    x.fillStyle = 'rgba(194,65,12,.5)'; x.fillRect(wx - 1, wy + 28, 16, 2);
    if (ac) { x.fillStyle = '#16110d'; x.fillRect(wx + 2, wy + 31, 10, 6); x.strokeStyle = 'rgba(194,65,12,.4)'; x.strokeRect(wx + 2.5, wy + 31.5, 9, 5); }
  }
drawBay(bx: number, w: number, kind: 'door' | 'glass' | 'shutter' | 'sealed') {
    const x = this.x;
    if (kind === 'glass') {
      // A lit shop interior behind glass: shelves, goods, a reflection; an awning above.
      x.fillStyle = '#120904'; x.fillRect(bx, this.y(6), w, 6);
      x.fillStyle = 'rgba(255,136,0,.1)'; x.fillRect(bx, this.y(54), w, 48);
      x.fillStyle = 'rgba(255,170,60,.18)'; x.fillRect(bx + 3, this.y(20), w - 6, 1); x.fillRect(bx + 3, this.y(36), w - 6, 1);
      for (let gx = bx + 4, j = 0; gx < bx + w - 6; gx += 7, j++) {
        x.fillStyle = j % 3 ? 'rgba(255,170,60,.22)' : 'rgba(255,217,165,.3)';
        x.fillRect(gx, this.y(26 + (j % 2) * 2), 4, 6 + (j % 2) * 2); x.fillRect(gx + 1, this.y(43), 3, 7);
      }
      x.strokeStyle = 'rgba(255,255,255,.07)'; x.beginPath(); x.moveTo(bx + 6, this.y(50)); x.lineTo(bx + 20, this.y(10)); x.stroke();
      x.fillStyle = 'rgba(255,136,0,.45)';
      for (let m = bx + 28; m < bx + w - 10; m += 28) x.fillRect(m, this.y(54), 1, 48);
      x.strokeStyle = 'rgba(255,136,0,.45)'; x.strokeRect(bx + 0.5, this.y(54) + 0.5, w - 1, 47);
      for (let ax = bx - 3, j = 0; ax < bx + w + 3; ax += 6, j++) {
        x.fillStyle = j % 2 ? 'rgba(255,136,0,.3)' : '#120800'; x.fillRect(ax, this.y(62), Math.min(6, bx + w + 3 - ax), 5);
      }
    } else if (kind === 'shutter') {
      // A rolled-down shutter under its housing.
      x.fillStyle = '#100a06'; x.fillRect(bx, this.y(48), w, 48);
      x.fillStyle = 'rgba(255,136,0,.1)'; for (let h = 3; h < 48; h += 3) x.fillRect(bx, this.y(h), w, 1);
      x.fillStyle = 'rgba(255,136,0,.35)'; x.fillRect(bx, this.y(2), w, 2);
      x.fillStyle = '#1a0f08'; x.fillRect(bx - 2, this.y(54), w + 4, 6);
      x.strokeStyle = 'rgba(194,65,12,.5)'; x.strokeRect(bx - 1.5, this.y(54) + 0.5, w + 3, 5);
    } else {
      // A door on a step. The sealed one (the penthouse) has no handle and no glass.
      x.fillStyle = '#1a0d05'; x.fillRect(bx - 3, this.y(3), w + 6, 3);
      x.fillStyle = 'rgba(255,136,0,.35)'; x.fillRect(bx - 3, this.y(3), w + 6, 1);
      x.fillStyle = '#050201'; x.fillRect(bx, this.y(52), w, 49);
      x.strokeStyle = 'rgba(255,136,0,.5)'; x.strokeRect(bx + 0.5, this.y(52) + 0.5, w - 1, 48);
      if (kind === 'door') {
        x.fillStyle = 'rgba(255,136,0,.22)'; x.fillRect(bx + 6, this.y(46), w - 12, 12);
        x.fillStyle = 'rgba(255,217,165,.7)'; x.fillRect(bx + w - 6, this.y(28), 2, 4);
        x.fillStyle = 'rgba(255,200,120,.85)'; x.fillRect(bx + Math.floor(w / 2) - 1, this.y(57), 3, 2);
      } else {
        x.fillStyle = 'rgba(194,65,12,.45)'; x.fillRect(bx + Math.floor(w / 2), this.y(50), 1, 46);
        x.fillStyle = 'rgba(255,217,165,.35)'; x.fillRect(bx + w + 3, this.y(36), 8, 6);
      }
    }
  }
plate(cx: number, cy: number, w: number, h: number, col: string) {
    const x = this.x, x0 = Math.round(cx - w / 2), y0 = Math.round(cy - h / 2), r = Math.max(w, h) * 0.75;
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, 'rgba(' + col + ',.1)'); g.addColorStop(1, 'rgba(' + col + ',0)');
    x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2);
    x.fillStyle = '#080403'; x.fillRect(x0, y0, w, h);
    x.strokeStyle = 'rgba(' + col + ',.4)'; x.lineWidth = 1; x.strokeRect(x0 + 0.5, y0 + 0.5, w - 1, h - 1);
    x.fillStyle = 'rgba(255,217,165,.45)';
    for (const [px, py] of [[x0 + 2, y0 + 2], [x0 + w - 3, y0 + 2], [x0 + 2, y0 + h - 3], [x0 + w - 3, y0 + h - 3]]) x.fillRect(px, py, 1, 1);
  }
drawStall(stall: Stall) {
    const x = this.x, s0 = this.sx(stall.x), sw = stall.w, cx = s0 + sw / 2;
    if (s0 + sw + 20 < 0 || s0 - 20 > this.viewW) return;
    x.fillStyle = '#000'; x.fillRect(s0 - 3, this.y(121), sw + 6, 121);
    x.fillStyle = '#1c0e06'; x.fillRect(s0, this.y(104), sw, 104);
    const lamps = [s0 + 26, s0 + sw - 26];
    for (const lx of lamps) {
      const g = x.createRadialGradient(lx, this.y(95), 0, lx, this.y(95), 80);
      g.addColorStop(0, 'rgba(255,170,80,.22)'); g.addColorStop(1, 'rgba(255,170,80,0)');
      x.fillStyle = g; x.fillRect(s0 + 2, this.y(104), sw - 4, 104);
    }
    x.fillStyle = 'rgba(255,170,80,.8)'; x.fillRect(s0, this.y(104), 2, 104); x.fillRect(s0 + sw - 2, this.y(104), 2, 104);
    for (let i = 0; i < 9; i++) { x.fillStyle = i % 2 ? 'rgba(255,136,0,.8)' : '#2a1200'; x.fillRect(s0 - 6 + i * 16.9, this.y(118), 16.9, 14); }
    x.strokeStyle = 'rgba(255,190,110,.9)'; x.lineWidth = 1;
    x.strokeRect(s0 - 5.5, this.y(118) + 0.5, sw + 11, 13);
    x.strokeRect(s0 + 0.5, this.y(104) + 0.5, sw - 1, 104);
    for (const lx of lamps) {
      x.fillStyle = 'rgba(255,170,80,.7)'; x.fillRect(lx, this.y(104), 1, 5);
      x.fillStyle = 'rgba(255,136,0,.95)'; x.fillRect(lx - 4, this.y(99), 9, 3);
      x.save(); x.shadowColor = 'rgba(255,200,120,.9)'; x.shadowBlur = 6;
      x.fillStyle = '#ffe0b0'; x.fillRect(lx - 2, this.y(96), 5, 1); x.restore();
    }
    // A paper notice on the back wall.
    x.fillStyle = 'rgba(255,217,165,.14)'; x.fillRect(cx - 29, this.y(96), 58, 12);
    x.strokeStyle = 'rgba(255,217,165,.45)'; x.strokeRect(cx - 28.5, this.y(96) + 0.5, 57, 11);
    x.save(); x.font = '7px "IBM Plex Mono", monospace'; x.textAlign = 'center'; x.fillStyle = 'rgba(255,217,165,.8)'; x.fillText('NO LOGS KEPT', cx, this.y(87)); x.restore();
    // NOODLES on a plate standing on the awning, on two legs.
    x.fillStyle = 'rgba(255,170,80,.7)'; x.fillRect(cx - 26, this.y(122), 2, 4); x.fillRect(cx + 24, this.y(122), 2, 4);
    this.plate(cx, this.y(130), 72, 16, C);
    this.neon('NOODLES', cx, this.y(130), C, { size: 13, phase: 0 });
  }
drawFrontBody(f: Front, sx: number) {
    const x = this.x, hv = Math.min(f.h, this.gy + 1), top = this.y(hv);
    x.fillStyle = '#0a0503'; x.fillRect(sx, top, f.w, hv);
    if (f.roof) {
      // The climbable annex: one storey, with a bright roof edge so it reads as somewhere to stand.
      x.strokeStyle = 'rgba(255,136,0,.75)'; x.lineWidth = 1; x.strokeRect(sx + 0.5, top + 0.5, f.w - 1, hv);
      x.fillStyle = 'rgba(255,136,0,.8)'; x.fillRect(sx, top, f.w, 2);
    } else {
      x.strokeStyle = 'rgba(194,65,12,.45)'; x.lineWidth = 1; x.strokeRect(sx + 0.5, top + 0.5, f.w - 1, hv);
      const storeys = Math.floor((f.h - GROUND) / STOREY);
      x.fillStyle = 'rgba(194,65,12,.22)';
      for (let s = 0; s < storeys; s++) { const h = GROUND + s * STOREY; if (h < hv) x.fillRect(sx + 1, this.y(h) - 1, f.w - 2, 2); }
    }
}
drawFrontTrim(f: Front, sx: number) {
    const x = this.x, hv = Math.min(f.h, this.gy + 1), top = this.y(hv);
    if (!f.roof) {
      if (f.h <= this.gy) {
        x.fillStyle = '#140a05'; x.fillRect(sx - 2, top, f.w + 4, 4);
        x.fillStyle = 'rgba(194,65,12,.5)'; x.fillRect(sx - 2, top, f.w + 4, 1);
      }
      // Shop fascia over the ground floor.
      x.fillStyle = '#100804'; x.fillRect(sx + 1, this.y(GROUND) + 1, f.w - 2, 11);
      x.fillStyle = 'rgba(194,65,12,.35)'; x.fillRect(sx + 1, this.y(GROUND - 12), f.w - 2, 1);
    }
}
drawPenthouse(wx: number) { const x = this.x;     // Penthouse window, out of reach until the grapple: the one lit room on the tower's top floor.
    const tx = this.sx(wx);
    x.fillStyle = 'rgba(0,255,255,' + (0.5 + 0.3 * Math.sin(this.t * 0.02)) + ')'; x.fillRect(tx - 6, this.y(251), 12, 26);
    x.fillStyle = 'rgba(0,60,60,.7)'; x.fillRect(tx - 6, this.y(240), 12, 1);
    this.plate(tx, this.y(196), 56, 12, O);
    this.neon('PENTHOUSE', tx, this.y(196), O, { size: 8, phase: 40 });
 }
drawBillboard(wx: number) { const x = this.x;     // Billboard, bolted flat to the wall and lit by two lamps on arms above it.
    const bx = this.sx(wx);
    this.plate(bx, this.y(128), 124, 36, '255,90,110');
    const wash = x.createLinearGradient(0, this.y(146), 0, this.y(124));
    wash.addColorStop(0, 'rgba(255,220,170,.12)'); wash.addColorStop(1, 'rgba(255,220,170,0)');
    x.fillStyle = wash; x.fillRect(bx - 61, this.y(146) + 1, 122, 22);
    x.strokeStyle = 'rgba(255,90,110,.75)'; x.strokeRect(bx - 61.5, this.y(146) + 0.5, 123, 35);
    for (const lx of [bx - 36, bx + 36]) {
      x.fillStyle = 'rgba(194,65,12,.8)'; x.fillRect(lx, this.y(156), 1, 10); x.fillRect(lx - 4, this.y(156), 9, 2);
      x.fillStyle = 'rgba(255,220,170,.85)'; x.fillRect(lx - 3, this.y(154), 7, 1);
    }
    this.neon('REGISTRY PREMIUM', bx, this.y(134), '255,90,110', { size: 9, phase: 10 });
    x.save(); x.font = '8px "IBM Plex Mono", monospace'; x.textAlign = 'center'; x.fillStyle = 'rgba(255,217,165,.6)'; x.fillText('be seen everywhere', bx, this.y(118)); x.restore();
 }
drawFence(wx: number) { const x = this.x;     // Fence at the antenna's foot.
    const fx = this.sx(wx);
    x.strokeStyle = 'rgba(255,136,0,.45)';
    for (let i = 0; i <= 12; i++) { x.beginPath(); x.moveTo(fx + i * 10 + 0.5, this.gy); x.lineTo(fx + i * 10 + 0.5, this.y(44)); x.stroke(); }
    x.beginPath(); x.moveTo(fx, this.y(44) + 0.5); x.lineTo(fx + 120, this.y(44) + 0.5); x.stroke();
 }
drawDumpster(wx: number, width: number, height: number) { const x = this.x, dx = this.sx(wx); x.fillStyle = '#10140f'; x.fillRect(dx, this.y(height), width, height); x.strokeStyle = 'rgba(120,160,120,.5)'; x.strokeRect(dx + 0.5, this.y(height) + 0.5, width - 1, height - 1); }
drawShopDoor(wx: number) { const x=this.x,sh=this.sx(wx),t=this.t;    if (sh > -40 && sh < this.viewW + 40) {
      this.plate(sh, this.y(70), 34, 11, C);
      this.neon('SHOP', sh, this.y(70), C, { size: 8, phase: 30 });
      // a paper sticker on the door's glass, and the cyan handle
      x.fillStyle = 'rgba(255,217,165,.5)'; x.fillRect(sh - 6, this.y(40), 12, 5);
      x.fillStyle = Math.sin(t * 0.05) > -0.3 ? 'rgba(0,255,255,.95)' : 'rgba(0,255,255,.3)'; x.fillRect(sh + 7, this.y(30), 2, 4);
    }
}
drawCapsuleDoor(wx: number) { const x=this.x,cp=this.sx(wx),t=this.t;    if (cp > -40 && cp < this.viewW + 40) {
      this.plate(cp, this.y(70), 48, 11, O);
      x.save(); x.font = '600 7px "IBM Plex Mono", monospace'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillStyle = 'rgba(255,217,165,.85)'; x.fillText('CAPSULES', cp, this.y(70) + 0.5); x.restore();
      x.fillStyle = Math.floor(t / 60) % 2 ? 'rgba(34,197,94,.95)' : 'rgba(34,197,94,.5)';
      x.fillRect(cp + 14, this.y(34), 3, 3);
    }
}
drawMothDoor(wx: number) { const x=this.x,mo=this.sx(wx),t=this.t;    if (mo > -40 && mo < this.viewW + 40) {
      this.plate(mo + 4, this.y(64), 44, 11, O);
      x.save(); x.font = '600 7px "IBM Plex Mono", monospace'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillStyle = 'rgba(255,217,165,.85)'; x.fillText('RESIDENTS', mo + 4, this.y(64) + 0.5); x.restore();
      x.fillStyle = '#0d1416'; x.fillRect(mo + 14, this.y(40), 6, 9);
      x.strokeStyle = 'rgba(0,255,255,.6)'; x.strokeRect(mo + 14.5, this.y(40) + 0.5, 5, 8);
      x.fillStyle = Math.sin(t * 0.05) > -0.3 ? 'rgba(0,255,255,.95)' : 'rgba(0,255,255,.3)'; x.fillRect(mo + 16, this.y(37), 2, 2);
    }
  }
drawStreetSurface() {
    const x = this.x, gy = this.gy;
    x.fillStyle = '#030201'; x.fillRect(0, gy, this.viewW, this.viewH - gy);
    x.fillStyle = 'rgba(255,136,0,.55)'; x.fillRect(0, gy, this.viewW, 1);
    for (let i = 0; i < 6; i++) { x.fillStyle = 'rgba(255,100,0,' + (0.16 - i * 0.024) + ')'; x.fillRect(0, gy + 6 + i * i * 2 + i * 4, this.viewW, 1); }
}
drawStallPool(rain: number, stall: Stall) { const x=this.x,gy=this.gy;    const s0 = this.sx(stall.x);
    if (s0 + stall.w + 20 > 0 && s0 - 20 < this.viewW) {
      const pool = x.createLinearGradient(0, gy, 0, gy + 34);
      pool.addColorStop(0, 'rgba(255,160,70,' + (0.18 + rain * 0.06) + ')'); pool.addColorStop(1, 'rgba(255,160,70,0)');
      x.fillStyle = pool; x.fillRect(s0 - 10, gy + 1, stall.w + 20, 34);
    }
}
drawSmear(wx: number, col: string, rain: number) { const x=this.x,gy=this.gy;
      const sx = this.sx(wx);
      if (sx < -20 || sx > this.viewW + 20) return;
      for (let i = 0; i < 10; i++) {
        const wob = Math.sin(this.t * 0.05 + i) * (1 + rain * 2);
        x.fillStyle = 'rgba(' + col + ',' + (0.03 + rain * 0.07) * (1 - i / 10) + ')';
        x.fillRect(sx - 6 + wob, gy + 3 + i * 4, 12, 3);
      }
}
drawFixer(wx: number) { drawStreetSprite(this.x, this.view(), { kind: 'streetSprite', sprite: 'fixer' }, wx);
}
drawCounter(stall: Stall) {const x=this.x;     const s0 = this.sx(stall.x);
    // Waist-high counter, lit by the stall's lamps, with a warm rim so it reads against the street.
    x.fillStyle = '#241208'; x.fillRect(s0, this.y(30), stall.w, 30); x.fillStyle = 'rgba(255,170,60,.95)'; x.fillRect(s0, this.y(30), stall.w, 2);
    x.strokeStyle = 'rgba(255,170,80,.7)'; x.lineWidth = 1; x.strokeRect(s0 + 0.5, this.y(30) + 0.5, stall.w - 1, 30);
    for (let i = 0; i < 3; i++) {
      const stx = s0 + 50 + i * 12, ph = this.t * 0.04 + i;
      x.strokeStyle = 'rgba(255,255,255,' + (0.1 + 0.05 * Math.sin(ph)) + ')'; x.beginPath();
      for (let j = 0; j < 20; j++) { const yy = this.y(32) - j * 1.6, xx = stx + Math.sin(ph + j * 0.35) * 3; j ? x.lineTo(xx, yy) : x.moveTo(xx, yy); }
      x.stroke();
    }
}
/** A street resident (character kit look: hood, umbrella or brimmed hat). */
drawPedestrian(wx: number, sprite: Exclude<typeof streetSpriteKinds[number], 'fixer'>, flip: boolean) { drawStreetSprite(this.x, this.view(), { kind: 'streetSprite', sprite, flip }, wx); }
}
const GROUND = 76, STOREY = 66;
