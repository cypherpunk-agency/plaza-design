/** The player's body on screen, by the play profile's `player.avatar`. Each avatar owns how the player is drawn. */
import { drawDockworker } from '../art/characters/dockworker';
import { drawPlayer } from '../art/characters/player';
import { SPR } from '../art/core/sprites';
import { prepareDockworker } from './dockworker';
import type { AvatarId } from './play-profiles';

type Ctx = CanvasRenderingContext2D;
type PlayerView = Parameters<typeof drawPlayer>[1];
type PlayerPose = Parameters<typeof drawPlayer>[3];
type Jack = Parameters<typeof drawPlayer>[4];

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
  /** What the player carries in the scene's presentation (the dockworker's case). */
  carry: 'parcel' | 'case' | null;
}

export const AVATAR_PAINTERS: Record<AvatarId, (f: AvatarFrame) => void> = {
  hacker({ x, view, p, t, jack, shadowGround }) {
    const sprite = jack ? SPR.jack : !p.onGround ? SPR.jump : p.moving && Math.floor(t / 9) % 2 ? SPR.walk : SPR.stand;
    drawPlayer(x, view, sprite, p, jack, shadowGround());
  },
  dockworker({ x, view, p, carry }) {
    drawDockworker(x, view, prepareDockworker(p.x, p.face, p.moving, view.t, p.y), p.face, carry);
  },
};
