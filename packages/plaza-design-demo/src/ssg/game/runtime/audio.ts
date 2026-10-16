/**
 * Chiptune blips made with WebAudio, no sound files. Off until the visitor
 * presses M (browsers only allow audio after an interaction anyway).
 */

let ctx: AudioContext | null = null;
let on = false;

function tone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.04, slide = 0) {
  if (!on || !ctx) return;
  const t0 = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.linearRampToValueAtTime(freq + slide, t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

export const sound = {
  get enabled() { return on; },
  toggle(): boolean {
    on = !on;
    if (on && !ctx) {
      try { ctx = new AudioContext(); } catch { on = false; }
    }
    if (on) ctx?.resume();
    if (on) tone(660, 0.08, 'square', 0.04);
    return on;
  },
  /** One letter of a speech bubble or terminal line. */
  blip() { tone(520 + Math.random() * 120, 0.03, 'square', 0.015); },
  denied() { tone(140, 0.18, 'sawtooth', 0.05); setTimeout(() => tone(110, 0.22, 'sawtooth', 0.05), 120); },
  granted() { [523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.12, 'square', 0.04), i * 90)); },
  jump() { tone(300, 0.12, 'square', 0.03, 260); },
  open() { tone(880, 0.05, 'triangle', 0.04); },
  /** The pause menu: the selection moves. */
  tick() { tone(1320, 0.025, 'square', 0.02); },
  close() { tone(440, 0.05, 'triangle', 0.03); },
};
