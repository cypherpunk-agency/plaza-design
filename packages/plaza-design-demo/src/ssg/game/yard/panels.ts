/**
 * The yard's three full-screen moments: looking through CAM-1, talking HINGE
 * round, and the workbench. Each covers the game window until closed.
 * Styles live in render.tsx (`.hack-panel`, `.cam-*`, `.dlg-*`, `.bench-*`).
 */

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
    this.root.append(button('CLOSE ×', 'hack-btn hack-panel-close', () => this.close()), this.body);
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
    const crates = [
      { id: 'A-3', x: 60, y: 92, w: 44, h: 34, tiny: 'RAISINS (BULK)' },
      { id: 'B-5', x: 140, y: 88, w: 40, h: 38, tiny: 'NOT YOURS. REALLY.' },
      { id: 'C-7', x: 222, y: 96, w: 36, h: 30, tiny: 'TO: YOU. FRAGILE-ISH.' },
    ];
    let s = 1, ox = 0, oy = 0, zoom = 1, focus = { x: 160, y: 75 }, cross = { x: 160, y: 80 }, aim = { x: 160, y: 80 };
    const tags = new Set<string>();
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
      button('ZOOM', 'hack-btn', () => {
        const k = under(cross);
        if (zoom === 1) {
          zoom = 3; focus = { ...cross };
          if (!k) return this.say(['cam1 zoom', 'zoomed into: gravel. high quality gravel.']);
          this.say(['cam1 zoom ' + k.id, 'crate ' + k.id + ' label: "' + k.tiny.toLowerCase() + '"', k.id === this.m.parcel ? 'ok' : undefined]);
          if (k.id === this.m.parcel) this.m.markFound();
        } else { zoom = 1; focus = { x: 160, y: 75 }; this.say(['cam1 zoom --out', 'whole yard again.', 'dim']); }
      }),
      button('TAG', 'hack-btn', () => {
        const k = under(cross);
        if (!k) return this.say(['cam1 tag', 'nothing to tag there.', 'dim']);
        tags.add(k.id); this.say(['cam1 tag ' + k.id, 'tagged ' + k.id + '.']);
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
        g.font = '2.6px "IBM Plex Mono", monospace'; g.fillStyle = '#ffd9a5'; g.fillText(k.tiny, x + 3, k.y + k.h - 4);
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
      g.fillStyle = Math.floor(t / 600) % 2 ? '#ff2a44' : '#5a0a14'; g.fillText('● CAM-1 · YARD' + (zoom > 1 ? ' ×3' : ''), ox + fs * 0.6, oy + fs * 1.4);
      g.fillStyle = '#00ffff'; g.fillText(k ? 'ON: crate ' + k.id : 'tap the feed to aim', ox + fs * 0.6, oy + fs * 2.8);
      this.raf = requestAnimationFrame(frame);
    };
    requestAnimationFrame(() => { fit(); this.raf = requestAnimationFrame(frame); });
  }

  // ---------- HINGE: permission, not answers ----------

  talk() {
    this.show('dlg');
    const box = el('div', 'dlg-box');
    this.body.appendChild(box);
    const T: Record<string, () => [string, [string, string][] | null]> = {
      start: () => this.m.gateAllowed
        ? ['Signals: allowed. One second per ping. Do not make me regret this.', [['Thanks, HINGE.', 'bye']]]
        : ['State your business. Briefly. I have been a hatch for eleven years.', [['I have a parcel coming.', 'parcel'], ['Can you open, please?', 'please'], ['Open.', 'blunt']]],
      parcel: () => ['Parcels. Always parcels. I do not watch chutes. I have standards.', [['What if something pinged you?', 'ping'], ['Never mind.', 'start']]],
      ping: () => ['A signal? Hm. Automation. Very modern. Fine: one ping, I open for one second. I will not wait.', [['Deal.', 'deal']]],
      please: () => ['Manners. Rare. But I do not open for people. I open for reasons.', [['The reason is a parcel.', 'parcel']]],
      blunt: () => ['Bold. No.', [['Let me start over.', 'start']]],
      deal: () => { this.m.allowSignals(); return ['Noted. Signals allowed. Timing is your problem.', null]; },
      bye: () => ['Hmph.', null],
    };
    const show = (id: string) => {
      const [text, opts] = T[id]();
      box.textContent = '';
      box.append(el('b', 'dlg-name', 'HINGE · hatch daemon'), el('p', 'dlg-text', text));
      const ch = el('div', 'dlg-choices'); box.appendChild(ch);
      if (!opts) { ch.appendChild(button('(unplug)', 'dlg-choice', () => this.close())); return; }
      opts.forEach(([line, next]) => ch.appendChild(button(line, 'dlg-choice', () => { this.say(['say "' + line + '" > hinge', '', 'dim']); show(next); })));
      ch.appendChild(button('⌨ say something else…', 'dlg-choice dlg-kb', () => {
        ch.textContent = '';
        const inp = el('input', 'dlg-input'); inp.placeholder = 'type, then Enter'; inp.setAttribute('aria-label', 'Say something to HINGE');
        ch.appendChild(inp); inp.focus();
        inp.addEventListener('keydown', (e) => {
          e.stopPropagation();
          if (e.key !== 'Enter' || !inp.value.trim()) return;
          const line = inp.value.trim(); this.say(['say "' + line + '" > hinge', '', 'dim']);
          if (/wire|ping|signal|automat/i.test(line)) show('ping');
          else { box.querySelector('.dlg-text')!.textContent = 'HINGE does not parse that. HINGE does not want to.'; ch.textContent = ''; ch.appendChild(button('Try again.', 'dlg-choice', () => show('start'))); }
        });
      }));
    };
    show('start');
  }

  // ---------- the workbench: two parts in, one device out ----------

  bench() {
    this.show('bench');
    const INV = ['timer', 'relay', 'lamp', 'speaker'];
    let pick: string[] = [];
    const paint = () => {
      this.body.textContent = '';
      const inv = el('div', 'bench-row'); inv.appendChild(el('span', 'bench-h', 'PARTS IN YOUR POCKET'));
      INV.forEach((p) => inv.appendChild(button(p, 'bench-item' + (pick.includes(p) ? ' sel' : ''), () => {
        pick = pick.includes(p) ? pick.filter((x) => x !== p) : pick.length < 2 ? [...pick, p] : pick; paint();
      })));
      const bp = el('div', 'bench-print');
      [0, 1].forEach((i) => bp.appendChild(el('div', 'bench-sock' + (pick[i] ? ' full' : ''), pick[i] ?? 'socket ' + (i + 1))));
      const go = button('PRESS', 'bench-go', () => { const [a, b] = pick; pick = []; this.say(this.m.craft(a, b)); paint(); });
      go.disabled = pick.length < 2; bp.appendChild(go);
      const made = [...this.m.devices.values()].filter((d) => d.crafted).map((d) => d.name);
      const out = el('div', 'bench-row'); out.appendChild(el('span', 'bench-h', 'CRAFTED · they stand in the yard and show up on the board'));
      made.forEach((n) => out.appendChild(el('span', 'bench-item', n)));
      this.body.append(inv, bp, out);
    };
    paint();
  }
}
