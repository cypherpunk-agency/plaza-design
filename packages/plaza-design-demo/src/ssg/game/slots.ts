/**
 * Save slots for the pause menu (menu.ts).
 *
 * The autosave (`SAVE_KEY` in level.ts) stays the "continue" state the game keeps
 * writing. A slot is a full copy of that save plus a few lines to show in the
 * slot list, under its own key: `access-denied-v3-slot-1` … `-3`.
 *
 * Loading a slot reloads the page: the slot's save goes into sessionStorage
 * (`RESUME_KEY`), the boot is skipped, and index.ts writes it over the autosave
 * and starts the game in the slot's scene before anything else can write. That
 * way every scene's runtime starts clean from the loaded save.
 */

import { SAVE_KEY, SUDO, type Save } from './level';

export const SLOT_COUNT = 3;
/** Sudo mode keeps its own slots, like its own save. */
export const slotKey = (n: number) => `access-denied-v3-${SUDO ? 'sudo-' : ''}slot-${n}`;
/** sessionStorage: a save to land in after the reload (LOAD GAME). */
export const RESUME_KEY = 'access-denied-resume-v3';

export interface Slot {
  v: 2;
  /** The scene the slot was saved in ('downtown', 'yard', 'market', …); loading starts there. */
  scene: string;
  /** What the slot list shows: DOWNTOWN, BACK YARD, a scene's name. */
  sceneName: string;
  handle: string;
  /** Date.now() when saved. */
  at: number;
  /** Time played, in ms. */
  playMs: number;
  save: Save;
}

export function readSlot(n: number): Slot | null {
  try {
    const raw = localStorage.getItem(slotKey(n));
    if (!raw) return null;
    const s = JSON.parse(raw) as Slot;
    if (!s || typeof s !== 'object' || !s.save || typeof s.save !== 'object') return null;
    return s;
  } catch { return null; }
}

/** Copy the save into slot `n`. False when storage is blocked or full. */
export function writeSlot(n: number, save: Save, scene: string, sceneName: string): boolean {
  const slot: Slot = {
    v: 2, scene, sceneName,
    handle: save.handle || 'ghost',
    at: Date.now(),
    playMs: save.playMs ?? 0,
    save: JSON.parse(JSON.stringify(save)),
  };
  try { localStorage.setItem(slotKey(n), JSON.stringify(slot)); return true; } catch { return false; }
}

/** "DOWNTOWN · ghost · 2026-10-14 21:03 · 1:07" for the slot list. */
export function slotLine(s: Slot): string {
  const d = new Date(s.at), p = (v: number) => String(v).padStart(2, '0');
  const when = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  const min = Math.floor((s.playMs || 0) / 60000);
  return `${s.sceneName} · ${s.handle} · ${when} · ${Math.floor(min / 60)}:${p(min % 60)}`;
}

/** LOAD GAME: reload the page and land in the slot's scene with the slot's save. */
export function resumeInto(slot: Slot) {
  try {
    sessionStorage.setItem(RESUME_KEY, JSON.stringify({ scene: slot.scene, save: slot.save }));
    location.reload();
  } catch {
    // No sessionStorage: write the save now and come back through ?play.
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(slot.save)); } catch { /* nothing to do */ }
    location.search = '?play' + (slot.scene && slot.scene !== 'downtown' ? '=' + encodeURIComponent(slot.scene) : '') + (SUDO ? '&sudo' : '');
  }
}

/** Is a LOAD GAME reload waiting (boot.ts skips the boot then)? */
export function resumePending(): boolean {
  try { return !!sessionStorage.getItem(RESUME_KEY); } catch { return false; }
}

/** After a LOAD GAME reload: put the slot's save in place as the autosave and return its scene. Once. */
export function takeResume(): string | null {
  try {
    const raw = sessionStorage.getItem(RESUME_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(RESUME_KEY);
    const r = JSON.parse(raw) as { scene?: string; save?: Save };
    if (r.save && typeof r.save === 'object') localStorage.setItem(SAVE_KEY, JSON.stringify(r.save));
    return typeof r.scene === 'string' ? r.scene : 'downtown';
  } catch { return null; }
}
