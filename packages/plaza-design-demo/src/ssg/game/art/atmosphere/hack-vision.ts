/** Hack-vision world wash and device-shaped holes, shared by all scene rendering. */
import type { View } from '../core/view';
export function muteWorld(x: CanvasRenderingContext2D, v: View, keep: readonly {x:number;y:number;w:number;h:number}[] = []) {

    x.save();
    if (keep.length) {
      x.beginPath(); x.rect(0, 0, v.viewW, v.viewH);
      for (const s of keep) x.rect(v.sx(s.x - s.w / 2) - 4, v.y(s.y + s.h) - 4, s.w + 8, s.h + 8);
      x.clip('evenodd');
    }
    x.globalCompositeOperation = 'saturation'; x.globalAlpha = 0.85;
    x.fillStyle = '#808080'; x.fillRect(0, 0, v.viewW, v.viewH);
    x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    x.fillStyle = 'rgba(10,3,18,.62)'; x.fillRect(0, 0, v.viewW, v.viewH);
    x.restore();
  }
