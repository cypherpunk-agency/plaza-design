/**
 * Shield rings (P12's DISPATCH): concentric rings spin round a core, each
 * with a gap. Lock the outermost ring while its gap passes the port at the
 * top, then the next, down to the core. A miss makes that ring flinch: it
 * spins the other way, 15 % faster (up to 220 °/s). Two cards help, once per
 * try, if the keyring holds them: SLOW (0.35× for 4 s) and PING (the next
 * gap counts wider).
 *
 * `Rings` is the rule (pure: node can play it); `ringsPanel` is the panel.
 * Keyboard: Space / Enter lock, S and P play the cards. Mouse and touch: tap
 * the rings or LOCK.
 */

import type { KeyItem, RingsToyData } from '../../data/types';
import type { PanelKit } from '../panels';
import { fitCanvas, INK, toyFrame, wrapDeg } from './common';

const TOLERANCE = 20;
const PING_TOLERANCE = 38;
const SLOW = 0.35;
const SLOW_MS = 4000;
const MAX_SPEED = 220;
const FLINCH = 1.15;

export class Rings {
  readonly rings: { speed: number; gap: number; angle: number; locked: boolean }[];
  private slowLeft = 0;
  private ping = false;
  private used = new Set<string>();

  constructor(private d: RingsToyData) {
    this.rings = d.rings.map((r) => ({ speed: r.speed, gap: r.gap, angle: r.start ?? 0, locked: false }));
  }

  /** The ring to lock next (outermost first), or -1 when all are locked. */
  get current() { return this.rings.findIndex((r) => !r.locked); }
  get done() { return this.current < 0; }
  get slowed() { return this.slowLeft > 0; }
  get pinged() { return this.ping; }
  /** How far the ring's gap centre is from the port, in degrees (-180…180). */
  off(i: number) { const r = this.rings[i]; return wrapDeg(r.angle + r.gap / 2); }
  /** How close counts, now. */
  tolerance() { return this.ping ? PING_TOLERANCE : this.d.tolerance ?? TOLERANCE; }

  /** Spin the rings that are still loose by `dt` ms. */
  tick(dt: number) {
    const k = this.slowLeft > 0 ? SLOW : 1;
    this.slowLeft = Math.max(0, this.slowLeft - dt);
    for (const r of this.rings) if (!r.locked) r.angle = (r.angle + r.speed * k * dt / 1000 + 360) % 360;
  }

  /** Lock the current ring: a hit if its gap is at the port. A miss reverses it. */
  lock(): { ring: number; hit: boolean } {
    const i = this.current;
    if (i < 0) return { ring: -1, hit: true };
    const r = this.rings[i], hit = Math.abs(this.off(i)) <= this.tolerance();
    this.ping = false;
    if (hit) { r.locked = true; r.angle = (360 - r.gap / 2) % 360; }
    else r.speed = -Math.sign(r.speed || 1) * Math.min(MAX_SPEED, Math.abs(r.speed) * FLINCH);
    return { ring: i, hit };
  }

  /** Play a card, once per try. Returns false if it was played already. */
  card(kind: 'slow' | 'ping') {
    if (this.used.has(kind)) return false;
    this.used.add(kind);
    if (kind === 'slow') this.slowLeft = SLOW_MS; else this.ping = true;
    return true;
  }
  played(kind: 'slow' | 'ping') { return this.used.has(kind); }
}

export function ringsPanel(kit: PanelKit, key: string) {
  const { m } = kit, data = m.guardOf(key)?.rings;
  if (!data) return;
  const f = toyFrame(kit, key, m.label('toy.rings.title'), m.label('toy.rings.hint'));
  if (!f) return;
  const toy = new Rings(data);
  const { c, g, fit } = fitCanvas(f.area);
  let flash: { ring: number; hit: boolean; t: number } | null = null, now = 0;
  const lock = () => {
    const r = toy.lock();
    if (r.ring < 0) return;
    flash = { ...r, t: now };
    f.say(m.line(r.hit ? 'toy.rings.hit' : 'toy.rings.miss', { n: r.ring + 1 }), r.hit && !toy.done);
    if (toy.done) f.solved();
  };
  f.btn(m.label('toy.rings.lock'), lock, 'primary');
  // cards on the keyring: once each per try
  const cards = m.items().filter((k): k is KeyItem & { card: 'slow' | 'ping' } => k.kind === 'card' && !!k.card);
  const play = (k: KeyItem & { card: 'slow' | 'ping' }, b: HTMLButtonElement) => {
    if (!toy.card(k.card)) return;
    b.disabled = true;
    f.say(m.line('toy.card.' + k.card, { label: k.label }));
  };
  cards.forEach((k) => { const b = f.btn(k.label, () => play(k, b), 'card'); b.title = k.card === 'slow' ? 'S' : 'P'; });
  c.addEventListener('pointerdown', (e) => { e.preventDefault(); if (f.live()) lock(); });
  f.keys((e, down) => {
    if (!down) return [' ', 'Enter', 's', 'S', 'p', 'P'].includes(e.key);
    if (e.repeat) return true;
    if (e.key === ' ' || e.key === 'Enter') { lock(); return true; }
    const want = e.key.toLowerCase() === 's' ? 'slow' : e.key.toLowerCase() === 'p' ? 'ping' : null;
    const k = want && cards.find((x) => x.card === want);
    if (k) { const b = [...f.controls.querySelectorAll<HTMLButtonElement>('.card')][cards.indexOf(k)]; if (b) play(k, b); return true; }
    return false;
  });

  kit.frame((ms, t) => {
    now = t;
    if (f.live()) toy.tick(Math.min(100, ms));
    const { w, h } = fit(), cx = w / 2, cy = h / 2 + 8, R = Math.min(w, h) * 0.42, n = toy.rings.length;
    g.fillStyle = INK.bg; g.fillRect(0, 0, w, h);
    // the port: a notch at the top, where every gap must be
    const tol = toy.tolerance() * Math.PI / 180;
    g.strokeStyle = toy.pinged ? INK.green : 'rgba(0, 255, 255, 0.35)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R + 14, -Math.PI / 2 - tol, -Math.PI / 2 + tol); g.closePath();
    g.fillStyle = toy.pinged ? 'rgba(0, 255, 136, 0.08)' : 'rgba(0, 255, 255, 0.05)'; g.fill(); g.stroke();
    g.fillStyle = INK.cyan; g.beginPath(); g.moveTo(cx, cy - R - 6); g.lineTo(cx - 7, cy - R - 18); g.lineTo(cx + 7, cy - R - 18); g.fill();
    toy.rings.forEach((r, i) => {
      const rad = R * (1 - (i / Math.max(1, n)) * 0.72), cur = i === toy.current;
      const a0 = (r.angle + r.gap) * Math.PI / 180 - Math.PI / 2, a1 = r.angle * Math.PI / 180 - Math.PI / 2 + Math.PI * 2;
      const hot = flash && flash.ring === i && now - flash.t < 400;
      g.lineWidth = cur ? 7 : 5;
      g.strokeStyle = r.locked ? INK.green : hot && !flash!.hit ? INK.red : cur ? INK.pink : 'rgba(255, 61, 242, 0.45)';
      if (cur) { g.shadowColor = INK.pink; g.shadowBlur = 10; }
      g.beginPath(); g.arc(cx, cy, rad, a0, a1); g.stroke();
      g.shadowBlur = 0;
    });
    // the core
    g.fillStyle = toy.done ? INK.green : INK.orange;
    g.beginPath(); g.arc(cx, cy, R * 0.16, 0, Math.PI * 2); g.fill();
    g.fillStyle = INK.paper; g.font = '11px "IBM Plex Mono", monospace'; g.textAlign = 'center';
    g.fillText(toy.slowed ? 'SLOW' : toy.done ? '' : 'SHIELD ' + (toy.current + 1) + '/' + n, cx, h - 10);
  });
}
