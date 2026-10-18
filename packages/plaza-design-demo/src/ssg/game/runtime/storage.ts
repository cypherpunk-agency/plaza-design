import { EDITOR_PLAY } from './mode';

/** Native browser storage is resolved lazily, and is never accessed by editor play. */
function storage(session: boolean) {
  const memory = new Map<string, string>();
  return {
    getItem(key: string): string | null { return EDITOR_PLAY ? memory.get(key) ?? null : (session ? sessionStorage : localStorage).getItem(key); },
    setItem(key: string, value: string) { if (EDITOR_PLAY) memory.set(key, value); else (session ? sessionStorage : localStorage).setItem(key, value); },
    removeItem(key: string) { if (EDITOR_PLAY) memory.delete(key); else (session ? sessionStorage : localStorage).removeItem(key); },
    snapshot() { if(!EDITOR_PLAY)throw new Error('Private snapshot requires editor play');return Object.fromEntries(memory); },
    restore(values:Record<string,string>) { if(!EDITOR_PLAY)throw new Error('Private restore requires editor play');memory.clear();for(const [key,value] of Object.entries(values))memory.set(key,value); },
  };
}
export const gameStorage = storage(false), gameSessionStorage = storage(true);
export interface PrivateStorageSnapshot { local:Record<string,string>; session:Record<string,string> }
export function capturePrivateStorage():PrivateStorageSnapshot { return {local:gameStorage.snapshot(),session:gameSessionStorage.snapshot()}; }
export function restorePrivateStorage(value:PrivateStorageSnapshot) { gameStorage.restore(value.local);gameSessionStorage.restore(value.session); }
export function reloadRuntime() {
  if (EDITOR_PLAY) window.dispatchEvent(new Event('editor-runtime-reload'));
  else location.reload();
}
