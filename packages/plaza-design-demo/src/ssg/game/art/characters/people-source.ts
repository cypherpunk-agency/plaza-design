/**
 * The People document (`people.json`): the game-wide people defaults and the district crowd mixes.
 * Edited in Library › People; the game reads it at load (people-style.ts, crowds.ts). This module
 * validates it and applies a pending version to the editor's preview.
 */
import {ARCHETYPE_IDS} from './archetypes';
import {DISTRICT_PALETTES, SEATED_VIEWS, setPeopleStyle, setSeatedView, type PeopleStyle, type SeatedView} from './people-style';
import {setCrowdMixes, type CrowdMix} from './crowds';
import {KIT_ACTS} from '../../runtime/characters';
import {actorAxes} from '../../engine/gameplay/actors';

export interface PeopleDocument {
 version: 1;
 /** Default colour style for everyone (a person's own `style` wins). Legacy is review-only. */
 style: Exclude<PeopleStyle, 'legacy'>;
 /** Default seated pose (`mixed`: each person picks and shifts now and then; a person's `sitView` wins). */
 seated: SeatedView;
 crowds: CrowdMix[];
}

/** What the style and seated selects offer, and what a crowd's weights may name. */
export const PEOPLE_VOCABULARY = {
 style: ['vivid', 'muted'] as const,
 seated: SEATED_VIEWS,
 districts: Object.keys(DISTRICT_PALETTES).filter(d => d !== 'city'),
 people: ARCHETYPE_IDS as readonly string[],
 acts: KIT_ACTS.human as readonly string[],
 bots: [...actorAxes.bot, ...actorAxes.critter] as readonly string[],
};

const fail = (s: string): never => { throw new Error('People document: ' + s); };
const plain = (v: unknown, what: string) => { if (!v || typeof v !== 'object' || Array.isArray(v)) fail(what + ' must be an object'); return v as Record<string, unknown>; };
const share = (v: unknown, what: string) => { if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 1) fail(what + ' must be between 0 and 1'); };
function weights(v: unknown, allowed: readonly string[], what: string, needOne: boolean) {
 const o = plain(v, what);
 for (const [k, n] of Object.entries(o)) {
  if (!allowed.includes(k)) fail(`${what}: unknown "${k}"`);
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > 100) fail(`${what}: weight of "${k}" must be 0 to 100`);
 }
 if (needOne && !Object.values(o).some(n => (n as number) > 0)) fail(what + ' needs at least one weight above 0');
}

export function validatePeople(value: unknown): PeopleDocument {
 const d = plain(value, 'document');
 if (Object.keys(d).some(k => !['version', 'style', 'seated', 'crowds'].includes(k))) fail('unknown field');
 if (d.version !== 1) fail('version must be 1');
 if (!PEOPLE_VOCABULARY.style.includes(d.style as never)) fail('style must be vivid or muted');
 if (!SEATED_VIEWS.includes(d.seated as never)) fail('unknown seated pose');
 if (!Array.isArray(d.crowds) || d.crowds.length > 32) fail('crowds must be a list');
 const seen = new Set<string>();
 for (const raw of d.crowds as unknown[]) {
  const c = plain(raw, 'crowd');
  if (Object.keys(c).some(k => !['district', 'note', 'kitted', 'robots', 'people', 'acts', 'bots'].includes(k))) fail('unknown crowd field');
  if (!PEOPLE_VOCABULARY.districts.includes(c.district as string)) fail(`unknown district "${String(c.district)}"`);
  if (seen.has(c.district as string)) fail(`two crowds for ${String(c.district)}`); seen.add(c.district as string);
  if (typeof c.note !== 'string' || c.note.length > 240) fail('note must be text (240 characters at most)');
  share(c.kitted, c.district + ' kitted share'); share(c.robots, c.district + ' robot share');
  weights(c.people, PEOPLE_VOCABULARY.people, c.district + ' people', (c.robots as number) < 1);
  weights(c.acts, PEOPLE_VOCABULARY.acts, c.district + ' acts', (c.robots as number) < 1);
  weights(c.bots, PEOPLE_VOCABULARY.bots, c.district + ' robots', (c.robots as number) > 0);
 }
 return structuredClone(value) as PeopleDocument;
}

let applied = '';
/** Puts a (pending) People document into effect in this page: defaults and crowd mixes. Cheap when unchanged. */
export function applyPeople(value: unknown) {
 const text = JSON.stringify(value);
 if (text === applied) return;
 const doc = validatePeople(value);
 applied = text;
 setPeopleStyle(doc.style); setSeatedView(doc.seated); setCrowdMixes(doc.crowds);
}
