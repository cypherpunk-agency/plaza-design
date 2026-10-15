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
 *
 * In a scene (nothing timed playing) the bar's second mode is the city clock (`ClockBar`, below):
 * day, time of day, speed and a weather override.
 */

import { city, CLOCK_SPEEDS, hm } from './clock';
import { anyOverride, CLIMATE_IDS, CLIMATES, isWeather, overrideOf, setOverride, WEATHER_KINDS, weatherNow, type Climate } from './weather';

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

// ---------- the city clock (sudo, in a scene) ----------

const CLOCK_FOLD_KEY = 'access-denied-sudo-clock';

/**
 * Sudo's second mode of the time control: in a scene (no timed picture playing), the bar is the
 * city clock's (clock.ts, weather.ts; TIME.md "Sudo"): the day (‹ ›), the time of day (a slider),
 * the speed (■ stop, 1×, 10×, 60×), and the weather (where: here, the city or a climate; what:
 * AUTO, the forecast, or a state). `TC` folds it away to itself (folded at first; remembered in
 * this browser, apart from the cutscene bar). While a story beat pins the clock (the opening) the
 * time reads PINNED: setting it moves the pin, and the story puts it back.
 */
export class ClockBar {
  private root: HTMLDivElement;
  private els: { day: HTMLElement; time: HTMLElement; slider: HTMLInputElement; speed: HTMLButtonElement; where: HTMLSelectElement; kind: HTMLSelectElement; now: HTMLElement };
  private shown = { day: '', time: '', slider: -1, speed: '', now: '', kind: '' };
  private sliding = false;

  constructor(host: HTMLElement, private here: () => Climate | null, private changed: () => void) {
    const root = (this.root = document.createElement('div'));
    root.id = 'sudo-clock';
    root.hidden = true;
    root.setAttribute('role', 'toolbar');
    root.setAttribute('aria-label', 'Sudo city clock and weather');
    const opt = (v: string, t: string) => '<option value="' + v + '">' + t + '</option>';
    root.innerHTML =
      '<button type="button" class="st-fold" title="Hide or show the city clock" aria-label="Hide or show the city clock">TC</button>' +
      '<div class="st-body">' +
      '<button type="button" class="st-b" data-do="day-" title="A day back" aria-label="A day back">&lsaquo;</button>' +
      '<span class="sc-day"></span>' +
      '<button type="button" class="st-b" data-do="day+" title="A day on" aria-label="A day on">&rsaquo;</button>' +
      '<input class="sc-slider" type="range" min="0" max="1439" step="1" aria-label="Time of day">' +
      '<span class="st-time sc-time"></span>' +
      '<button type="button" class="st-b st-speed" data-do="speed" title="Clock speed: stop, 1×, 10×, 60×" aria-label="Clock speed"></button>' +
      '<select class="sc-where" aria-label="Weather override: where" title="Weather override: where">' + opt('here', 'HERE') + opt('city', 'CITY') +
      CLIMATE_IDS.map((c) => opt(c, CLIMATES[c].name)).join('') + '</select>' +
      '<select class="sc-kind" aria-label="Weather override: what" title="Weather override: what">' + opt('', 'AUTO') + WEATHER_KINDS.map((k) => opt(k, k.toUpperCase())).join('') + '</select>' +
      '<span class="st-beat sc-now"></span>' +
      '</div>';
    const q = <T extends HTMLElement>(s: string) => root.querySelector<T>(s)!;
    this.els = { day: q('.sc-day'), time: q('.sc-time'), slider: q('.sc-slider'), speed: q('.st-speed'), where: q('.sc-where'), kind: q('.sc-kind'), now: q('.sc-now') };
    // buttons never take focus (the game's keys stay the game's); the slider and the menus give it back after a change
    root.addEventListener('mousedown', (e) => { if (!(e.target as HTMLElement).closest('select, input')) e.preventDefault(); });
    const blur = () => (document.activeElement as HTMLElement | null)?.blur?.();
    root.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-do]');
      if (!b) return;
      const d = b.dataset.do;
      if (d === 'day-') city.setTime(city.day - 1, city.min);
      else if (d === 'day+') city.setTime(city.day + 1, city.min);
      else if (d === 'speed') city.speed = CLOCK_SPEEDS[(CLOCK_SPEEDS.indexOf(city.speed) + 1) % CLOCK_SPEEDS.length];
      this.changed();
      this.sync();
    });
    const s = this.els.slider;
    s.addEventListener('input', () => { this.sliding = true; city.setTime(city.day, Number(s.value)); this.changed(); this.sync(); });
    s.addEventListener('change', () => { this.sliding = false; blur(); });
    this.els.where.addEventListener('change', () => { this.syncKind(); blur(); });
    this.els.kind.addEventListener('change', () => {
      const k = this.els.kind.value;
      setOverride(this.where(), k && isWeather(k) ? k : null);
      this.changed(); this.sync(); blur();
    });
    q('.st-fold').addEventListener('click', () => {
      const folded = root.classList.toggle('st-folded');
      try { localStorage.setItem(CLOCK_FOLD_KEY, folded ? '1' : '0'); } catch { /* no storage */ }
    });
    try { if (localStorage.getItem(CLOCK_FOLD_KEY) !== '0') root.classList.add('st-folded'); } catch { root.classList.add('st-folded'); }
    host.appendChild(root);
  }

  /** In a scene with nothing timed playing: the bar shows; otherwise it hides. */
  show(on: boolean) { if (this.root.hidden === on) this.root.hidden = !on; if (on) this.sync(); }

  /** Where the override goes: the scene's climate (HERE), the city, or a named climate. */
  private where(): Climate | 'city' {
    const v = this.els.where.value;
    return v === 'here' ? this.here() ?? 'downtown' : (v as Climate | 'city');
  }

  private syncKind() { this.els.kind.value = overrideOf(this.where()) ?? ''; this.shown.kind = this.els.kind.value; }

  /** Bring the bar up to date (every frame while shown; writes the DOM only on change). */
  sync() {
    if (this.root.hidden) return;
    const s = this.shown, e = this.els;
    const day = 'DAY ' + city.day, time = hm(city.min) + (city.pinned !== null ? ' PINNED' : '');
    const speed = city.speed ? city.speed + '×' : '■';
    const here = this.here(), w = weatherNow(here);
    const now = (here ? CLIMATES[here].name : '-') + ' · ' + w.kind.toUpperCase() + (anyOverride() ? ' · SET' : '');
    if (day !== s.day) e.day.textContent = s.day = day;
    if (time !== s.time) e.time.textContent = s.time = time;
    if (speed !== s.speed) { e.speed.textContent = s.speed = speed; e.speed.setAttribute('aria-label', 'Clock speed: ' + (city.speed ? city.speed + ' times' : 'stopped')); }
    if (now !== s.now) e.now.textContent = s.now = now;
    const m = Math.floor(city.min);
    if (!this.sliding && m !== s.slider) { e.slider.value = String((s.slider = m)); e.slider.setAttribute('aria-valuetext', hm(m)); }
    if ((overrideOf(this.where()) ?? '') !== s.kind) this.syncKind();
  }
}
