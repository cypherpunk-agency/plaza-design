/**
 * Hints: a channel any part of the game can send a short line to (docs/design/DECK-SCREEN-PLAN.md).
 * It does not decide when a player gets help; senders do. One hint shows at a time, in the hint
 * lane under the scene title (game.ts drawHud); the rest wait their turn. Each id shows once per
 * run (`save.seenHints`; not `save.hints`, which counts the fixer's paid hints). A sticky hint (a
 * control you have not used yet) stays until its sender calls `done`. The deck's JOBS tab keeps the
 * latest one, so a missed hint is not lost.
 *
 * Timing is wall time while the game draws: the lane is only drawn in play, so the deck, the map and
 * cutscenes hold the queue.
 */

interface Hint { id: string; text: string; sticky: boolean }

/** How long a hint stays: a base plus a little per character (ms). */
const BASE_MS = 3500, PER_CHAR_MS = 45, FADE_MS = 400;

export class Hints {
  private queue: Hint[] = [];
  private cur: (Hint & { from: number; until: number }) | null = null;
  /** The last timed hint shown this session (JOBS). */
  latest: string | null = null;
  /** Wall time of the last frame the lane was drawn: a gap (deck, map, cutscene) is not counted. */
  private lastStep = 0;

  constructor(private seen: () => string[]) {}

  /**
   * Send a hint. `sticky`: it stays until `done(id)`. `repeat`: show it even if seen before.
   * `first`: it goes ahead of the queue and of the hint showing now (which comes back after it).
   */
  show(id: string, text: string, opts: { sticky?: boolean; repeat?: boolean; first?: boolean } = {}) {
    if (!opts.repeat && this.seen().includes(id)) return;
    if (this.pending(id)) return;
    const h = { id, text, sticky: !!opts.sticky };
    if (!opts.first) { this.queue.push(h); return; }
    if (this.cur) { this.queue.unshift({ id: this.cur.id, text: this.cur.text, sticky: this.cur.sticky }); this.cur = null; }
    this.queue.unshift(h);
  }

  /** Is this hint showing or waiting? */
  pending(id: string) { return this.cur?.id === id || this.queue.some((q) => q.id === id); }

  /** The player did it, or the sender withdraws it: gone, and seen for good. */
  done(id: string) {
    const seen = this.seen();
    if (seen.includes(id) && this.cur?.id !== id) return;
    this.queue = this.queue.filter((q) => q.id !== id);
    if (this.cur?.id === id) this.cur = null;
    if (!seen.includes(id)) seen.push(id);
  }

  /** Has this hint been shown (a timed one) or done (a sticky one)? */
  has(id: string) { return this.seen().includes(id); }

  /** The hint to draw now, with its opacity; null for none. Call once per drawn frame. */
  step(now = performance.now()): { text: string; alpha: number } | null {
    // time spent not drawing (the deck open, a cutscene) moves the current hint's clock along with it
    const gap = this.lastStep ? now - this.lastStep : 0;
    this.lastStep = now;
    if (this.cur && gap > 250) { this.cur.from += gap; this.cur.until += gap; }
    if (this.cur && !this.cur.sticky && now >= this.cur.until) this.cur = null;
    if (!this.cur && this.queue.length) {
      const q = this.queue.shift()!;
      this.cur = { ...q, from: now, until: now + BASE_MS + q.text.length * PER_CHAR_MS };
      // JOBS keeps timed hints; sticky ones are controls, and CONTROLS lists those
      if (!q.sticky) { this.latest = q.text; const seen = this.seen(); if (!seen.includes(q.id)) seen.push(q.id); }
    }
    if (!this.cur) return null;
    const left = this.cur.sticky ? FADE_MS : this.cur.until - now;
    return { text: this.cur.text, alpha: Math.max(0, Math.min(1, left / FADE_MS, (now - this.cur.from) / 200)) };
  }
}
