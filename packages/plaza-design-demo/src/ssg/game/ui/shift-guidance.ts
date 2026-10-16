import { shiftAttention, shiftGoal } from "../scenes/harbor-shift/index";

/** Brief goal introduction, then the original quiet HUD line. Menus pause its clock. */
export class ShiftGuidance {
  private live = document.createElement('span');
  private goal = '';
  private age = 0;
  private idle = 0;
  private settled = false;
  private target: ReturnType<typeof shiftAttention> = null;
  private blocked = true;

  constructor(host: HTMLElement, private reduced: boolean, private ping: (x: number | null) => void) {
    this.live.className = 'shift-task-live';
    this.live.setAttribute('role', 'status');
    this.live.setAttribute('aria-live', 'polite');
    this.live.setAttribute('aria-atomic', 'true');
    host.append(this.live);
  }

  hide() { this.blocked = true; this.ping(null); }

  update(flags: Readonly<Record<string, boolean>>, dt: number, busy: boolean, moving: boolean, px: number) {
    const goal = shiftGoal(flags);
    if (goal !== this.goal) {
      this.goal = goal; this.age = 0; this.idle = 0; this.settled = false;
      this.target = shiftAttention(flags);
      this.ping(null);
    }
    this.blocked = busy;
    if (busy) { this.idle = 0; this.ping(null); return; }
    if (this.age === 0) this.live.textContent = goal;
    this.age += dt;
    if (!this.settled && this.age >= 2.65) {
      this.settled = true;
      if (this.target && !this.target.gentle && Math.abs(px - this.target.x) > 40) this.ping(this.target.x);
    }
    if (!this.settled || !this.target) return;
    if (moving || Math.abs(px - this.target.x) <= 40) {
      this.idle = 0;
      if (Math.abs(px - this.target.x) <= 40) this.ping(null);
    } else {
      this.idle += dt;
      if (this.idle >= (this.target.gentle ? 30 : 20)) { this.ping(this.target.x); this.idle = 0; }
    }
  }

  /** Coordinates share the HUD's canvas space, so the text lands on its exact old baseline. */
  draw(x: CanvasRenderingContext2D, width: number, height: number, dockY: number) {
    if (this.blocked || !this.goal) return;
    const travel = Math.min(1, Math.max(0, (this.age - 2) / .65));
    const ease = this.reduced ? (travel >= .5 ? 1 : 0) : travel * travel * (3 - 2 * travel);
    const text = 'GOAL ' + this.goal;
    x.save();
    x.font = '600 11px "IBM Plex Mono", monospace';
    const centreSize = Math.min(11, 11 * (width - 16) / Math.max(1, x.measureText(text).width));
    x.font = `600 ${centreSize + (8 - centreSize) * ease}px "IBM Plex Mono", monospace`;
    x.textAlign = 'left';
    x.fillStyle = 'rgba(255,61,242,.9)';
    if (this.reduced && travel > 0 && travel < 1) x.globalAlpha *= Math.abs(travel * 2 - 1);
    const centreX = Math.max(8, (width - x.measureText(text).width) / 2);
    const centreY = Math.max(dockY, height * .3);
    x.fillText(text, centreX + (8 - centreX) * ease, centreY + (dockY - centreY) * ease);
    x.restore();
  }
}

export const SHIFT_GUIDANCE_STYLES = `
  .shift-task-live { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
  html:not(.game-mode) .shift-task-live { display: none; }
  @media (prefers-reduced-motion: reduce) { html.shift-prototype .fx-ping { animation: none; } }
`;
