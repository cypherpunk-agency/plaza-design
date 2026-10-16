/** Extracted mode responsibilities; function bodies and stored identifiers are preserved. */



/** Isolated milestone-2 prototype; its saves and slots never touch the campaign. */
export const SHIFT_PROTOTYPE = (() => { try { return new URLSearchParams(location.search).get('play') === 'harborShift'; } catch { return false; } })();


/** `?sudo` in the URL: everything unlocked, a LEVELS menu, and its own save (sudo.ts). */
export const SUDO = (() => { try { return new URLSearchParams(location.search).has('sudo'); } catch { return false; } })();


/**
 * v3: the net (NET.md): `controlled` nodes (was `freed`), `programs`, `nets`. Saves from before
 * (v2, v1) are not read: everyone starts fresh (Tommi: no migration).
 */
export const SAVE_KEY = SHIFT_PROTOTYPE ? 'access-denied-harbor-shift-v1' : SUDO ? 'access-denied-save-sudo-v3' : 'access-denied-save-v3';
