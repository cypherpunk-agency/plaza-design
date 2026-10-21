import { validatePlayProfiles, type PlayProfiles } from '../runtime/play-profiles';
import { LOGIC } from '../data/index';
import { NATIVE_SCENES } from '../scenes';
import { pendingRegistry } from './pending-registry';

export const PLAY_PROFILES_DOCUMENT = 'play-profiles';

/** The scenes a profile may name: the shipped scenes and the editor's authored ones. */
export function profileSceneIds(documents: ReadonlyMap<string, unknown>): string[] {
  const authored = (documents.get('authored-scenes') as { scenes?: { scene: { id: string } }[] } | undefined)?.scenes ?? [];
  return [...Object.keys(NATIVE_SCENES), ...authored.map(s => s.scene.id)];
}

export const profileModuleIds = (): string[] => LOGIC.modules.map(m => m.id);

/** Profiles checked against the pending world: scenes exist, entrances are exits of their scene, modules exist. */
export function validatePendingPlayProfiles(value: unknown, documents: ReadonlyMap<string, unknown>): PlayProfiles {
  let registry: ReturnType<typeof pendingRegistry> | undefined;
  return validatePlayProfiles(value, {
    scenes: profileSceneIds(documents),
    modules: profileModuleIds(),
    exits: scene => (registry ??= pendingRegistry(documents))[scene]?.exits.map(e => e.id),
  });
}
