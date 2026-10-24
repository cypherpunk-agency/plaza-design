/** Where the game runs. Which way of playing it is lives in play-profile.ts (the active play profile). */



/** Editor frame owns its whole realm; shipping pages keep their existing storage and mode. */
export const EDITOR_PLAY = typeof window !== 'undefined' && window.parent !== window && ['access-denied-editor-play','access-denied-editor-play:sandbox','access-denied-editor-play:normal'].includes(window.name);




/** `?sudo` in the URL: everything unlocked, a LEVELS menu, and its own save (sudo.ts), where the active profile has sudo. */
export const SUDO = (() => { try { return new URLSearchParams(location.search).has('sudo'); } catch { return false; } })();

/** `?probe` in the URL: the read-only debug handle `window.__game` (here, level, prompt, `probe()`: a snapshot of the story phase, flags, clock, dialogue and prompts) in an otherwise ordinary game, so a script can watch the opening without `?sudo`'s unlocks. It changes nothing: no `place`, no unlocked abilities, the normal save. */
export const PROBE = (() => { try { return new URLSearchParams(location.search).has('probe'); } catch { return false; } })();
