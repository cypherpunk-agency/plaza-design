/**
 * Play profiles (runtime/play-profiles.json): the ways ACCESS DENIED is played. The game loop reads the active
 * profile instead of branching on a mode. A profile declares where play starts, which abilities exist, who the
 * player is, how the clock and guidance behave and which storage keys the run owns. Which profile is active is
 * chosen from the URL or the editor's Play frame (`select`); the story still decides when an ability the profile
 * grants is locked (the opening's hack lock). Edited in the editor under World › Play profiles.
 */
import type { Look } from './characters';
import { BODY_KINDS, EXTRA_KINDS, FACIAL_KINDS, GARB_KINDS, HAIR_KINDS } from '../art/characters/parts';
import { ARCHETYPE_IDS } from '../art/characters/archetypes';
export const ABILITIES = ['map', 'mapKey', 'deck', 'jump', 'hack', 'sudo', 'review'] as const;
export type Ability = (typeof ABILITIES)[number];
export const ABILITY_LABELS: Record<Ability, string> = {
  map: 'City map (menu entry and map screen)', mapKey: 'Map shortcut keys (Tab, M)', deck: 'Deck (Enter, the menu deck, terminal)',
  jump: 'Jump', hack: 'Hack vision, board and devices\' schematics', sudo: 'Sudo mode when ?sudo is in the URL (levels, time control)', review: 'Review navigator and bookmarks',
};
export const AVATARS = ['hacker', 'person'] as const;
export type AvatarId = (typeof AVATARS)[number];
/** The shared character kit's person the player is drawn as (avatar 'person'): a seed and a look (art/characters/parts.ts, archetypes.ts). */
export interface PlayerCharacter { seed: number; look: PlayerLook }
export type PlayerLook = Pick<Look, 'archetype' | 'body' | 'hair' | 'garb' | 'facial' | 'extras' | 'skin' | 'hairCol' | 'top' | 'bottom' | 'acc'>;
const LOOK_PARTS: Record<string, readonly string[]> = { body: BODY_KINDS, hair: HAIR_KINDS, garb: GARB_KINDS, facial: FACIAL_KINDS, archetype: ARCHETYPE_IDS };
const LOOK_COLOURS = ['skin', 'hairCol', 'top', 'bottom', 'acc'] as const;
export const ROUTES = ['world', 'start', 'content'] as const;
export const WORLDS = ['campaign', 'testDistrict'] as const;
export const GUIDANCE_STYLES = ['none', 'shift'] as const;
export const CLOCK_RULES = ['opening', 'scene'] as const;

export interface PlayProfile {
  id: string;
  label: string;
  /** How the profile is chosen: a URL parameter (`?demo`, `?play=harborShift`), the editor Play frame name, or the editor's Test District lab. No `select`: the default. */
  select?: { url?: { param: string; value?: string }; editorFrame?: string; editorRestricted?: boolean };
  /** The scene the game rests in before anything is entered, and where an unknown scene id lands. */
  home: string;
  start: {
    /** The scene a fresh run begins in, when the profile has one (otherwise the story decides). */
    scene?: string;
    /** The exit a fresh run arrives at. */
    entrance?: string;
    /** The title screen comes first when no scene is named. */
    title: boolean;
    /** `?play=<scene>` may name the starting scene. */
    urlScene: boolean;
  };
  /** world: any scene the city reaches; start: always the start scene; content: only the scenes the profile's world provides. */
  routes: (typeof ROUTES)[number];
  world: (typeof WORLDS)[number];
  namespace: { save: string; sudoSave?: string; resume: string; slots: string; sudoSlots?: string };
  abilities: Record<Ability, boolean>;
  player: { avatar: AvatarId; /** The person drawn by the character kit; required for avatar 'person', absent for 'hacker'. */ character?: PlayerCharacter; /** A fixed display name for the HUD and bubbles; absent: the story's name, then the handle. */ name?: string };
  guidance: { style: (typeof GUIDANCE_STYLES)[number]; /** The controls are taught once in the hint lane. */ controlHints: boolean };
  /** opening: the opening story pins the clock; scene: the scene's own story day and minute do. */
  clock: { rule: (typeof CLOCK_RULES)[number] };
  chrome: { pageClass?: string; /** No city clock, player name or scene title line in the HUD, and no status badges on the page. */ minimalHud: boolean };
  /** What a new save holds. */
  seed: { scene?: string; handle: string; tokens: number; modules: string[]; flags: string[] };
}
export interface PlayProfiles { version: 1; profiles: PlayProfile[] }

const fail = (s: string): never => { throw new Error('Play profiles: ' + s); };
const plain = (v: unknown, what: string) => { if (!v || typeof v !== 'object' || Array.isArray(v)) fail(what + ' must be an object'); return v as Record<string, unknown>; };
function exact(o: Record<string, unknown>, allowed: string[], required: string[], what: string) {
  for (const k of Object.keys(o)) if (!allowed.includes(k)) fail(`${what}: unknown field ${k}`);
  for (const k of required) if (o[k] === undefined) fail(`${what}: ${k} is required`);
}
const idOf = (v: unknown, what: string) => { if (typeof v !== 'string' || !/^[A-Za-z][A-Za-z0-9-]{0,39}$/.test(v)) fail(`${what} must be letters, digits and dashes`); return v as string; };
const sceneIdOf = (v: unknown, what: string) => { if (typeof v !== 'string' || !/^[A-Za-z][A-Za-z0-9._-]{0,63}$/.test(v)) fail(`${what} must be a scene id`); return v as string; };
const keyOf = (v: unknown, what: string) => { if (typeof v !== 'string' || !/^[a-z][a-z0-9-]{2,63}$/.test(v)) fail(`${what} must be lower-case letters, digits and dashes (3 to 64)`); return v as string; };
const slotsOf = (v: unknown, what: string) => { if (typeof v !== 'string' || !/^([a-z][a-z0-9]*-)*$/.test(v)) fail(`${what} must be words ending in a dash, or empty`); return v as string; };
const bool = (v: unknown, what: string) => { if (typeof v !== 'boolean') fail(what + ' must be on or off'); return v as boolean; };
const oneOf = <T extends string>(v: unknown, list: readonly T[], what: string) => { if (!list.includes(v as T)) fail(`${what} must be one of ${list.join(', ')}`); return v as T; };
const text = (v: unknown, what: string, max = 80) => { if (typeof v !== 'string' || !v.trim() || v.length > max) fail(`${what} must be text (1 to ${max} characters)`); return v as string; };
const list = (v: unknown, what: string, max: number) => { if (!Array.isArray(v) || v.length > max) fail(`${what} must be a list (${max} at most)`); return v as unknown[]; };

function characterOf(v: unknown, what: string): PlayerCharacter {
  const c = plain(v, what); exact(c, ['seed', 'look'], ['seed', 'look'], what);
  if (!Number.isInteger(c.seed) || (c.seed as number) < 0 || (c.seed as number) > 1000000) fail(what + ' seed must be a whole number from 0 to 1000000');
  const l = plain(c.look, what + ' look'); exact(l, [...Object.keys(LOOK_PARTS), 'extras', ...LOOK_COLOURS], [], what + ' look');
  const look: Record<string, unknown> = {};
  for (const [k, kinds] of Object.entries(LOOK_PARTS)) if (l[k] !== undefined) look[k] = oneOf(l[k], kinds, `${what} ${k}`);
  if (l.extras !== undefined) look.extras = list(l.extras, what + ' extras', 8).map(e => oneOf(e, EXTRA_KINDS, what + ' extra'));
  for (const k of LOOK_COLOURS) if (l[k] !== undefined) { if (typeof l[k] !== 'string' || !/^#[0-9a-f]{6}$/i.test(l[k] as string)) fail(`${what} ${k} must be a #rrggbb colour`); look[k] = l[k]; }
  return { seed: c.seed as number, look: look as PlayerLook };
}

export interface PlayProfileContext {
  /** Scene ids the profile may name; absent: not checked here (the editor checks them against the pending world). */
  scenes?: readonly string[];
  /** Exit ids per scene for `start.entrance`. */
  exits?: (scene: string) => readonly string[] | undefined;
  modules?: readonly string[];
}

export function validatePlayProfiles(value: unknown, context: PlayProfileContext = {}): PlayProfiles {
  const d = plain(value, 'document');
  exact(d, ['version', 'profiles'], ['version', 'profiles'], 'document');
  if (d.version !== 1) fail('version must be 1');
  const rows = list(d.profiles, 'profiles', 16);
  const ids = new Set<string>(), keys = new Map<string, string>(), selectors = new Set<string>();
  let defaults = 0;
  const own = (key: string, owner: string) => { const prior = keys.get(key); if (prior) fail(`${owner} and ${prior} would share the storage key ${key}`); keys.set(key, owner); };
  const scene = (v: unknown, what: string) => { const s = sceneIdOf(v, what); if (context.scenes && !context.scenes.includes(s)) fail(`${what}: no scene called ${s}`); return s; };
  const profiles = rows.map((raw, i) => {
    const p = plain(raw, 'profile ' + (i + 1));
    exact(p, ['id', 'label', 'select', 'home', 'start', 'routes', 'world', 'namespace', 'abilities', 'player', 'guidance', 'clock', 'chrome', 'seed'], ['id', 'label', 'home', 'start', 'routes', 'world', 'namespace', 'abilities', 'player', 'guidance', 'clock', 'chrome', 'seed'], 'profile ' + (i + 1));
    const id = idOf(p.id, 'profile id');
    if (ids.has(id)) fail(`two profiles are called ${id}`); ids.add(id);
    const at = `profile ${id}`;
    const out: PlayProfile = {
      id, label: text(p.label, at + ' name'), home: scene(p.home, at + ' home scene'),
      start: undefined as never, routes: oneOf(p.routes, ROUTES, at + ' routes'), world: oneOf(p.world, WORLDS, at + ' world'),
      namespace: undefined as never, abilities: undefined as never, player: undefined as never, guidance: undefined as never, clock: undefined as never, chrome: undefined as never, seed: undefined as never,
    };
    if (p.select === undefined) { defaults++; } else {
      const s = plain(p.select, at + ' selection');
      exact(s, ['url', 'editorFrame', 'editorRestricted'], [], at + ' selection');
      const sel: NonNullable<PlayProfile['select']> = {};
      if (s.url !== undefined) {
        const u = plain(s.url, at + ' URL selection'); exact(u, ['param', 'value'], ['param'], at + ' URL selection');
        if (typeof u.param !== 'string' || !/^[a-z][a-z0-9]{0,23}$/.test(u.param)) fail(`${at}: URL parameter must be lower-case letters and digits`);
        if (u.value !== undefined && (typeof u.value !== 'string' || !/^[A-Za-z0-9-]{1,40}$/.test(u.value))) fail(`${at}: URL value must be letters, digits and dashes`);
        sel.url = { param: u.param as string, ...(u.value !== undefined ? { value: u.value as string } : {}) };
        const sig = 'url:' + sel.url.param + '=' + (sel.url.value ?? ''); if (selectors.has(sig)) fail(`${at}: another profile is chosen by the same URL`); selectors.add(sig);
      }
      if (s.editorFrame !== undefined) {
        if (typeof s.editorFrame !== 'string' || !/^[a-z][a-z0-9:-]{2,63}$/.test(s.editorFrame)) fail(`${at}: editor frame name is not valid`);
        sel.editorFrame = s.editorFrame as string; const sig = 'frame:' + sel.editorFrame; if (selectors.has(sig)) fail(`${at}: another profile is chosen by the same editor frame`); selectors.add(sig);
      }
      if (s.editorRestricted !== undefined) {
        sel.editorRestricted = bool(s.editorRestricted, at + ' editor Test District'); if (sel.editorRestricted) { if (selectors.has('restricted')) fail(`${at}: another profile already runs the editor's Test District lab`); selectors.add('restricted'); }
      }
      if (!sel.url && !sel.editorFrame && !sel.editorRestricted) fail(`${at}: a selection must name a URL, an editor frame or the Test District lab`);
      out.select = sel;
    }
    const st = plain(p.start, at + ' start'); exact(st, ['scene', 'entrance', 'title', 'urlScene'], ['title', 'urlScene'], at + ' start');
    out.start = { title: bool(st.title, at + ' title screen'), urlScene: bool(st.urlScene, at + ' URL scene') };
    if (st.scene !== undefined) out.start.scene = scene(st.scene, at + ' start scene');
    if (st.entrance !== undefined) {
      if (!out.start.scene) fail(`${at}: an entrance needs a start scene`);
      const entrance = idOf(st.entrance, at + ' entrance'), exits = context.exits?.(out.start.scene as string);
      if (exits && !exits.includes(entrance)) fail(`${at}: ${out.start.scene} has no exit called ${entrance}`);
      out.start.entrance = entrance;
    }
    if (out.routes === 'start' && !out.start.scene) fail(`${at}: routes "start" needs a start scene`);
    const ns = plain(p.namespace, at + ' storage'); exact(ns, ['save', 'sudoSave', 'resume', 'slots', 'sudoSlots'], ['save', 'resume', 'slots'], at + ' storage');
    out.namespace = { save: keyOf(ns.save, at + ' save key'), resume: keyOf(ns.resume, at + ' resume key'), slots: slotsOf(ns.slots, at + ' slot prefix') };
    own(out.namespace.save, at + ' save'); own(out.namespace.resume, at + ' resume');
    if (ns.sudoSave !== undefined) { out.namespace.sudoSave = keyOf(ns.sudoSave, at + ' sudo save key'); own(out.namespace.sudoSave, at + ' sudo save'); }
    if (ns.sudoSlots !== undefined) out.namespace.sudoSlots = slotsOf(ns.sudoSlots, at + ' sudo slot prefix');
    for (const prefix of [out.namespace.slots, out.namespace.sudoSlots]) if (prefix !== undefined) own('slots:' + prefix, at + ' slots');
    const ab = plain(p.abilities, at + ' abilities'); exact(ab, [...ABILITIES], [...ABILITIES], at + ' abilities');
    out.abilities = Object.fromEntries(ABILITIES.map(a => [a, bool(ab[a], `${at} ${a}`)])) as Record<Ability, boolean>;
    const pl = plain(p.player, at + ' player'); exact(pl, ['avatar', 'character', 'name'], ['avatar'], at + ' player');
    out.player = { avatar: oneOf(pl.avatar, AVATARS, at + ' avatar') };
    if ((out.player.avatar === 'person') !== (pl.character !== undefined)) fail(`${at}: a character goes with the person avatar only, and the person avatar needs one`);
    if (pl.character !== undefined) out.player.character = characterOf(pl.character, at + ' player character');
    if (pl.name !== undefined) out.player.name = text(pl.name, at + ' player name', 24);
    const g = plain(p.guidance, at + ' guidance'); exact(g, ['style', 'controlHints'], ['style', 'controlHints'], at + ' guidance');
    out.guidance = { style: oneOf(g.style, GUIDANCE_STYLES, at + ' guidance style'), controlHints: bool(g.controlHints, at + ' control hints') };
    const c = plain(p.clock, at + ' clock'); exact(c, ['rule'], ['rule'], at + ' clock');
    out.clock = { rule: oneOf(c.rule, CLOCK_RULES, at + ' clock rule') };
    const ch = plain(p.chrome, at + ' chrome'); exact(ch, ['pageClass', 'minimalHud'], ['minimalHud'], at + ' chrome');
    out.chrome = { minimalHud: bool(ch.minimalHud, at + ' minimal HUD') };
    if (ch.pageClass !== undefined) { if (typeof ch.pageClass !== 'string' || !/^[a-z][a-z0-9-]{0,39}$/.test(ch.pageClass)) fail(`${at}: page class must be lower-case letters, digits and dashes`); out.chrome.pageClass = ch.pageClass as string; }
    const sd = plain(p.seed, at + ' new save'); exact(sd, ['scene', 'handle', 'tokens', 'modules', 'flags'], ['handle', 'tokens', 'modules', 'flags'], at + ' new save');
    if (typeof sd.handle !== 'string' || sd.handle.length > 24) fail(`${at}: handle must be text (24 characters at most)`);
    if (!Number.isInteger(sd.tokens) || (sd.tokens as number) < 0 || (sd.tokens as number) > 9999) fail(`${at}: tokens must be a whole number from 0 to 9999`);
    const modules = list(sd.modules, at + ' modules', 32).map(m => { if (typeof m !== 'string' || !/^[a-z][a-z0-9.-]{0,40}$/.test(m)) fail(`${at}: module ids are lower-case words`); if (context.modules && !context.modules.includes(m as string)) fail(`${at}: no module called ${String(m)}`); return m as string; });
    const flags = list(sd.flags, at + ' flags', 64).map(f => { if (typeof f !== 'string' || !/^[A-Za-z][A-Za-z0-9:._-]{0,63}$/.test(f)) fail(`${at}: flag ids are words`); return f as string; });
    if (new Set(modules).size !== modules.length || new Set(flags).size !== flags.length) fail(`${at}: a module or flag is listed twice`);
    out.seed = { handle: sd.handle as string, tokens: sd.tokens as number, modules, flags };
    if (sd.scene !== undefined) out.seed.scene = scene(sd.scene, at + ' new save scene');
    return out;
  });
  if (!profiles.length) fail('there must be at least one profile');
  if (defaults !== 1) fail('exactly one profile is the default (it has no selection)');
  return { version: 1, profiles };
}
