/** Browser half of capture-glide-frames.mts: draws the title and the glide as the game does (story/title Opening.draw) at fixed times. */
import { Opening } from '../../src/ssg/game/story/title';

interface Shot { id: string; tau: number | null; width: number; height: number; k: number }
declare global { interface Window { glideShots: (shots: Shot[]) => Promise<{ id: string; png: string; ms: number }[]> } }

window.glideShots = async (shots) => {
  await Promise.all(['400', '600'].map(w => document.fonts.load(`${w} 12px "IBM Plex Mono"`)));
  const out: { id: string; png: string; ms: number }[] = [];
  for (const s of shots) {
    const canvas = document.createElement('canvas'); canvas.width = s.width; canvas.height = s.height;
    const x = canvas.getContext('2d')!;
    const o = new Opening(false);
    o.step(8);               // the settled title (the menu is up)
    if (s.tau !== null) { o.go(); o.timeline.seek(s.tau); }
    const viewW = s.width / s.k, viewH = s.height / s.k;
    // twice, as the game draws every frame: the second is the one measured and kept
    for (let i = 0; i < 2; i++) { x.setTransform(s.k, 0, 0, s.k, 0, 0); x.imageSmoothingEnabled = false; x.fillStyle = '#000'; x.fillRect(0, 0, viewW, viewH); }
    x.setTransform(s.k, 0, 0, s.k, 0, 0); o.draw(x, viewW, viewH);
    const t0 = performance.now();
    x.setTransform(s.k, 0, 0, s.k, 0, 0); x.imageSmoothingEnabled = false; o.draw(x, viewW, viewH);
    out.push({ id: s.id, png: canvas.toDataURL('image/png'), ms: performance.now() - t0 });
  }
  return out;
};
