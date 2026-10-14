/**
 * The people of LINE 0: who rides the metro and who waits for it. Each is a
 * pixel sprite at the player's scale (14 rows of 3 px), with their own clothes,
 * pose and something they are doing (a phone, a paper, a parcel, a nap), so a
 * car or a platform reads as people, not shadows. Seated poses are made from
 * the standing ones (`seated`). Lit fills and a faint warm rim keep them off
 * the dark walls behind (ART-GUIDE §4); none of them use cyan or pink.
 */

import { drawSprite, type Sprite } from '../sprites';
import { rng } from './kit';

/** Their palette: lower-case letters, so it never clashes with the engine's. */
const PAL: Record<string, string> = {
  s: '#c98a5a', t: '#8a5a3a', u: '#e2b48c', e: '#1a0d05', // skin (three tones), eyes
  h: '#2a1a10', y: '#b08a3a', g: '#6a6a6a', w: '#cfcfcf', m: '#8a2a6a', // hair: dark, blond, grey, white, dyed
  a: '#5a3a24', b: '#2e3f55', c: '#4a4f3a', d: '#6a2a2a', f: '#3a3a42', k: '#7a5a20', o: '#8a4a10', // coats
  p: '#d8d0c0', l: '#222428', n: '#14161a', // paper, trousers, shoes
  r: '#ff2a44', x: '#9aa2ac', z: '#aad2ff', v: '#5a6470', // red armband, uniform, phone glow, visor
  q: '#a07040', j: '#3a5a3a', // parcel, scarf
};

/** Standing poses, 10 wide × 14 tall. */
const STAND: Record<string, Sprite> = {
  // looking down at a phone, its light on the face
  phone: ['...hhhh...', '..hhhhhh..', '..hssssh..', '..sesses..', '...ssss...', '.bbbbbbbb.', '.bbbbbbbb.', '.bbbbbzbb.', '.bbbbszbb.', '..bbbbbb..', '..ll..ll..', '..ll..ll..', '..ll..ll..', '.nnn..nnn.'],
  // a paper held up in front of them
  paper: ['...gggg...', '..gggggg..', '..gttttg..', '.pppppppp.', '.pppppppp.', '.pppppppp.', '.pptpptpp.', '.aaaaaaaa.', '.aaaaaaaa.', '..aaaaaa..', '..ll..ll..', '..ll..ll..', '..ll..ll..', '.nnn..nnn.'],
  // a suit and a briefcase
  suit: ['...hhhh...', '..hhhhhh..', '..uuuuuu..', '..ueuueu..', '...uuuu...', '.ffffpfff.', '.fffffpff.', '.ffffffff.', '.ffffffffu', '..ffffffkk', '..ll..llkk', '..ll..ll..', '..ll..ll..', '.nnn..nnn.'],
  // a courier with a parcel on the shoulder
  courier: ['...oooo..q', '..oooooqqq', '..ottttqqq', '..tettetq.', '...tttt...', '.oooooooo.', '.oooooooo.', '.olooooloo', '.oooooooo.', '..oooooo..', '..ll..ll..', '..ll..ll..', '..ll..ll..', '.nnn..nnn.'],
  // an old woman with a shopping bag
  elder: ['...wwww...', '..wwwwww..', '..wssssw..', '..sessess.', '...ssss...', '..jjjjjjj.', '.dddddddd.', '.dddddddd.', '.ddddddddk', '.ddddddd.k', '..dddddkkk', '..ll..lkkk', '..ll..ll..', '.nnn..nnn.'],
  // dyed hair, a jacket covered in patches
  punk: ['....mm....', '...mmmm...', '..mtttt...', '..tettet..', '...tttt...', '.llllllll.', '.lrllllyl.', '.llllllll.', '.llyllrll.', '..llllll..', '..cc..cc..', '..cc..cc..', '..cc..cc..', '.nnn..nnn.'],
  // a Registry inspector: grey uniform, red armband, visor
  inspector: ['..xxxxxx..', '.xxxxxxxx.', '..vvvvvv..', '..vvvvvv..', '...uuuu...', '.xxxxxxxx.', '.rrxxxxxx.', '.rrxxxxxx.', '.xxxxxxxx.', '..xxxxxx..', '..ll..ll..', '..ll..ll..', '..ll..ll..', '.nnn..nnn.'],
  // asleep on their feet, head down, scarf
  sleeper: ['..........', '...hhhh...', '..hhhhhh..', '..hhsssh..', '...jjjj...', '.ccjjjjcc.', '.cccccccc.', '.cccccccc.', '.cccccccc.', '..cccccc..', '..ll..ll..', '..ll..ll..', '..ll..ll..', '.nnn..nnn.'],
};
export type RiderKind = keyof typeof STAND;
export const KINDS = Object.keys(STAND) as RiderKind[];

/** A seated pose from a standing one, seen from the front: head and body, the lap over the seat, shins down to the floor; 12 rows, so the head sits lower. */
function seated(rows: Sprite): Sprite {
  const legs = rows[11].replace(/\./g, '')[0] ?? 'l', shoe = rows[13].replace(/\./g, '')[0] ?? 'n';
  return [...rows.slice(0, 8), '.' + legs.repeat(8) + '.', '..' + legs + legs + '..' + legs + legs + '..', '..' + legs + legs + '..' + legs + legs + '..', '.' + shoe.repeat(3) + '..' + shoe.repeat(3) + '.'];
}
const SEAT: Record<string, Sprite> = Object.fromEntries(KINDS.map((k) => [k, seated(STAND[k])]));

/** A seated rider's thighs are this high above the floor (the seat's top). */
export const SEAT_H = 9;
const RIM = 'rgba(255,190,110,.35)';

/**
 * Draws one person, standing (or sitting, `sit`) on screen y `base`, centred on
 * `cx`. `t` animates what they are doing: a phone's light, a sleeper's nod.
 * `ps` 3 is the player's scale; 2 for people seen inside a train going past.
 */
export function drawRider(x: CanvasRenderingContext2D, kind: RiderKind, cx: number, base: number, t: number, opt: { sit?: boolean; flip?: boolean; ps?: number; phase?: number } = {}) {
  const ps = opt.ps ?? 3, ph = opt.phase ?? 0;
  const nod = kind === 'sleeper' && Math.sin(t * 0.02 + ph) > 0.6 ? 1 : 0;
  const rows = opt.sit ? SEAT[kind] : STAND[kind];
  const pal = kind === 'phone' && Math.sin(t * 0.07 + ph) < -0.8 ? { ...PAL, z: '#6a8aa8' } : PAL;
  const b = drawSprite(x, rows, cx, base + nod * ps, { ps, flip: opt.flip, pal, glow: ps >= 3 ? RIM : undefined });
  if (kind === 'phone' && ps >= 2) {
    // the phone's light on the face and chest
    x.fillStyle = 'rgba(170,210,255,.08)'; x.fillRect(b.x0, b.y0 + ps * 2, b.w, ps * 7);
  }
  return b;
}

/** A crowd picked once from a seed: `n` people, each a kind, a facing and a phase. */
export function crowd(seed: number, n: number): { kind: RiderKind; flip: boolean; phase: number; on: boolean }[] {
  const r = rng(seed);
  return Array.from({ length: n }, () => ({ kind: KINDS[Math.floor(r() * KINDS.length)], flip: r() < 0.5, phase: r() * 10, on: r() < 0.55 }));
}
