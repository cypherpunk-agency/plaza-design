/** Downtown artwork extracted verbatim. Assembly decomposition follows after parity verification. */
import type { View } from '../core/view';
import { drawSprite, SPR, GLOW_THEM, type Sprite } from "../core/sprites";
import { windowLit } from "../../world/light";
import { bay, cornice, fascia, framedWindow, ledgeEdge, storeyBands, type BayKind } from "../buildings/parts";
import { addLight, castShadow } from "../atmosphere/lighting";
import { neon } from "../core/primitives";
import { neonPlate, plate } from "../signage/kit";
import { bladeSign } from "../signage/screens";
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
    neon(this.x, this.t, text, cx, cy, col, { size: opt.size ?? 11, vertical: opt.vertical, dead: opt.dead, phase: opt.phase, bright: true });
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
    bladeSign(x, this.v, { x: origin + 13, h: 150, text: 'YARD', col: P, size: 8, phase: 90 });
  }
drawWindow(wx: number, wy: number, light: number, ac: boolean, seed: number) {
    light = framedWindow(this.x, wx, wy, light, ac, seed, this.t, this.v.lighting);
    if (light >= 0) addLight(this.v, { x: wx + 7 + this.cam, h: this.gy - wy - 14, kind: 'window', w: 12, hh: 26, r: 14, col: light >= 1 ? '150,170,220' : '255,150,70', a: 0.6 });
  }
drawBay(bx: number, w: number, kind: BayKind) { bay(this.x, h => this.y(h), bx, w, kind); }
plate(cx: number, cy: number, w: number, h: number, col: string) { plate(this.x, cx, cy, w, h, col); }
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
    neonPlate(x, this.t, cx, this.y(130), { text: 'NOODLES', col: C, size: 13, w: 72, h: 16, phase: 0 });
  }
drawFrontBody(f: Front, sx: number) {
    const x = this.x, hv = Math.min(f.h, this.gy + 1), top = this.y(hv);
    x.fillStyle = '#0a0503'; x.fillRect(sx, top, f.w, hv);
    if (f.roof) ledgeEdge(x, sx, top, f.w, hv);
    else {
      x.strokeStyle = 'rgba(194,65,12,.45)'; x.lineWidth = 1; x.strokeRect(sx + 0.5, top + 0.5, f.w - 1, hv);
      storeyBands(x, h => this.y(h), sx, f.w, f.h, hv, GROUND, STOREY);
    }
}
drawFrontTrim(f: Front, sx: number) {
    const x = this.x, hv = Math.min(f.h, this.gy + 1), top = this.y(hv);
    if (!f.roof) {
      if (f.h <= this.gy) cornice(x, sx, top, f.w);
      // Shop fascia over the ground floor.
      fascia(x, h => this.y(h), sx, f.w, GROUND);
    }
}
drawPenthouse(wx: number) { const x = this.x;     // Penthouse window, out of reach until the grapple: the one lit room on the tower's top floor.
    const tx = this.sx(wx);
    x.fillStyle = 'rgba(0,255,255,' + (0.5 + 0.3 * Math.sin(this.t * 0.02)) + ')'; x.fillRect(tx - 6, this.y(251), 12, 26);
    x.fillStyle = 'rgba(0,60,60,.7)'; x.fillRect(tx - 6, this.y(240), 12, 1);
    neonPlate(x, this.t, tx, this.y(196), { text: 'PENTHOUSE', col: O, size: 8, w: 56, h: 12, phase: 40 });
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
      neonPlate(x, t, sh, this.y(70), { text: 'SHOP', col: C, size: 8, w: 34, h: 11, phase: 30 });
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
drawFixer(wx: number) {const x=this.x;     drawSprite(x, SPR.fixer, this.sx(wx), this.y(30) + Math.round(Math.sin(this.t * 0.03)), { glow: 'rgba(255,170,60,.85)' });
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
drawPedestrian(wx: number, sprite: Sprite, flip: boolean) { const x=this.x;castShadow(x, this.view(), wx, 40, 12); drawSprite(x, sprite, this.sx(wx), this.gy, { glow: GLOW_THEM, flip }); }
}
const GROUND = 76, STOREY = 66;
