/** The player's body on screen, by the play profile's `player.avatar`. 'person' is a character of the shared people kit (runtime/characters.ts). */
import { drawCharacterFrame } from '../art/characters/appearance';
import { drawPlayer } from '../art/characters/player';
import { SPR } from '../art/core/sprites';
import { prepareCharacter, type Character, type PreparedCharacter } from './characters';
import type { AvatarId, PlayProfile } from './play-profiles';

type Ctx = CanvasRenderingContext2D;
type PlayerView = Parameters<typeof drawPlayer>[1];
type PlayerPose = Parameters<typeof drawPlayer>[3];
type Jack = Parameters<typeof drawPlayer>[4];
export type Carry = 'parcel' | 'case';

export interface AvatarFrame {
  x: Ctx;
  view: PlayerView & { t: number };
  p: PlayerPose & { onGround: boolean; moving: boolean };
  /** Frame counter (the hacker's walk cycle). */
  t: number;
  /** Jacked in to a machine. */
  jack: Jack;
  /** The ground line under the player for the shadow; null when hack vision hides it. Read only by avatars that cast one. */
  shadowGround: () => number | null;
  /** What the player carries in the scene's presentation. */
  carry: Carry | null;
  /** Cushion height above the player's deck; absent while standing. */
  seat?:number;
  /** The profile's player: who the person avatar is. */
  player: PlayProfile['player'];
}

/** What a person carries, as the kit's extras: a parcel on the shoulder, a case in the hand. */
const CARRIED = { parcel: 'parcel', case: 'briefcase' } as const;
const bodies = new WeakMap<object, Map<Carry | '', Character>>();
/**
 * The profile's person with what they carry. The Character is stable per profile and carry: the kit bakes a look once
 * per Character object.
 */
export function playerCharacter(player: PlayProfile['player'], carry: Carry | null): Character {
  const c = player.character;
  if (!c) throw new Error('The person avatar needs a character in its play profile');
  let byCarry = bodies.get(c); if (!byCarry) bodies.set(c, byCarry = new Map());
  let body = byCarry.get(carry ?? '');
  if (!body) byCarry.set(carry ?? '', body = { seed: c.seed, x: 0, act: 'stand', look: { ...c.look, ...(carry ? { extras: [...(c.look.extras ?? []), CARRIED[carry]] } : {}) } });
  return body;
}

/**
 * The person where the game loop puts the player: `wx`, `h` (the player's height: a stair, a lift, a raised floor) and
 * facing. The loop owns the position, so the pose is driven (`moving` steps the walk cycle), never range-walked.
 */
export function preparePlayerPerson(player: PlayProfile['player'], carry: Carry | null, wx: number, face: number, moving: boolean, t: number, h = 0,seat?:number): PreparedCharacter {
  return prepareCharacter(playerCharacter(player, carry), t, { x: wx, h, facing: face < 0 ? -1 : 1, act: seat!==undefined?'sit':moving ? 'walk' : 'stand',seat }, moving);
}

export const AVATAR_PAINTERS: Record<AvatarId, (f: AvatarFrame) => void> = {
  hacker({ x, view, p, t, jack, shadowGround,seat }) {
    const sprite = jack ? SPR.jack : seat!==undefined?SPR.sit:!p.onGround ? SPR.jump : p.moving && Math.floor(t / 9) % 2 ? SPR.walk : SPR.stand;
    drawPlayer(x, view, sprite, p, jack, shadowGround());
  },
  person({ x, view, p, carry, player,seat }) {
    const pose = preparePlayerPerson(player, carry, p.x, p.face, p.moving, view.t, p.y,seat);
    if (pose.visible) drawCharacterFrame(x, view, pose.character, pose.ready, pose.pixelSize, pose.frame, pose.height);
  },
};
