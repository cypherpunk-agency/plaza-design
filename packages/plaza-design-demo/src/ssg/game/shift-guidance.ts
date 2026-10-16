import { shiftAttention, shiftGoal } from './scenes/harbor-shift';

/** Prototype-only presentation. Game time drives it, so menus pause the announcement. */
export class ShiftGuidance {
  readonly card = document.createElement('button');
  private label = document.createElement('span');
  private title = document.createElement('strong');
  private hint = document.createElement('span');
  private live = document.createElement('span');
  private goal = '';
  private age = 0;
  private idle = 0;
  private settled = false;
  private manual = 0;
  private target: ReturnType<typeof shiftAttention> = null;
  private blocked = true;

  constructor(private host: HTMLElement, private reduced: boolean, private ping: (x: number | null) => void) {
    this.card.type = 'button';
    this.card.className = 'shift-task';
    this.card.hidden = true;
    this.label.className = 'shift-task-label';
    this.hint.className = 'shift-task-hint';
    this.card.append(this.label, this.title, this.hint);
    this.live.className = 'shift-task-live';
    this.live.setAttribute('role', 'status');
    this.live.setAttribute('aria-live', 'polite');
    this.live.setAttribute('aria-atomic', 'true');
    host.append(this.card, this.live);
    this.card.addEventListener('pointerdown', e => e.stopPropagation());
    this.card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') e.stopPropagation(); });
    this.card.addEventListener('click', e => {
      e.stopPropagation();
      if (!this.blocked && this.target) { this.ping(this.target.x); this.idle = 0; this.manual = 2; }
    });
  }

  hide() { this.card.hidden = true; this.blocked = true; this.ping(null); }

  update(flags: Readonly<Record<string, boolean>>, dt: number, busy: boolean, moving: boolean, px: number, dockTop: number) {
    const goal = shiftGoal(flags);
    if (goal !== this.goal) {
      this.goal = goal; this.age = 0; this.idle = 0; this.manual = 0; this.settled = false;
      this.target = shiftAttention(flags);
      this.ping(null);
      this.title.textContent = goal;
      this.hint.textContent = this.target ? 'Click or tap to show where' : 'Your progress is saved';
      this.card.disabled = !this.target;
      this.card.setAttribute('aria-label', goal + (this.target ? '. Show task location' : ''));
    }
    this.blocked = busy;
    this.card.hidden = busy;
    if (busy) { this.idle = 0; this.ping(null); return; }
    if (this.age === 0) this.live.textContent = goal;
    this.age += dt;
    this.manual = Math.max(0, this.manual - dt);
    const travel = Math.min(1, Math.max(0, (this.age - 3) / .65));
    const ease = travel * travel * (3 - 2 * travel);
    const width = Math.min(360, this.host.clientWidth - 32);
    this.card.style.width = width + 'px';
    const centreX = (this.host.clientWidth - width) / 2;
    const centreY = Math.max(dockTop, this.host.clientHeight * .24);
    const atDock = this.reduced ? travel >= .5 : false;
    this.card.style.left = (this.reduced ? atDock ? 16 : centreX : centreX + (16 - centreX) * ease) + 'px';
    this.card.style.top = (this.reduced ? atDock ? dockTop : centreY : centreY + (dockTop - centreY) * ease) + 'px';
    this.card.style.opacity = this.reduced && travel > 0 && travel < 1 ? String(Math.abs(travel * 2 - 1)) : '1';
    this.label.textContent = !this.target ? 'SHIFT COMPLETE' : travel < 1 ? 'YOUR TASK' : 'CURRENT TASK';
    if (!this.settled && travel === 1) {
      this.settled = true;
      if (this.target && !this.target.gentle && Math.abs(px - this.target.x) > 40) this.ping(this.target.x);
    }
    if (!this.settled || !this.target) return;
    if (moving || Math.abs(px - this.target.x) <= 40) {
      this.idle = 0;
      if (Math.abs(px - this.target.x) <= 40 && !this.manual) this.ping(null);
    } else {
      this.idle += dt;
      if (this.idle >= (this.target.gentle ? 30 : 20)) { this.ping(this.target.x); this.idle = 0; }
    }
  }
}

export const SHIFT_GUIDANCE_STYLES = `
  .shift-task { position: absolute; z-index: 12; display: grid; gap: 7px; text-align: left;
    padding: 13px 16px; border: 2px solid #eed1a2; border-left: 5px solid #ffd18c;
    background: #18130ff5; color: #fff3df; box-shadow: 0 6px 24px #0009;
    font-family: 'IBM Plex Mono', monospace; cursor: pointer; box-sizing: border-box; }
  .shift-task[hidden] { display: none; }
  .shift-task strong { font-size: 15px; line-height: 1.4; }
  .shift-task-label { color: #ffd18c; font-size: 11px; letter-spacing: .12em; }
  .shift-task-hint { color: #c9bba7; font-size: 11px; }
  .shift-task:focus-visible { outline: 3px solid #00ffff; outline-offset: 3px; }
  .shift-task:disabled { cursor: default; opacity: 1; }
  .shift-task-live { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
  html:not(.game-mode) .shift-task, html:not(.game-mode) .shift-task-live { display: none; }
  @media (prefers-reduced-motion: reduce) { html.shift-prototype .fx-ping { animation: none; } }
  @media (max-height: 480px) { .shift-task { padding: 8px 12px; gap: 3px; }
    .shift-task strong { font-size: 12px; } .shift-task-hint { font-size: 10px; } }
`;
