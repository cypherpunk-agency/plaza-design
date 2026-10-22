/**
 * The storyboard (authoring/storyboard.json, edited in Library › Storyboard): the game's acts as an ordered
 * sequence of places. Each beat names a place and district, the scene or style-frame proposal that shows
 * it (optional while the place is still to be drawn), whether that place exists, needs rework or is new,
 * what happens there and what it teaches. Editor-only planning source; the game does not read it.
 */
export const STORYBOARD_DOCUMENT = 'storyboard';
export const BEAT_STATUSES = ['exists', 'rework', 'new'] as const;
export type BeatStatus = (typeof BEAT_STATUSES)[number];
export interface StoryBeat { id: string; title: string; place: string; district: string; scene?: string; status: BeatStatus; happens: string; teaches?: string; note: string }
export interface StoryAct { id: string; title: string; arc: string; beats: StoryBeat[] }
export interface Storyboard { version: 1; acts: StoryAct[] }

const fail = (s: string): never => { throw new Error('Storyboard: ' + s); };
const plain = (v: unknown, what: string) => { if (!v || typeof v !== 'object' || Array.isArray(v)) fail(what + ' must be an object'); return v as Record<string, unknown>; };
const ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const text = (v: unknown, what: string, max: number, required = false) => { if (typeof v !== 'string' || v.length > max || (required && !v.trim())) fail(`${what} must be ${required ? '1' : '0'} to ${max} characters`); return v as string; };
const only = (o: Record<string, unknown>, keys: string[], what: string) => { const extra = Object.keys(o).find(k => !keys.includes(k)); if (extra) fail(`unknown ${what} field "${extra}"`); };

/**
 * Shape and identity. With `scenes`, every beat's scene must be one of them (the composition documents:
 * real scenes and style-frame proposals).
 */
export function validateStoryboard(value: unknown, scenes?: ReadonlySet<string>): Storyboard {
  const d = plain(value, 'document'); only(d, ['version', 'acts'], 'document');
  if (d.version !== 1) fail('version must be 1');
  if (!Array.isArray(d.acts) || d.acts.length > 24) fail('acts must be a list (24 at most)');
  const acts = new Set<string>(), beats = new Set<string>();
  for (const rawAct of d.acts as unknown[]) {
    const a = plain(rawAct, 'act'); only(a, ['id', 'title', 'arc', 'beats'], 'act');
    if (typeof a.id !== 'string' || !ID.test(a.id)) fail(`act id "${String(a.id)}" must be lower-case letters, digits and dashes`);
    if (acts.has(a.id as string)) fail(`two acts are called ${a.id}`); acts.add(a.id as string);
    text(a.title, `${a.id}: title`, 80, true); text(a.arc, `${a.id}: arc`, 240);
    if (!Array.isArray(a.beats) || a.beats.length > 80) fail(`${a.id}: beats must be a list (80 at most)`);
    for (const rawBeat of a.beats as unknown[]) {
      const b = plain(rawBeat, 'beat'); only(b, ['id', 'title', 'place', 'district', 'scene', 'status', 'happens', 'teaches', 'note'], 'beat');
      if (typeof b.id !== 'string' || !ID.test(b.id)) fail(`beat id "${String(b.id)}" must be lower-case letters, digits and dashes`);
      if (beats.has(b.id as string)) fail(`two beats are called ${b.id}`); beats.add(b.id as string);
      text(b.title, `${b.id}: title`, 80, true); text(b.place, `${b.id}: place`, 120, true);
      if (typeof b.district !== 'string' || (b.district !== '' && !ID.test(b.district))) fail(`${b.id}: district must be a district id or empty`);
      if (b.scene !== undefined) { if (typeof b.scene !== 'string' || !b.scene) fail(`${b.id}: scene must be a scene id (leave it out for none)`); if (scenes && !scenes.has(b.scene as string)) fail(`${b.id}: "${b.scene}" is not a scene or proposal`); }
      if (!(BEAT_STATUSES as readonly unknown[]).includes(b.status)) fail(`${b.id}: status must be ${BEAT_STATUSES.join(', ')}`);
      text(b.happens, `${b.id}: what happens`, 600); text(b.note, `${b.id}: note`, 600);
      if (b.teaches !== undefined) text(b.teaches, `${b.id}: teaches`, 200);
    }
  }
  return structuredClone(value) as Storyboard;
}

/** A free id from a base ("beat" → beat-1, beat-2, …). */
export function freeId(taken: Iterable<string>, base: string) {
  const used = new Set(taken); let n = 1; while (used.has(`${base}-${n}`)) n++; return `${base}-${n}`;
}
