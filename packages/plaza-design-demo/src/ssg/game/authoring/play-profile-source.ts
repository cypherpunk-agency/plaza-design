import {demoContent} from '../demo';
import {pendingTestDistrict} from './pending-registry';
import { validatePlayProfiles, type PlayProfiles } from '../runtime/play-profiles';
import { NATIVE_SCENES } from '../scenes';

export const PLAY_PROFILES_DOCUMENT = 'play-profiles';
const districtScenes=demoContent();

/** The scenes a profile may name: the shipped scenes and the editor's authored ones. */
export function profileSceneIds(documents: ReadonlyMap<string, unknown>): string[] {
  const authored = (documents.get('authored-scenes') as { scenes?: { scene: { id: string } }[] } | undefined)?.scenes ?? [];
  return [...Object.keys(NATIVE_SCENES), ...authored.map(s => s.scene.id)];
}


/** Profile references resolve in the world the configuration actually runs. */
export function validatePendingPlayProfiles(value: unknown, documents: ReadonlyMap<string, unknown>): PlayProfiles {
  const checkpoints=(documents.get('play-fixtures') as import('../world/checkpoints').PlayFixtures|undefined)?.fixtures;
  const result=validatePlayProfiles(value, {
    checkpoints,
    scenes: profileSceneIds(documents),
  });
  for(const p of result.profiles)if(p.world==='testDistrict'){
    const checkpoint=checkpoints?.find(f=>f.id===p.checkpoint);if(!checkpoint)continue;
    if(!Object.prototype.hasOwnProperty.call(districtScenes,checkpoint.scene))throw Error('Profile '+p.id+': starting checkpoint is outside the Test District');
    if(checkpoint.entrance&&!pendingTestDistrict(documents)[checkpoint.scene as keyof typeof districtScenes]?.exits.some(e=>e.id===checkpoint.entrance))throw Error('Profile '+p.id+': unknown starting entrance in the Test District');
  }
  return result;
}
