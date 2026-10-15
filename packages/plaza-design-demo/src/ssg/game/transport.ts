/**
 * Sudo's time control (`?sudo` only): a thin transport bar along the bottom edge while a timed
 * picture plays (the title's sunrise, the glide, every cutscene), so a moment can be named exactly.
 *
 * - Timecode `m:ss.s / m:ss.s` and the beat it is in (the glide's BEACH, HARBOR, SPIRE ...).
 * - Play/pause, step back/forward 0.5 s (stepping pauses), speed 0.25× to 4×, a scrubber to drag
 *   (beats are ticks on it).
 * - Keys: Space play/pause, `,` and `.` step, `[` and `]` speed, Home or 0 restart, 1–9 jump to
 *   that beat. With the title's menu up, Space stays the menu's.
 * - The `TC` button folds the bar away to just itself (remembered in this browser).
 *
 * What plays it (game.ts) gives a `Timeline`: its time, a way to seek, and its beats. Seeking only
 * sets the time: the picture must draw any time the same (title/glide.ts, cutscenes/ draw from t).
 * Playing hands over at the end as before; a seek to the end holds on the last frame until play.
 */

export interface Beat { at: number; name: string }

export interface Timeline {
  /** Changes when the timeline does (the title's sunrise becomes the glide): the bar starts playing again. */
  id: string;
  /** What plays: TITLE, GLIDE, ACT2. */
  label: string;
  duration: number;
  beats: Beat[];
  time(): number;
  /** Go to `t` (clamped by the timeline); nothing hands over. */
  seek(t: number): void;
}

const SPEEDS = [0.25, 0.5, 1, 2, 4];
const STEP = 0.5;
const FOLD_KEY = 'access-denied-sudo-transport';

/** m:ss.s */
export const timecode = (s: number) => {
  const t = Math.max(0, Math.round(s * 10) / 10), m = Math.floor(t / 60), r = t - m * 60;
  return m + ':' + (r < 10 ? '0' : '') + r.toFixed(1);
};

export class Transport {
  playing = true;
  private speed = 2;
  private tl: Timeline | null = null;
  private root: HTMLDivElement;
  private els: { play: HTMLButtonElement; speed: HTMLButtonElement; time: HTMLElement; beat: HTMLElement; track: HTMLElement; fill: HTMLElement; ticks: HTMLElement; fold: HTMLButtonElement };
  private shown = { time: '', beat: '', pos: -1, play: '', speed: '' };
  private dragging = false;

  constructor(host: HTMLElement) {
    const root = (this.root = document.createElement('div'));
    root.id = 'sudo-transport';
    root.hidden = true;
    root.setAttribute('role', 'toolbar');
    root.setAttribute('aria-label', 'Sudo time control');
    root.innerHTML =
      '<button type="button" class="st-fold" title="Hide or show the time control" aria-label="Hide or show the time control">TC</button>' +
      '<div class="st-body">' +
      '<button type="button" class="st-b" data-do="restart" title="Restart (Home)" aria-label="Restart">|&lsaquo;</button>' +
      '<button type="button" class="st-b" data-do="back" title="Back 0.5 s (,)" aria-label="Back half a second">&lsaquo;&lsaquo;</button>' +
      '<button type="button" class="st-b st-play" data-do="play" title="Play / pause (Space)" aria-label="Play or pause"></button>' +
      '<button type="button" class="st-b" data-do="fwd" title="Forward 0.5 s (.)" aria-label="Forward half a second">&rsaquo;&rsaquo;</button>' +
      '<button type="button" class="st-b st-speed" data-do="speed" title="Speed ([ and ])" aria-label="Speed"></button>' +
      '<span class="st-time"></span><span class="st-beat"></span>' +
      '<div class="st-track" role="slider" aria-label="Seek"><div class="st-rail"><div class="st-fill"></div></div><div class="st-ticks"></div></div>' +
      '</div>';
    const q = <T extends HTMLElement>(s: string) => root.querySelector<T>(s)!;
    this.els = {
      play: q('.st-play'), speed: q('.st-speed'), time: q('.st-time'), beat: q('.st-beat'),
      track: q('.st-track'), fill: q('.st-fill'), ticks: q('.st-ticks'), fold: q('.st-fold'),
    };
    // buttons never take focus (Space would press them as well as reach the game)
    root.addEventListener('mousedown', (e) => e.preventDefault());
    root.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-do]');
      if (!b) return;
      const d = b.dataset.do;
      if (d === 'restart') this.restart();
      else if (d === 'back') this.step(-STEP);
      else if (d === 'fwd') this.step(STEP);
      else if (d === 'play') this.toggle();
      else if (d === 'speed') this.setSpeed((this.speed + 1) % SPEEDS.length);
      this.sync();
    });
    this.els.fold.addEventListener('click', () => {
      const folded = root.classList.toggle('st-folded');
      try { localStorage.setItem(FOLD_KEY, folded ? '1' : ''); } catch { /* no storage */ }
    });
    try { if (localStorage.getItem(FOLD_KEY)) root.classList.add('st-folded'); } catch { /* no storage */ }
    const track = this.els.track;
    const seekAt = (e: PointerEvent) => {
      if (!this.tl) return;
      const r = track.getBoundingClientRect();
      this.tl.seek(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * this.tl.duration);
      this.sync();
    };
    track.addEventListener('pointerdown', (e) => { e.preventDefault(); this.dragging = true; track.setPointerCapture(e.pointerId); seekAt(e); });
    track.addEventListener('pointermove', (e) => { if (this.dragging) seekAt(e); });
    const lift = (e: PointerEvent) => { this.dragging = false; if (track.hasPointerCapture(e.pointerId)) track.releasePointerCapture(e.pointerId); };
    track.addEventListener('pointerup', lift);
    track.addEventListener('pointercancel', lift);
    host.appendChild(root);
  }

  /** How fast time runs this frame: 0 paused (or held by a drag), else the speed. */
  get rate() { return this.playing && !this.dragging ? SPEEDS[this.speed] : 0; }

  /** What plays now (null: nothing, the bar hides). A new timeline plays from where it is. */
  attach(tl: Timeline | null) {
    if (tl?.id === this.tl?.id && tl?.label === this.tl?.label) { this.tl = tl; return; }
    this.tl = tl;
    this.root.hidden = !tl;
    this.dragging = false;
    if (!tl) return;
    this.playing = true;
    this.els.ticks.textContent = '';
    for (const b of tl.beats) {
      if (b.at <= 0 || b.at >= tl.duration) continue;
      const k = document.createElement('i');
      k.style.left = (100 * b.at) / tl.duration + '%';
      k.title = b.name + ' ' + timecode(b.at);
      this.els.ticks.appendChild(k);
    }
    this.shown = { time: '', beat: '', pos: -1, play: '', speed: '' };
    this.sync();
  }

  /** A key while a timeline plays: true if it was the transport's. `menuUp`: the title's menu has Space. */
  key(e: KeyboardEvent, menuUp: boolean): boolean {
    if (!this.tl || e.ctrlKey || e.metaKey || e.altKey) return false;
    const k = e.key;
    if (k === ' ' && !menuUp) { if (!e.repeat) this.toggle(); }
    else if (k === ',' || k === '<') this.step(-STEP);
    else if (k === '.' || k === '>') this.step(STEP);
    else if (k === '[') { if (!e.repeat) this.setSpeed(this.speed - 1); }
    else if (k === ']') { if (!e.repeat) this.setSpeed(this.speed + 1); }
    else if (k === 'Home' || k === '0') { if (!e.repeat) this.restart(); }
    else if (/^[1-9]$/.test(k)) { if (!e.repeat) { const b = this.tl.beats[Number(k) - 1]; if (b) this.tl.seek(b.at); } }
    else return false;
    e.preventDefault();
    this.sync();
    return true;
  }

  /** Bring the bar up to date with the timeline (every frame; writes the DOM only on change). */
  sync() {
    const tl = this.tl;
    if (!tl) return;
    const t = tl.time(), d = tl.duration, s = this.shown;
    const time = timecode(t) + ' / ' + timecode(d);
    let beat = '';
    for (const b of tl.beats) if (t >= b.at) beat = b.name;
    beat = tl.label + (beat ? ' · ' + beat : '');
    const pos = Math.round((1000 * Math.min(t, d)) / d) / 10;
    const play = this.playing ? '❚❚' : '▶';
    const speed = SPEEDS[this.speed] + '×';
    if (time !== s.time) this.els.time.textContent = s.time = time;
    if (beat !== s.beat) this.els.beat.textContent = s.beat = beat;
    if (pos !== s.pos) { this.els.fill.style.width = (s.pos = pos) + '%'; this.els.track.setAttribute('aria-valuetext', time); }
    if (play !== s.play) { this.els.play.textContent = s.play = play; this.els.play.setAttribute('aria-pressed', String(!this.playing)); }
    if (speed !== s.speed) this.els.speed.textContent = s.speed = speed;
  }

  private toggle() {
    if (!this.tl) return;
    this.playing = !this.playing;
  }

  private step(d: number) {
    if (!this.tl) return;
    this.playing = false;
    this.tl.seek(this.tl.time() + d);
  }

  private restart() { this.tl?.seek(0); }

  private setSpeed(i: number) { this.speed = Math.max(0, Math.min(SPEEDS.length - 1, i)); }
}
