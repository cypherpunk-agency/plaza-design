/**
 * District crowd mixes (art direction, 2026-10-20). Every district keeps ordinary people and adds
 * "kitted" ones: the same people with visible tech. The mix is one of the things that tells districts
 * apart, so it lives here as data: how much of the crowd is kitted, what they wear, which tech
 * shows, what they do, and which robots share the street.
 *
 * Read by the editor's crowd lineup and style frames. Nothing in the running game reads it yet.
 */
import type {Act, Body, Extra, Garb, Hair, Look} from '../../runtime/characters';

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
 body?: Weights<Body>; garb: Weights<Garb>; hair: Weights<Hair>;
 /** Everyday things anyone may carry. */
 plain: Extra[];
 /** Tech a kitted person shows one or two of. */
 tech: Extra[];
 acts: Weights<Act>;
 /** Robot families from the character inventory, weighted. */
 bots: Record<string, number>;
}

export const CROWD_MIXES: CrowdMix[] = [
 {district: 'downtown', note: 'Commuters, couriers and shift workers. Tech is common but cheap.', kitted: .4, robots: .15,
  garb: {jacket: 3, coat: 3, tee: 2, suit: 1, hivis: 1}, hair: {hood: 2, cap: 2, short: 2, long: 2, beanie: 1, brim: 1},
  plain: ['umbrella', 'bag', 'backpack'], tech: ['phone', 'headphones', 'visor', 'cyberarm'],
  acts: {walk: 4, stand: 2, phone: 2, queue: 1, smoke: 1, talk: 1}, bots: {deliverybot: 2, sweeper: 1, courier: 1, marshal: 1}},
 {district: 'market', note: 'Vendors, hagglers and fixers. Most wear tech, mostly second-hand.', kitted: .6, robots: .15,
  garb: {tee: 3, apron: 2, jacket: 2, hivis: 1, coat: 1}, hair: {cap: 2, bun: 2, mohawk: 1, short: 2, scarf: 1, bald: 1},
  plain: ['bag', 'backpack', 'umbrella'], tech: ['cyberarm', 'mask', 'visor', 'phone', 'headphones'],
  acts: {haggle: 3, vend: 2, argue: 1, stand: 2, walk: 2, talk: 2}, bots: {adbot: 2, litterbot: 1, servbot: 1, busker: 1}},
 {district: 'galleria', note: 'Shoppers with money. Their tech is the kind you cannot see.', kitted: .1, robots: .25,
  garb: {suit: 3, dress: 3, coat: 2}, hair: {long: 2, bun: 2, short: 2, brim: 1},
  plain: ['bag', 'glasses'], tech: ['phone'],
  acts: {walk: 4, stand: 2, phone: 1, talk: 2}, bots: {valet: 2, waiter: 1, marshal: 1, android: 1}},
 {district: 'harbor', note: 'Dockers and the Tide. Work gear, not fashion.', kitted: .35, robots: .25,
  garb: {hivis: 4, coat: 2, jacket: 2}, hair: {beanie: 3, cap: 2, helmet: 2, short: 1},
  plain: ['backpack', 'bag'], tech: ['cyberarm', 'headphones', 'mask'],
  acts: {walk: 3, stand: 2, smoke: 2, lean: 1, talk: 1}, bots: {loader: 3, porter: 1, mech: 1}},
 {district: 'oldq', note: 'The old and the Ghosts. Almost nobody shows tech; that is the point.', kitted: .05, robots: .03,
  body: {old: 3, avg: 2, short: 1, wide: 1, kid: 1}, garb: {coat: 3, jacket: 2, dress: 2, robe: 1}, hair: {brim: 2, scarf: 2, bald: 1, long: 1, bun: 1},
  plain: ['umbrella', 'cane', 'bag', 'glasses'], tech: ['phone'],
  acts: {sit: 2, smoke: 1, talk: 2, stand: 2, walk: 2}, bots: {cleaner: 1}},
 {district: 'undercity', note: 'The deleted. Salvaged tech, worn openly because nobody checks.', kitted: .3, robots: .1,
  garb: {coat: 3, jacket: 2, tee: 1}, hair: {hood: 3, scarf: 1, beanie: 1, long: 1},
  plain: ['backpack', 'bag'], tech: ['mask', 'cyberarm', 'visor'],
  acts: {sit: 2, sleep: 1, lean: 2, stand: 2, talk: 1}, bots: {wreck: 1, crawler: 1, litterbot: 1}},
 {district: 'spire', note: 'Very few people, none showing tech. Robots outnumber them.', kitted: 0, robots: .6,
  garb: {suit: 4, dress: 2, coat: 1}, hair: {short: 2, bun: 1, long: 1},
  plain: ['glasses', 'bag'], tech: ['phone'],
  acts: {walk: 3, stand: 2, phone: 1}, bots: {android: 2, valet: 1, marshal: 1, servbot: 1}},
 {district: 'fringe', note: 'Machines only, and the odd technician in a mask.', kitted: .5, robots: .8,
  garb: {hivis: 3, coat: 1}, hair: {helmet: 3, cap: 1},
  plain: ['backpack'], tech: ['mask', 'visor', 'cyberarm'],
  acts: {walk: 2, stand: 2, sweep: 1}, bots: {loader: 2, mech: 1, crawler: 1, sweeper: 1}},
 {district: 'skyport', note: 'Guards and ground crew behind the fence.', kitted: .45, robots: .4,
  garb: {hivis: 2, suit: 2, coat: 1}, hair: {helmet: 2, cap: 2, short: 1},
  plain: ['bag'], tech: ['headphones', 'visor'],
  acts: {walk: 2, stand: 3, talk: 1}, bots: {marshal: 2, porter: 1, valet: 1}},
];
export const crowdMix = (district: string) => CROWD_MIXES.find(m => m.district === district);

export type CrowdMember =
 | {kind: 'person'; kitted: boolean; seed: number; look: Look; act: Act; facing: 1 | -1}
 | {kind: 'robot'; family: string; variant: string; seed: number; act: string; facing: 1 | -1};

/** A deterministic crowd of `count` drawn from a mix. `kitted` overrides the mix's share. */
export function sampleCrowd(mix: CrowdMix, seed: number, count: number, robotActs: (family: string) => readonly string[], kitted = mix.kitted): CrowdMember[] {
 let s = (seed * 2654435761 >>> 0) % 2147483647 || 1;
 const r = () => (s = s * 16807 % 2147483647) / 2147483647;
 const weighted = <T extends string>(w: Weights<T> | Record<string, number>): T => {
  const rows = Object.entries(w) as [T, number][], total = rows.reduce((a, [, n]) => a + n, 0);
  let x = r() * total; for (const [k, n] of rows) if ((x -= n) <= 0) return k; return rows[0][0];
 };
 const any = <T>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)];
 const out: CrowdMember[] = [], robots = Math.round(count * mix.robots), people = count - robots;
 const kittedCount = Math.round(people * kitted);
 for (let i = 0; i < count; i++) {
  const facing = r() < .5 ? 1 : -1, memberSeed = Math.floor(r() * 1e6);
  if (i >= people) {
   const family = weighted(mix.bots), acts = robotActs(family).filter(a => ['stand', 'walk', 'roll', 'sweep', 'blink', 'direct', 'carry', 'patrol', 'serve', 'play'].includes(a));
   out.push({kind: 'robot', family, variant: String(Math.floor(r() * 3)), seed: memberSeed, act: acts.length ? any(acts) : 'stand', facing});
   continue;
  }
  const isKitted = i < kittedCount, extras: Extra[] = [];
  if (r() < .45) extras.push(any(mix.plain));
  if (isKitted) for (const e of [any(mix.tech), ...(r() < .4 ? [any(mix.tech)] : [])]) if (!extras.includes(e)) extras.push(e);
  const look: Look = {garb: weighted(mix.garb), hair: weighted(mix.hair), extras, ...(mix.body ? {body: weighted(mix.body)} : {})};
  if (extras.includes('umbrella') && extras.includes('cane')) look.extras = extras.filter(e => e !== 'cane');
  out.push({kind: 'person', kitted: isKitted, seed: memberSeed, look, act: weighted(mix.acts), facing});
 }
 // Kitted people and robots spread through the crowd, not bunched at one end.
 for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
 return out;
}
