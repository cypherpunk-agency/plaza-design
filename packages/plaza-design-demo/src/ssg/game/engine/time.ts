/** Scene time and delayed actions stop together; wall-clock lockouts are separate. */
export class SceneTime {
  private stoppedAt: number | null = null;
  private offset = 0;
  private pending = new Set<{ at: number; run: () => void; timer?: ReturnType<typeof setTimeout> }>();

  now() { return (this.stoppedAt ?? performance.now()) - this.offset; }

  pause(on: boolean) {
    if (on === (this.stoppedAt !== null)) return;
    if (on) {
      this.stoppedAt = performance.now();
      this.pending.forEach((p) => clearTimeout(p.timer));
    } else {
      this.offset += performance.now() - this.stoppedAt!;
      this.stoppedAt = null;
      this.pending.forEach((p) => this.schedule(p));
    }
  }

  later(ms: number, run: () => void) {
    const p = { at: this.now() + ms, run };
    this.pending.add(p);
    if (this.stoppedAt === null) this.schedule(p);
  }

  clear() {
    this.pending.forEach((p) => clearTimeout(p.timer));
    this.pending.clear();
  }

  private schedule(p: { at: number; run: () => void; timer?: ReturnType<typeof setTimeout> }) {
    p.timer = setTimeout(() => {
      this.pending.delete(p);
      p.run();
    }, Math.max(0, p.at - this.now()));
  }
}
