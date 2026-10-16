/** Street artwork seen through CAM-3. Camera controls and HUD remain in the panel. */
import type { CrateData } from '../../data/types';
/** Morse for GHOST, the penthouse lamp's reminder (O03): 1 = on for a beat. */
const MORSE = '--. .... --- ... -'.split('').flatMap((c) => (c === '-' ? [1, 1, 1, 0] : c === '.' ? [1, 0] : [0, 0]));
export function drawStreetCameraFeed(g: CanvasRenderingContext2D, things: readonly CrateData[], t: number, tv: boolean, tags: ReadonlySet<string>) {
  const W = 320, H = 150;
    // the street from across the road: walls, the penthouse tower, the wet street
    g.fillStyle = '#0a0410'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#150a06'; g.fillRect(0, 10, 140, 116); g.fillRect(160, 0, 48, 126); g.fillRect(226, 40, 94, 86);
    g.strokeStyle = 'rgba(194,65,12,.5)'; g.lineWidth = 0.6; g.strokeRect(160.5, 0.5, 47, 126);
    g.fillStyle = '#1d0e05'; g.fillRect(0, 126, W, 24);
    for (const k of things) {
      if (k.id === 'billboard') {
        g.fillStyle = tv ? '#0c1414' : '#1a0710'; g.fillRect(k.x, k.y, k.w, k.h);
        g.strokeStyle = 'rgba(255,90,110,.8)'; g.strokeRect(k.x + 0.5, k.y + 0.5, k.w - 1, k.h - 1);
        g.font = '600 9px "IBM Plex Mono", monospace'; g.textAlign = 'center';
        g.fillStyle = tv ? 'rgba(0,255,255,.8)' : 'rgba(255,90,110,.95)';
        g.fillText(tv ? '● CAM-3' : 'REGISTRY PREMIUM', k.x + k.w / 2, k.y + 16);
        g.font = '2.6px "IBM Plex Mono", monospace'; g.fillStyle = 'rgba(255,217,165,.8)';
        g.fillText('MINIMUM TERM 36 MONTHS · EARLY CANCELLATION FEE APPLIES', k.x + k.w / 2, k.y + k.h - 5);
      } else if (k.id === 'window') {
        const beat = Math.floor(t / 260) % (MORSE.length + 6);
        g.fillStyle = (MORSE[beat] ?? 0) ? 'rgba(255,217,165,.95)' : 'rgba(40,24,10,1)'; g.fillRect(k.x, k.y, k.w, k.h);
        g.strokeStyle = 'rgba(194,65,12,.8)'; g.strokeRect(k.x + 0.5, k.y + 0.5, k.w - 1, k.h - 1);
      } else if (k.id === 'pigeon') {
        const bob = Math.round(Math.sin(t / 300) * 1);
        g.fillStyle = '#8a8f9a'; g.fillRect(k.x + 3, k.y + 4 + bob, 9, 6); g.fillRect(k.x + 10, k.y + 2 + bob, 4, 4);
        g.fillStyle = '#ffd25a'; g.fillRect(k.x + 14, k.y + 3 + bob, 2, 1);
        g.fillStyle = '#5a5f6a'; g.fillRect(k.x + 5, k.y + 10, 1, 2); g.fillRect(k.x + 9, k.y + 10, 1, 2);
      } else {
        g.fillStyle = '#050201'; g.fillRect(k.x, k.y, k.w, k.h);
        g.strokeStyle = 'rgba(255,136,0,.6)'; g.strokeRect(k.x + 0.5, k.y + 0.5, k.w - 1, k.h - 1);
        g.font = '600 7px "IBM Plex Mono", monospace'; g.textAlign = 'center'; g.fillStyle = 'rgba(255,61,242,.9)';
        g.fillText(k.label, k.x + k.w / 2, k.y - 3);
      }
      if (tags.has(k.id)) { g.strokeStyle = '#ff3df2'; g.setLineDash([2, 2]); g.strokeRect(k.x - 2, k.y - 2, k.w + 4, k.h + 4); g.setLineDash([]); }
    }

}
