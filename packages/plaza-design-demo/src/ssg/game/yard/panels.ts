/**
 * The yard's full-screen moments: looking through CAM-1 and talking HINGE
 * round. Each covers the game window until closed. What they show and say
 * comes from the zone data (crates, the dialogue tree, texts).
 * Styles live in render.tsx (`.hack-panel`, `.cam-*`, `.dlg-*`).
 */

import type { DialogueNode } from '../data/types';
import type { Line, YardModel } from './model';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) {
  const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e;
}
function button(text: string, cls: string, fn: () => void) {
  const b = el('button', cls, text); b.type = 'button';
  b.addEventListener('click', (e) => { e.stopPropagation(); fn(); });
  return b;
}

export class Panels {
  private root: HTMLDivElement;
  private body: HTMLDivElement;
  private raf = 0;
  onClose: () => void = () => {};

  constructor(host: HTMLElement, private m: YardModel, private say: (l: Line) => void) {
    this.root = el('div', 'hack-panel'); this.root.hidden = true;
    this.body = el('div', 'hack-panel-body');
    this.root.append(button(m.label('ui.close'), 'hack-btn hack-panel-close', () => this.close()), this.body);
    host.appendChild(this.root);
  }

  get isOpen() { return !this.root.hidden; }
  close() { if (this.root.hidden) return; this.root.hidden = true; cancelAnimationFrame(this.raf); this.body.textContent = ''; this.onClose(); }
  private show(cls: string) { this.body.textContent = ''; this.body.className = 'hack-panel-body ' + cls; this.root.hidden = false; }

  // ---------- CAM-1: tap to aim, zoom to read small print ----------

  camera() {
    this.show('cam');
    const c = el('canvas', 'cam-feed'); const g = c.getContext('2d')!;
    const btns = el('div', 'cam-btns');
    this.body.append(c, btns);
    const W = 320, H = 150;
    const crates = this.m.zone.camera.crates;
    let s = 1, ox = 0, oy = 0, zoom = 1, focus = { x: 160, y: 75 }, cross = { x: 160, y: 80 }, aim = { x: 160, y: 80 };
    const tags = new Set<string>();
    const hud = this.m.label('cam.hud'), aimText = this.m.label('cam.aim');
    const pan = () => this.m.pan * 40;
    const under = (p: { x: number; y: number }) => crates.find((k) => p.x >= k.x - pan() - 3 && p.x <= k.x - pan() + k.w + 3 && p.y >= k.y - 3 && p.y <= k.y + k.h + 3);
    const fit = () => {
      const d = window.devicePixelRatio || 1;
      c.width = Math.max(1, Math.round(c.clientWidth * d)); c.height = Math.max(1, Math.round(c.clientHeight * d));
      s = Math.min(c.width / W, c.height / H); ox = (c.width - W * s) / 2; oy = (c.height - H * s) / 2;
    };
    c.addEventListener('pointerdown', (e) => {
      const r = c.getBoundingClientRect(), d = c.width / r.width;
      const vx = ((e.clientX - r.left) * d - ox) / s, vy = ((e.clientY - r.top) * d - oy) / s;
      aim = { x: (vx - 160) / zoom + focus.x, y: (vy - 75) / zoom + focus.y };
    });
    btns.append(
      button(this.m.label('cam.zoom'), 'hack-btn', () => {
        const k = under(cross);
        if (zoom === 1) {
          zoom = 3; focus = { ...cross };
          if (!k) return this.say(this.m.line('cam.zoom.gravel'));
          const mine = k.id === this.m.parcel;
          this.say(this.m.line(mine ? 'cam.zoom.parcel' : 'cam.zoom.crate', { id: k.id, label: k.label.toLowerCase() }));
          if (mine) this.m.markFound();
        } else { zoom = 1; focus = { x: 160, y: 75 }; this.say(this.m.line('cam.zoom.out')); }
      }),
      button(this.m.label('cam.tag'), 'hack-btn', () => {
        const k = under(cross);
        if (!k) return this.say(this.m.line('cam.tag.none'));
        tags.add(k.id); this.say(this.m.line('cam.tag.ok', { id: k.id }));
      }),
    );
    const frame = (t: number) => {
      if (this.root.hidden) return;
      if (c.width !== Math.round(c.clientWidth * (window.devicePixelRatio || 1))) fit();
      cross.x += (aim.x - cross.x) * 0.2; cross.y += (aim.y - cross.y) * 0.2;
      const dx = pan();
      g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
      g.setTransform(s * zoom, 0, 0, s * zoom, ox + s * (160 - focus.x * zoom), oy + s * (75 - focus.y * zoom));
      g.save(); g.beginPath(); g.rect(0, 0, W, H); g.clip();
      g.fillStyle = '#0a0410'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#140818'; g.fillRect(-dx, 20, 90, 80); g.fillRect(200 - dx, 10, 140, 90);
      g.fillStyle = '#1d0e05'; g.fillRect(0, 126, W, 24);
      for (const k of crates) {
        const x = k.x - dx;
        g.fillStyle = '#6a3f12'; g.fillRect(x, k.y, k.w, k.h); g.strokeStyle = '#c98a3f'; g.lineWidth = 1; g.strokeRect(x + 0.5, k.y + 0.5, k.w - 1, k.h - 1);
        g.fillStyle = '#ffd9a5'; g.fillRect(x + 4, k.y + 4, 22, 9);
        g.fillStyle = '#1d0e05'; g.font = '600 7px "IBM Plex Mono", monospace'; g.fillText(k.id, x + 6, k.y + 11);
        g.font = '2.6px "IBM Plex Mono", monospace'; g.fillStyle = '#ffd9a5'; g.fillText(k.label, x + 3, k.y + k.h - 4);
        if (tags.has(k.id)) { g.strokeStyle = '#ff3df2'; g.setLineDash([2, 2]); g.strokeRect(x - 2, k.y - 2, k.w + 4, k.h + 4); g.setLineDash([]); }
      }
      g.fillStyle = 'rgba(0,255,255,0.04)'; for (let y = 0; y < H; y += 2) g.fillRect(0, y, W, 1);
      g.restore();
      const k = under(cross), r = 8 / zoom;
      g.strokeStyle = k ? '#00ffff' : 'rgba(0,255,255,.6)'; g.lineWidth = 1 / zoom;
      g.beginPath(); g.arc(cross.x, cross.y, r, 0, 7);
      for (const [a, b] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { g.moveTo(cross.x + a * r * 0.5, cross.y + b * r * 0.5); g.lineTo(cross.x + a * r * 1.8, cross.y + b * r * 1.8); }
      g.stroke();
      g.setTransform(1, 0, 0, 1, 0, 0);
      const fs = Math.round(11 * (window.devicePixelRatio || 1));
      g.font = fs + 'px "IBM Plex Mono", monospace';
      g.fillStyle = Math.floor(t / 600) % 2 ? '#ff2a44' : '#5a0a14'; g.fillText(hud + (zoom > 1 ? ' ×3' : ''), ox + fs * 0.6, oy + fs * 1.4);
      g.fillStyle = '#00ffff'; g.fillText(k ? this.m.label('cam.on', { id: k.id }) : aimText, ox + fs * 0.6, oy + fs * 2.8);
      this.raf = requestAnimationFrame(frame);
    };
    requestAnimationFrame(() => { fit(); this.raf = requestAnimationFrame(frame); });
  }

  // ---------- HINGE: permission, not answers ----------

  talk(who = 'hinge') {
    this.show('dlg');
    const box = el('div', 'dlg-box');
    this.body.appendChild(box);
    const D = this.m.zone.dialogue[who];
    const sayLine = (line: string) => this.say([D.sayCmd.replace('{line}', line), '', 'dim']);
    /** A node's first variant whose `if` holds; its steps run as it is shown. */
    const pick = (id: string): DialogueNode => {
      const n = [D.nodes[id]].flat().find((v) => !v.if || this.m.cond(v.if))!;
      if (n.do) this.m.apply(n.do);
      return n;
    };
    const show = (id: string) => {
      const { text, choices } = pick(id);
      box.textContent = '';
      box.append(el('b', 'dlg-name', D.speaker), el('p', 'dlg-text', text));
      const ch = el('div', 'dlg-choices'); box.appendChild(ch);
      if (!choices) { ch.appendChild(button(this.m.label('talk.unplug'), 'dlg-choice', () => this.close())); return; }
      choices.forEach(([line, next]) => ch.appendChild(button(line, 'dlg-choice', () => { sayLine(line); show(next); })));
      const free = D.free;
      if (!free) return;
      ch.appendChild(button(this.m.label('talk.other'), 'dlg-choice dlg-kb', () => {
        ch.textContent = '';
        const inp = el('input', 'dlg-input'); inp.placeholder = this.m.label('talk.placeholder'); inp.setAttribute('aria-label', this.m.label('talk.aria'));
        ch.appendChild(inp); inp.focus();
        inp.addEventListener('keydown', (e) => {
          e.stopPropagation();
          if (e.key !== 'Enter' || !inp.value.trim()) return;
          const line = inp.value.trim(); sayLine(line);
          if (new RegExp(free.match, 'i').test(line)) show(free.goto);
          else { box.querySelector('.dlg-text')!.textContent = free.miss; ch.textContent = ''; ch.appendChild(button(free.retry, 'dlg-choice', () => show(free.retryGoto))); }
        });
      }));
    };
    show(D.start);
  }
}
