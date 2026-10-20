/**
 * District crowd mixes (art direction, 2026-10-20). Every district keeps ordinary people and adds
 * "kitted" ones: the same people with visible tech. The mix is one of the things that tells districts
 * apart, so it lives here as data: which named looks (art/characters/archetypes.ts) walk its streets and
 * how often, how much of the crowd is kitted, what they do, and which robots share the street. Clothes
 * come from the district's palette (people-style.ts).
 *
 * Read by the editor's crowd lineup and style frames. Nothing in the running game reads it yet.
 */
import type {Act, Look} from '../../runtime/characters';
import {ARCHETYPES, type ArchetypeId} from './archetypes';

type Weights<T extends string> = Partial<Record<T, number>>;
export interface CrowdMix {
 /** City district id (world/city.json). */
 district: string;
 /** One line on who the crowd is. */
 note: string;
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

export const CROWD_MIXES: CrowdMix[] = [
 {district: 'downtown', note: 'Commuters, couriers and shift workers. Tech is common but cheap.', kitted: .4, robots: .15,
  people: {commuter: 4, office: 2, courier: 2, reader: 1, student: 1, teen: 1, elder: 1, dockworker: 1, punk: .5, kid: .5},
  acts: {walk: 4, stand: 2, phone: 2, queue: 1, smoke: 1, talk: 1, read: 1}, bots: {deliverybot: 2, sweeper: 1, courier: 1, marshal: 1, scandrone: 1}},
 {district: 'market', note: 'Vendors, hagglers and fixers. Most wear tech, mostly second-hand.', kitted: .6, robots: .15,
  people: {vendor: 4, fixer: 3, punk: 1, commuter: 1, elder: 1, kid: 1, teen: 1, courier: 1},
  acts: {haggle: 3, vend: 2, argue: 1, stand: 2, walk: 2, talk: 2}, bots: {adbot: 2, litterbot: 1, servbot: 1, busker: 1}},
 {district: 'galleria', note: 'Shoppers with money. Their tech is the kind you cannot see.', kitted: .1, robots: .25,
  people: {shopper: 5, office: 2, plazastaff: 1, elder: .5, teen: .5},
  acts: {walk: 4, stand: 2, phone: 1, talk: 2}, bots: {valet: 2, waiter: 1, marshal: 1, android: 1}},
 {district: 'harbor', note: 'Dockers and the Tide. Work gear, not fashion.', kitted: .35, robots: .25,
  people: {dockworker: 5, tide: 3, courier: 1, elder: .5},
  acts: {walk: 3, stand: 2, smoke: 2, lean: 1, talk: 1}, bots: {loader: 3, porter: 1, mech: 1}},
 {district: 'oldq', note: 'The old and the Ghosts. Almost nobody shows tech; that is the point.', kitted: .05, robots: .03,
  people: {elder: 4, ghost: 2, reader: 1, kid: 1, vendor: 1, church: .5},
  acts: {sit: 2, smoke: 1, talk: 2, stand: 2, walk: 2, read: 1}, bots: {cleaner: 1}},
 {district: 'undercity', note: 'The deleted. Salvaged tech, worn openly because nobody checks.', kitted: .3, robots: .1,
  people: {drifter: 4, ghost: 1, sleeper: 1, punk: 1, teen: .5},
  acts: {sit: 2, sleep: 1, lean: 2, stand: 2, talk: 1, doze: 1}, bots: {wreck: 1, crawler: 1, litterbot: 1}},
 {district: 'spire', note: 'Very few people, none showing tech. Robots outnumber them.', kitted: 0, robots: .6,
  people: {office: 3, plazastaff: 2, shopper: 1, church: 1},
  acts: {walk: 3, stand: 2, phone: 1}, bots: {android: 2, valet: 1, marshal: 1, servbot: 1, scandrone: 1}},
 {district: 'fringe', note: 'Machines only, and the odd technician in a mask.', kitted: .5, robots: .8,
  people: {technician: 4, dockworker: 1},
  acts: {walk: 2, stand: 2, sweep: 1}, bots: {loader: 2, mech: 1, crawler: 1, sweeper: 1}},
 {district: 'skyport', note: 'Guards and ground crew behind the fence.', kitted: .45, robots: .4,
  people: {guard: 3, technician: 2, office: 1, courier: 1},
  acts: {walk: 2, stand: 3, talk: 1}, bots: {marshal: 2, porter: 1, valet: 1}},
];
export const crowdMix = (district: string) => CROWD_MIXES.find(m => m.district === district);

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
