/** Extracted mode responsibilities; function bodies and stored identifiers are preserved. */



/** Editor frame owns its whole realm; shipping pages keep their existing storage and mode. */
export const EDITOR_PLAY = typeof window !== 'undefined' && window.parent !== window && ['access-denied-editor-play','access-denied-editor-play:sandbox','access-denied-editor-play:normal'].includes(window.name);

export const DEMO_MODE=(()=>{try{return !EDITOR_PLAY&&new URLSearchParams(location.search).has('demo');}catch{return false;}})();

export const EDITOR_SANDBOX=EDITOR_PLAY&&window.name.endsWith(':sandbox');

/** Isolated milestone-2 prototype; its saves and slots never touch the campaign. */
export const SHIFT_PROTOTYPE = (() => { try { return EDITOR_PLAY ? window.name==='access-denied-editor-play' : !DEMO_MODE&&new URLSearchParams(location.search).get('play') === 'harborShift'; } catch { return false; } })();


/** `?sudo` in the URL: everything unlocked, a LEVELS menu, and its own save (sudo.ts). */
export const SUDO = (() => { try { return new URLSearchParams(location.search).has('sudo'); } catch { return false; } })();


/**
 * v3: the net (NET.md): `controlled` nodes (was `freed`), `programs`, `nets`. Saves from before
 * (v2, v1) are not read: everyone starts fresh (Tommi: no migration).
 */
export const SAVE_KEY = DEMO_MODE ? 'access-denied-demo-v1' : SHIFT_PROTOTYPE ? 'access-denied-harbor-shift-v1' : SUDO ? 'access-denied-save-sudo-v3' : 'access-denied-save-v3';
