/** Prototype player presentation controller. Keep appearance identity outside painting. */
import { prepareCharacter, type Character } from './characters';
const worker: Character = { seed: 7303, x: 0, look: { body: 'avg', garb: 'hivis', hair: 'short', top: '#b77a29', bottom: '#303746' }, act: 'stand' };
/**
 * The worker where the game loop puts the player: `wx`, `h` (the player's height: a stair, a lift, a raised floor) and
 * facing. The loop owns the position, so the pose is driven (`moving` steps the walk cycle), never range-walked.
 */
export function prepareDockworker(wx: number, face: number, moving: boolean, t: number, h = 0) {
  return prepareCharacter(worker, t, { x: wx, h, facing: face < 0 ? -1 : 1, act: moving ? 'walk' : 'stand' }, moving);
}
