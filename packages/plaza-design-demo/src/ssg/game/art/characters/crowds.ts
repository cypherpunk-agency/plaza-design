/**
 * District crowd mixes (art direction, 2026-10-20). Every district keeps ordinary people and adds
 * "kitted" ones: the same people with visible tech. The mix is one of the things that tells districts
 * apart: which named looks (art/characters/archetypes.ts) walk its streets and
 * how often, how much of the crowd is kitted, what they do, and which robots share the street. Clothes
 * come from the district's palette (people-style.ts).
 *
 * The data lives in the People document (`people.json`, edited in Library › People; validated by
 * `people-source.ts`). Read by the editor's crowd lineup and style frames. Nothing in the running game reads it yet.
 */
import type {Act, Look} from '../../runtime/characters';
import {ARCHETYPES, type ArchetypeId} from './archetypes';
import PEOPLE from './people.json';
import {touchPeople} from './people-style';

type Weights<T extends string> = Partial<Record<T, number>>;
export interface CrowdMix {
 /** City district id (world/city.json). */
 district: string;
 /** One line on who the crowd is. */
 note: string;
 /** The district's colour style, instead of the game-wide default (the Old Quarter is muted). */
 style?: 'vivid' | 'muted';
 /** Share of people (0–1) wearing visible tech. */
 kitted: number;
 /** Share of the crowd (0–1) that is robots. */
 robots: number;
 /** Who the people are: named looks, weighted. */
 people: Weights<ArchetypeId>;
 acts: Weights<Act>;
 /** Robot families from the character inventory, weighted. */
 bots: Record<string, number>;
}

/** The mixes in the People document (`people.json`, Library › People); the editor swaps in pending edits. */
export const CROWD_MIXES: CrowdMix[] = structuredClone(PEOPLE.crowds) as unknown as CrowdMix[];
/** Replaces the mixes in place (everyone holding CROWD_MIXES sees the new ones). */
export function setCrowdMixes(mixes: readonly CrowdMix[]) { CROWD_MIXES.splice(0, CROWD_MIXES.length, ...structuredClone(mixes) as CrowdMix[]); touchPeople(); }
export const crowdMix = (district: string) => CROWD_MIXES.find(m => m.district === district);
/** A district's own colour style, if its people mix sets one. */
export const districtStyle = (district?: string) => district ? crowdMix(district)?.style : undefined;

export type CrowdMember =
 | {kind: 'person'; kitted: boolean; seed: number; look: Look; act: Act; facing: 1 | -1}
 | {kind: 'robot'; family: string; variant: string; seed: number; act: string; facing: 1 | -1};

/** Named looks that can show tech (a kitted person is never a Ghost). */
const canKit = (id: ArchetypeId) => (ARCHETYPES[id].tech ?? ['x']).length > 0 && ARCHETYPES[id].kitted !== 0;
/** Named looks that never do (a plain person is never a Registry inspector). */
const canPlain = (id: ArchetypeId) => (ARCHETYPES[id].kitted ?? 0.35) < 1;

/**
 * A deterministic crowd of `count` drawn from a mix. `kitted` overrides the mix's share; `robots` the
 * robots' share (0 for people only).
 */
export function sampleCrowd(mix: CrowdMix, seed: number, count: number, robotActs: (family: string) => readonly string[], kitted = mix.kitted, robotShare = mix.robots): CrowdMember[] {
 let s = (seed * 2654435761 >>> 0) % 2147483647 || 1;
 const r = () => (s = s * 16807 % 2147483647) / 2147483647;
 const weighted = <T extends string>(w: Weights<T> | Record<string, number>): T => {
  const rows = (Object.entries(w) as [T, number][]).filter(([, n]) => n > 0), total = rows.reduce((a, [, n]) => a + n, 0);
  let x = r() * total; for (const [k, n] of rows) if ((x -= n) <= 0) return k; return rows[0][0];
 };
 const any = <T>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)];
 const only = (keep: (id: ArchetypeId) => boolean) => {
  const w = Object.fromEntries(Object.entries(mix.people).filter(([id]) => keep(id as ArchetypeId))) as Weights<ArchetypeId>;
  return Object.keys(w).length ? w : mix.people;
 };
 const kittedPeople = only(canKit), plainPeople = only(canPlain);
 const out: CrowdMember[] = [], robots = Math.round(count * robotShare), people = count - robots;
 const kittedCount = Math.round(people * kitted);
 for (let i = 0; i < count; i++) {
  const facing = r() < .5 ? 1 : -1, memberSeed = Math.floor(r() * 1e6);
  if (i >= people) {
   const family = weighted(mix.bots), acts = robotActs(family).filter(a => ['stand', 'walk', 'roll', 'sweep', 'blink', 'direct', 'carry', 'patrol', 'serve', 'play'].includes(a));
   out.push({kind: 'robot', family, variant: String(Math.floor(r() * 3)), seed: memberSeed, act: acts.length ? any(acts) : 'stand', facing});
   continue;
  }
  const isKitted = i < kittedCount, archetype = weighted(isKitted ? kittedPeople : plainPeople);
  // mostly the district's acts; now and then what this kind of person typically does
  const act = r() < .3 ? ARCHETYPES[archetype].act : weighted(mix.acts);
  out.push({kind: 'person', kitted: isKitted, seed: memberSeed, look: {archetype, district: mix.district, kitted: isKitted}, act, facing});
 }
 // Kitted people and robots spread through the crowd, not bunched at one end.
 for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
 return out;
}
