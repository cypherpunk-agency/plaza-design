import{light,type Light}from'../../world/light';
/** Public travel renderer; exact clock/progress enter the same timeline used by the composer. */
import { renderCinematicPicture } from '../../art/sequences/cinematics';
import { cinematicDocuments } from './documents';
/** Native game clock uses 60 ticks per second. Kept separate from the city travel-time cost. */
export const taxiSequenceDuration = cinematicDocuments.timeline.sequences.find(s => s.id === 'taxi')!.duration;
export function drawFlight(x: CanvasRenderingContext2D, W: number, H: number, progress: number, ambient: number, destination:string,lighting:Light=light()) {
  const sequence = cinematicDocuments.timeline.sequences.find(s => s.id === 'taxi')!;
  renderCinematicPicture(x, {lighting, viewW: W, viewH: H, barTop: 0, barBottom: 0, reduced: false }, cinematicDocuments, 'taxi', progress * sequence.duration, { progress, ambient, destination });
}
