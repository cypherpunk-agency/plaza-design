/** Night-shift worker and carried parcel/case. */
import type { PreparedCharacter } from '../../runtime/characters';
import { drawCharacterFrame } from './appearance';
import type { View } from '../core/view';
import { box } from '../core/primitives';
export function drawDockworker(x: CanvasRenderingContext2D, v: View, pose: PreparedCharacter, face: number, carry: 'parcel' | 'case' | null) {
  if(pose.visible)drawCharacterFrame(x,v,pose.character,pose.ready,pose.pixelSize,pose.frame,pose.height);
  const wx=pose.character.x;
  if (carry) {
    box(x, v.sx(wx) + face * 8 - 7, v.y((pose.character.h ?? 0) + 25), 14, 11, carry === 'case' ? '#77664d' : '#39678b', '#e5d4af');
  }
}
