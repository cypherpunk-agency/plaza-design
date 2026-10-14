/**
 * cityScene - the cypherpunk.agency homepage background.
 *
 * A node skyline in front of a banded sun, standing on a reflective floor that a
 * pulse rolls across every few seconds. Rooftop cables carry packets to one big
 * antenna, which transmits them into the sky and receives others. Three towers
 * carry beacons for the live projects; hovering a route lights its beacon. Stars
 * near the cursor link into a mesh.
 *
 * Colours come from the theme tokens and follow `plaza-theme-change`. The canvas
 * is drawn at device-pixel resolution, the horizon sits below the call to action,
 * and `prefers-reduced-motion` gets a still frame.
 */

export interface Beacon {
  label: string;
  href: string;
}

export interface CityScene {
  start: () => void;
  stop: () => void;
  highlight: (label: string | null) => void;
}

interface Tower { x: number; w: number; h: number; win: [number, number, number][]; beacon?: string; ant?: boolean }
interface Packet { r: number; out: boolean; ph: string; k: number; s: number; v: number; c: 'a' | 'p'; sx: number; wait: number; dir: number }

export function initCityScene(
  canvasId: string,
  opts: {
    beacons: Beacon[];
    /** Element the horizon stays below (the call to action). */
    anchor?: string;
    /** Bar the beacon beams run up to; their labels sit just below it. */
    ceiling?: string;
    /** UI the sky stays behind: no stars or mesh are drawn under these. */
    mask?: string;
  },
): CityScene {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
  const ctx = canvas?.getContext('2d');
  const noop = { start: () => {}, stop: () => {}, highlight: () => {} };
  if (!canvas || !ctx) return noop;
  const x = ctx;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 0, H = 0, HY = 0, U = 1, SUN = 104, MAST = 150;
  let t = 0, last = 0, raf = 0, running = false;
  let mx = -1e4, my = -1e4, lit: string | null = null;

  // ---------- theme ----------
  const col = { p: '255,136,0', a: '0,255,255', d: '194,65,12', e: '255,0,85', bg: '#000', s1: '#fdba74', s2: '#ff8800', s3: '#ea580c' };
  const readTheme = () => {
    const cs = getComputedStyle(document.documentElement);
    const v = (n: string, f: string) => cs.getPropertyValue(n).trim() || f;
    col.p = v('--color-primary-500-rgb', col.p);
    col.a = v('--color-accent-400-rgb', col.a);
    col.d = v('--color-primary-700-rgb', col.d);
    col.e = v('--color-error-rgb', col.e);
    col.bg = v('--color-bg-base', col.bg);
    col.s1 = v('--color-primary-300', col.s1);
    col.s2 = v('--color-primary-500', col.s2);
    col.s3 = v('--color-primary-600', col.s3);
  };
  const rgba = (c: string, a: number) => `rgba(${c},${a})`;

  // ---------- layout (rebuilt on resize) ----------
  let sd = 11;
  const rnd = () => (sd = (sd * 9301 + 49297) % 233280) / 233280;
  let towers: Tower[] = [], roofs: Tower[] = [], ant: Tower, A = 0;
  let stars: { x: number; y: number; a: number; p: number }[] = [];
  let packets: Packet[] = [];
  const roofTop = (tw: Tower): [number, number] => [tw.x + tw.w / 2, HY - tw.h];
  const tip = (): [number, number] => [roofTop(ant)[0], roofTop(ant)[1] - MAST];

  function layout() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas!.width = Math.round(W * dpr); canvas!.height = Math.round(H * dpr);
    canvas!.style.width = W + 'px'; canvas!.style.height = H + 'px';
    x.setTransform(dpr, 0, 0, dpr, 0, 0);

    U = Math.max(0.45, Math.min(1.4, Math.min(W / 1200, H / 720)));
    SUN = 104 * U; MAST = 150 * U;
    // Horizon: below the call to action where the screen allows, never off the floor.
    let hy = H * 0.64;
    const cta = opts.anchor ? document.querySelector(opts.anchor) : null;
    if (cta) hy = Math.max(hy, cta.getBoundingClientRect().bottom + 16 * U + SUN * 0.85);
    HY = Math.min(hy, H - 70 * U);

    sd = 11;
    const cx = W / 2;
    towers = [];
    for (let px = -4 * U; px < W;) {
      const w = (22 + rnd() * 40) * U;
      let h = (30 + rnd() * 120) * U;
      const dc = Math.abs(px + w / 2 - cx);
      if (dc < SUN * 1.65) h *= 0.32 + (dc / (SUN * 1.65)) * 0.5;
      towers.push({ x: px, w, h, win: [] });
      px += w + 3 * U;
    }
    const nearest = (fx: number) => towers.reduce((a, b) => (Math.abs(b.x + b.w / 2 - fx) < Math.abs(a.x + a.w / 2 - fx) ? b : a));
    // Beacons spread over the full width (labels sit above the side panels); the
    // antenna stands left of the sun.
    const spots = [W * 0.13, W * 0.64, W * 0.86];
    opts.beacons.slice(0, 3).forEach((b, i) => {
      const tw = nearest(spots[i]);
      tw.h = [200, 185, 210][i] * U; tw.w = Math.max(tw.w, 38 * U); tw.beacon = b.label;
    });
    ant = nearest(W * 0.31);
    ant.h = 165 * U; ant.w = 46 * U; ant.ant = true; ant.beacon = undefined;
    for (const tw of towers) {
      tw.win = [];
      for (let wy = HY - tw.h + 6 * U; wy < HY - 4 * U; wy += 7 * U)
        for (let wx = tw.x + 4 * U; wx < tw.x + tw.w - 4 * U; wx += 6 * U)
          if (rnd() < 0.38) tw.win.push([wx, wy, rnd() < 0.06 ? rnd() * 7 : -1]);
    }
    roofs = towers.filter((z) => z.h > 70 * U || z.ant).sort((a, b) => a.x - b.x);
    A = roofs.indexOf(ant);
    stars = Array.from({ length: Math.round((W * H) / 9000) }, () => ({ x: rnd() * W, y: 8 + rnd() * Math.max(10, HY - 230 * U), a: 0.25 + rnd() * 0.5, p: rnd() * 7 }));
    packets = Array.from({ length: 16 }, () => mk());
    packets.forEach((p) => { if (!p.out) { p.ph = 'fall'; p.s = rnd(); } });
  }

  function mk(): Packet {
    const r = Math.floor(rnd() * roofs.length);
    return { r, out: rnd() < 0.55, ph: 'cable', k: r, s: 0, v: 0.0018 + rnd() * 0.0018, c: rnd() < 0.75 ? 'a' : 'p', sx: tip()[0] + (rnd() - 0.5) * 260 * U, wait: rnd() * 200, dir: 1 };
  }

  // ---------- drawing ----------
  const P = (X: number, Z: number): [number, number] => [W / 2 + (X * W) / 2 / Z, HY + (H - HY) / Z];

  function cablePt(i: number, j: number, s: number): [number, number] {
    const a = roofTop(roofs[i]), b = roofTop(roofs[j]);
    const sag = Math.max(a[1], b[1]) + 18 * U + Math.abs(b[0] - a[0]) * 0.08;
    const u = 1 - s, m = (a[0] + b[0]) / 2;
    return [u * u * a[0] + 2 * u * s * m + s * s * b[0], u * u * a[1] + 2 * u * s * sag + s * s * b[1]];
  }

  function sun() {
    const r = SUN, cx = W / 2, cy = HY;
    x.save();
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, r * 2.2);
    g.addColorStop(0, rgba(col.p, 0.42)); g.addColorStop(1, rgba(col.p, 0));
    x.fillStyle = g; x.fillRect(cx - r * 2.2, cy - r * 2.2, r * 4.4, r * 2.2);
    x.beginPath(); x.arc(cx, cy, r, Math.PI, 0); x.clip();
    const s = x.createLinearGradient(0, cy - r, 0, cy);
    s.addColorStop(0, col.s1); s.addColorStop(0.55, col.s2); s.addColorStop(1, col.s3);
    x.fillStyle = s; x.fillRect(cx - r, cy - r, 2 * r, r);
    // Bands hold still and drift up and down a few pixels.
    x.fillStyle = col.bg;
    const bob = Math.sin(t * 0.012) * 3 * U;
    for (let i = 0; i < 6; i++) x.fillRect(cx - r, cy - r * 0.52 + i * r * 0.1 + bob, 2 * r, (1.5 + i * 1.6) * U);
    x.restore();
  }

  function mast() {
    const [bx, by] = roofTop(ant), tp = tip();
    x.strokeStyle = rgba(col.d, 1); x.lineWidth = 1;
    x.beginPath(); x.moveTo(bx - 10 * U, by); x.lineTo(bx, tp[1]); x.lineTo(bx + 10 * U, by); x.stroke();
    for (let i = 1; i < 9; i++) {
      const y1 = by - (MAST * (i - 1)) / 9, y2 = by - (MAST * i) / 9, w1 = 10 * U * (1 - (i - 1) / 9), w2 = 10 * U * (1 - i / 9);
      x.beginPath(); x.moveTo(bx - w1, y1); x.lineTo(bx + w2, y2); x.moveTo(bx + w1, y1); x.lineTo(bx - w2, y2); x.stroke();
    }
    x.fillStyle = rgba(col.d, 1);
    x.fillRect(bx - 14 * U, by - MAST * 0.55, 28 * U, 2); x.fillRect(bx - 9 * U, by - MAST * 0.8, 18 * U, 2);
    x.fillStyle = rgba(col.e, Math.sin(t * 0.08) > 0 ? 1 : 0.25);
    x.fillRect(tp[0] - 3 * U, tp[1] - 6 * U, 6 * U, 6 * U);
  }

  function city(alpha: number) {
    x.globalAlpha = alpha;
    for (const tw of towers) {
      const tp = HY - tw.h;
      x.fillStyle = col.bg; x.fillRect(tw.x, tp, tw.w, tw.h);
      x.strokeStyle = rgba(col.d, 0.85); x.lineWidth = 1; x.strokeRect(tw.x + 0.5, tp + 0.5, tw.w - 1, tw.h);
      for (const [wx, wy, ph] of tw.win) {
        const on = ph < 0 ? 1 : Math.sin(t * 0.03 + ph) > 0.2 ? 1 : 0.15;
        x.fillStyle = rgba(col.p, 0.22 + 0.4 * on); x.fillRect(wx, wy, 3 * U, 3 * U);
      }
    }
    mast();
    x.globalAlpha = 1;
  }

  function cables() {
    x.strokeStyle = rgba(col.d, 0.28); x.lineWidth = 1;
    for (let i = 0; i < roofs.length - 1; i++) {
      x.beginPath();
      for (let s = 0; s <= 1.001; s += 0.05) { const p = cablePt(i, i + 1, s); s ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]); }
      x.stroke();
    }
  }

  /** Clip drawing to everything outside the UI (`opts.mask`), so it reads as behind it. */
  function clipOutUI() {
    x.beginPath(); x.rect(0, 0, W, H);
    if (opts.mask)
      document.querySelectorAll(opts.mask).forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width && r.height) x.rect(r.left - 6, r.top - 6, r.width + 12, r.height + 12);
      });
    x.clip('evenodd');
  }

  /** Bottom edge of the bar the beams run up to (the window header). */
  function ceilingY(): number {
    const el = opts.ceiling ? document.querySelector(opts.ceiling) : null;
    return el ? el.getBoundingClientRect().bottom : 0;
  }

  function beacons(labels: boolean) {
    const topY = ceilingY();
    x.font = `${Math.round(13 * Math.max(U, 0.85))}px 'IBM Plex Mono', monospace`;
    x.textAlign = 'center'; x.textBaseline = 'top';
    towers.filter((z) => z.beacon).forEach((tw, i) => {
      const cx = tw.x + tw.w / 2, tp = HY - tw.h, on = tw.beacon === lit;
      const p = on ? 1 : (Math.sin(t * 0.025 + i * 2.1) + 1) / 2;
      x.fillStyle = rgba(col.a, 0.9); x.fillRect(cx - 1, tp - 14 * U, 2, 14 * U);
      // The beam shines all the way up to the bar.
      const g = x.createLinearGradient(0, tp - 14 * U, 0, topY);
      g.addColorStop(0, rgba(col.a, (on ? 0.55 : 0.28) + 0.3 * p));
      g.addColorStop(1, rgba(col.a, on ? 0.35 : 0.1));
      const bw = (on ? 6 : 4) * U;
      x.save();
      if (labels) clipOutUI();
      x.fillStyle = g; x.fillRect(cx - bw / 2, topY, bw, tp - 14 * U - topY);
      x.restore();
      x.fillStyle = rgba(col.a, p > 0.5 ? 1 : 0.4); x.fillRect(cx - 3 * U, tp - 18 * U, 6 * U, 6 * U);
      if (labels) { x.fillStyle = rgba(col.a, on ? 1 : 0.75); x.fillText(tw.beacon!, cx, topY + 10 * U); }
    });
    x.textBaseline = 'alphabetic';
  }

  function dot(p: [number, number], c: string, sz: number) {
    x.fillStyle = rgba(c, 1); x.fillRect(p[0] - sz / 2, p[1] - sz / 2, sz, sz);
    x.fillStyle = rgba(c, 0.15); x.fillRect(p[0] - sz, p[1] - sz, sz * 2, sz * 2);
  }

  function streak(px: number, py: number, c: string, up: boolean) {
    const y2 = py + (up ? 40 : -40) * U;
    const g = x.createLinearGradient(0, py, 0, y2);
    g.addColorStop(0, rgba(c, 1)); g.addColorStop(1, rgba(c, 0));
    x.fillStyle = g; x.fillRect(px - 1, Math.min(py, y2), 2, 40 * U);
    dot([px, py], c, 4 * U);
  }

  function packetsStep(k: number) {
    const [bx, by] = roofTop(ant), tp = tip(), sz = 3 * U;
    for (const p of packets) {
      const c = p.c === 'a' ? col.a : col.p;
      if (p.wait > 0) { p.wait -= k; continue; }
      if (p.out) {
        if (p.ph === 'cable') {
          if (p.k === A) { p.ph = 'climb'; p.s = 0; continue; }
          const j = p.k + (p.k < A ? 1 : -1);
          p.s += p.v * 2 * k; dot(cablePt(p.k, j, Math.min(p.s, 1)), c, sz);
          if (p.s >= 1) { p.k = j; p.s = 0; }
        } else if (p.ph === 'climb') {
          p.s += 0.007 * k; dot([bx, by - MAST * p.s], c, sz);
          if (p.s >= 1) { p.ph = 'send'; p.s = 0; }
        } else {
          p.s += 0.0045 * k; streak(tp[0] + (p.sx - tp[0]) * p.s, tp[1] - p.s * (tp[1] + 30), c, true);
          if (p.s >= 1) Object.assign(p, mk(), { out: false, ph: 'fall', s: 0, wait: 0 });
        }
      } else if (p.ph === 'fall') {
        p.s += 0.0045 * k; streak(p.sx + (tp[0] - p.sx) * p.s, -30 + p.s * (tp[1] + 30), c, false);
        if (p.s >= 1) { p.ph = 'down'; p.s = 0; p.k = A; }
      } else if (p.ph === 'down') {
        p.s += 0.007 * k; dot([bx, tp[1] + MAST * p.s], c, sz);
        if (p.s >= 1) {
          if (p.r === A) Object.assign(p, mk(), { out: true, wait: 0 });
          else { p.ph = 'cable'; p.s = 0; p.dir = p.r < A ? -1 : 1; }
        }
      } else {
        const j = p.k + p.dir;
        if (j < 0 || j >= roofs.length || (p.dir < 0 ? p.k <= p.r : p.k >= p.r)) { Object.assign(p, mk(), { out: true }); continue; }
        p.s += p.v * 2 * k; dot(cablePt(p.k, j, Math.min(p.s, 1)), c, sz);
        if (p.s >= 1) { p.k = j; p.s = 0; }
      }
    }
  }

  function floorGrid(pz: number) {
    x.lineWidth = 1;
    for (let X = -30; X <= 30; X++) {
      const a = P(X, 40), b = P(X, 1);
      x.strokeStyle = rgba(col.p, 0.16); x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke();
    }
    for (let Z = 1; Z < 40; Z++) {
      const y = P(0, Z)[1], w = Math.max(0, 1 - Math.abs(Z - pz) / 1.4);
      x.strokeStyle = rgba(col.p, 0.12 + 0.75 * w); x.lineWidth = 1 + w;
      x.beginPath(); x.moveTo(0, y); x.lineTo(W, y); x.stroke();
    }
    x.lineWidth = 1;
  }

  function reflection(pz: number) {
    x.save();
    x.beginPath(); x.rect(0, HY, W, H - HY); x.clip();
    x.translate(0, HY); x.scale(1, -0.55); x.translate(0, -HY);
    sun(); city(0.4); beacons(false);
    x.restore();
    x.fillStyle = col.bg;
    for (let y = HY + 3, i = 0; y < H; y += 5 + i * 0.35, i++) x.fillRect(0, y, W, 1 + i * 0.12);
    if (pz < 50) {
      const yp = P(0, pz)[1], g = x.createLinearGradient(0, yp - 30, 0, yp + 30);
      g.addColorStop(0, rgba(col.p, 0)); g.addColorStop(0.5, rgba(col.p, 0.1)); g.addColorStop(1, rgba(col.p, 0));
      x.fillStyle = g; x.fillRect(0, yp - 30, W, 60);
    }
    floorGrid(pz);
  }

  function sky() {
    // The sky sits behind every piece of UI, the decorative panels included.
    x.save();
    clipOutUI();
    for (const s of stars) { x.fillStyle = `rgba(255,217,165,${s.a * (0.7 + 0.3 * Math.sin(t * 0.02 + s.p))})`; x.fillRect(s.x, s.y, 2, 2); }
    const nr = stars.filter((s) => Math.hypot(s.x - mx, s.y - my) < 170);
    for (let i = 0; i < nr.length; i++)
      for (let j = i + 1; j < nr.length; j++) {
        const d = Math.hypot(nr[i].x - nr[j].x, nr[i].y - nr[j].y);
        if (d < 120) { x.strokeStyle = rgba(col.a, 0.55 * (1 - d / 120)); x.beginPath(); x.moveTo(nr[i].x + 1, nr[i].y + 1); x.lineTo(nr[j].x + 1, nr[j].y + 1); x.stroke(); }
      }
    for (const s of nr) { x.fillStyle = rgba(col.a, 0.95); x.fillRect(s.x - 1, s.y - 1, 4, 4); }
    x.restore();
  }

  function frame(k: number) {
    x.fillStyle = col.bg; x.fillRect(0, 0, W, H);
    sky();
    const cyc = (t * 0.006) % 1.6, pz = reduced ? 99 : cyc < 1 ? 40 - cyc * 39 : 99;
    reflection(pz);
    const hg = x.createLinearGradient(0, HY - 18, 0, HY + 18);
    hg.addColorStop(0, rgba(col.p, 0)); hg.addColorStop(0.5, rgba(col.p, 0.5)); hg.addColorStop(1, rgba(col.p, 0));
    x.fillStyle = hg; x.fillRect(0, HY - 18, W, 36);
    sun(); city(1); cables(); beacons(W >= 640);
    if (!reduced) packetsStep(k);
  }

  function loop(now: number) {
    const k = last ? Math.min(3, (now - last) / 16.67) : 1;
    last = now; t += k;
    frame(k);
    if (running) raf = requestAnimationFrame(loop);
  }

  const still = () => { if (reduced) frame(0); };
  readTheme(); layout();
  window.addEventListener('resize', () => { layout(); still(); });
  window.addEventListener('plaza-theme-change', () => { readTheme(); still(); });
  window.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; if (reduced) frame(0); });
  document.addEventListener('mouseleave', () => { mx = my = -1e4; still(); });

  return {
    start() { if (reduced) { frame(0); return; } if (!running) { running = true; raf = requestAnimationFrame(loop); } },
    stop() { running = false; cancelAnimationFrame(raf); },
    highlight(label) { lit = label; still(); },
  };
}
