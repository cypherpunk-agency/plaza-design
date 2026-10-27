import baseline from './play-profiles.json';
import { EDITOR_PLAY, SUDO } from './mode';
import { validatePlayProfiles, type Ability, type PlayProfile, type PlayProfiles } from './play-profiles';
import checkpointSource from '../world/checkpoints.json';
import type {PlayFixtures} from '../world/checkpoints';

/** The play profile document the game ships with (runtime/play-profiles.json). */
export const SHIPPED_PROFILES: PlayProfiles = validatePlayProfiles(baseline,{checkpoints:checkpointSource.fixtures});

export interface ProfileEnvironment {
  /** Explicit selection in isolated editor Play; never a public URL override. */
  profile?:string;
  /** location.search */
  search: string;
  /** window.name of an editor Play frame, else undefined. */
  frame?: string;
  /** The editor's Test District lab (a restricted world). */
  restricted?: boolean;
}

/** The profile an environment asks for: the first with a matching selection, else the default. */
export function chooseProfile(doc: PlayProfiles, env: ProfileEnvironment, editor: boolean): PlayProfile {
  if(editor&&env.profile!==undefined){
    const selected=doc.profiles.find(p=>p.id===env.profile);
    if(!selected||selected.world!==(env.restricted?'testDistrict':'campaign'))throw Error('Invalid private Play configuration '+env.profile);
    return selected;
  }
  const query = new URLSearchParams(env.search);
  const chosen = doc.profiles.find(p => {
    const s = p.select;
    if (!s) return false;
    if (editor) return (s.editorFrame !== undefined && s.editorFrame === env.frame) || (!!s.editorRestricted && !!env.restricted);
    return !!s.url && query.has(s.url.param) && (s.url.value === undefined || query.get(s.url.param) === s.url.value);
  });
  return chosen ?? doc.profiles.find(p => !p.select)!;
}

const environment = (): ProfileEnvironment => {
  try { return { search: location.search, frame: EDITOR_PLAY ? window.name : undefined }; } catch { return { search: '' }; }
};

let profiles = SHIPPED_PROFILES;
let active = chooseProfile(profiles, environment(), EDITOR_PLAY);

/**
 * Use a (pending) profile document, re-choosing the active profile. The editor's Play frame calls this before it
 * builds the game, so private Play runs the pending source; `restricted` is the Test District lab.
 */
let checkpoints=checkpointSource as unknown as PlayFixtures;
export function installPlayProfiles(doc: PlayProfiles, restricted = false,starts:PlayFixtures=checkpointSource as unknown as PlayFixtures,profile?:string) {
  if(profile!==undefined&&!EDITOR_PLAY&&!restricted)throw Error('Explicit configuration requires private Play');
  const selected=chooseProfile(doc,{...environment(),restricted,profile},EDITOR_PLAY||restricted);
  profiles = doc;checkpoints=starts;active=selected;
}

/** The profile this run plays under. */
export const playProfile = (): PlayProfile => active;
export function startCheckpoint(profile:PlayProfile=active){const row=checkpoints.fixtures.find(f=>f.id===profile.checkpoint);if(!row)throw Error('Missing start checkpoint: '+profile.checkpoint);return row;}
/** Does the active profile have the ability? (The story may still lock it: see the opening's hack lock.) */
export const can = (ability: Ability) => active.abilities[ability];
/** Sudo (`?sudo`) is on and the profile has it. */
export const sudoOn = () => SUDO && active.abilities.sudo;

export const saveKey = () => (SUDO && active.namespace.sudoSave) || active.namespace.save;
export const resumeKey = () => active.namespace.resume;
export const slotPrefix = () => (SUDO && active.namespace.sudoSlots) || active.namespace.slots;

/** The query string that reopens the active profile at a scene (LOAD GAME without session storage). */
export function profileQuery(scene: string): string {
  const url = active.select?.url;
  if(url?.value!==undefined)return '?'+url.param+'='+encodeURIComponent(url.value)+(SUDO?'&sudo':'');
  if (url && url.value === undefined) return '?' + url.param;
  const selectsOtherProfile=profiles.profiles.some(p=>p!==active&&p.select?.url?.param==='play'&&p.select.url.value===scene);
  const named = scene && scene !== active.home&&!selectsOtherProfile ? '=' + encodeURIComponent(scene) : '';
  return '?play' + named + (SUDO ? '&sudo' : '');
}

/** A scene only another profile starts in and is confined to (e.g. the harbor shift): `?play=<scene>` may not reach it from here. */
export const reservedScene = (scene: string) => scene!==startCheckpoint().scene&&profiles.profiles.some(p => p.routes === 'start' && startCheckpoint(p).scene === scene && p !== active);

/** Does the page's URL ask for play (any profile's parameter, `?play` or `?sudo`)? */
export function urlAsksForPlay(search: string): boolean {
  const q = new URLSearchParams(search);
  return q.has('play') || q.has('sudo') || profiles.profiles.some(p => p.select?.url && q.has(p.select.url.param));
}
