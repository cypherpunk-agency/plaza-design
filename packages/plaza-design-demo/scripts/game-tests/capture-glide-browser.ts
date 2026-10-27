/** Browser half of capture-glide-frames.mts: draws the title and the glide as the game does (story/title Opening.draw) at fixed times. */
import { Opening } from '../../src/ssg/game/story/title';
import {openingDocuments} from '../../src/ssg/game/story/title/documents';
import {SCENES} from '../../src/ssg/game/scenes';
import {sequenceInspection} from '../../src/ssg/game/runtime/sequence-state';

interface Shot { id: string; tau: number | null; width: number; height: number; k: number }
declare global { interface Window { glideShots: (shots: Shot[]) => Promise<{ id: string; png: string; ms: number }[]> } }

window.glideShots = async (shots) => {
  await Promise.all(['400', '600'].map(w => document.fonts.load(`${w} 12px "IBM Plex Mono"`)));
  const out: { id: string; png: string; ms: number }[] = [];
  for (const s of shots) {
    const canvas = document.createElement('canvas'); canvas.width = s.width; canvas.height = s.height;
    const x = canvas.getContext('2d')!;
    const sequence=openingDocuments.timeline.sequences.find(seq=>seq.id===(s.tau===null?'title':'glide'))!;
    const composition=openingDocuments.compositions[sequence.composition];
    const inspection=sequenceInspection(SCENES,sequence,composition.instances.find(n=>n.type==='sequence.world-control')!.props.zones as string[]);
    const o = new Opening(false,openingDocuments,inspection.sample(s.tau??8));
    o.step(8);               // the settled title (the menu is up)
    if (s.tau !== null) { o.go(); o.timeline.seek(s.tau); }
    const viewW = s.width / s.k, viewH = s.height / s.k;
    // twice, as the game draws every frame: the second is the one measured and kept
    for (let i = 0; i < 2; i++) { x.setTransform(s.k, 0, 0, s.k, 0, 0); x.imageSmoothingEnabled = false; x.fillStyle = '#000'; x.fillRect(0, 0, viewW, viewH); }
    x.setTransform(s.k, 0, 0, s.k, 0, 0); o.draw(x, viewW, viewH);
    const t0 = performance.now();
    x.setTransform(s.k, 0, 0, s.k, 0, 0); x.imageSmoothingEnabled = false; o.draw(x, viewW, viewH);
    out.push({ id: s.id, png: canvas.toDataURL('image/png'), ms: performance.now() - t0 });
    inspection.dispose();
  }
  return out;
};
