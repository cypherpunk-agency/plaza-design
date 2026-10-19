import{light,type Light}from'../../world/light';
/** Public travel renderer; exact clock/progress enter the same timeline used by the composer. */
import { renderCinematicPicture } from '../../art/sequences/cinematics';
import { cinematicDocuments } from './documents';
/** Native game clock uses 60 ticks per second. Kept separate from the city travel-time cost. */
export const taxiDurationFor=(documents:import('../../art/sequences/cinematics').CinematicDocuments=cinematicDocuments)=>documents.timeline.sequences.find(s=>s.id==='taxi')!.duration;
export const taxiSequenceDuration=taxiDurationFor();
export function drawFlight(x: CanvasRenderingContext2D, W: number, H: number, progress: number, ambient: number, destination:string,lighting:Light=light(),documents:import('../../art/sequences/cinematics').CinematicDocuments=cinematicDocuments) {
  const sequence = documents.timeline.sequences.find(s => s.id === 'taxi')!;
  renderCinematicPicture(x, {lighting, viewW: W, viewH: H, barTop: 0, barBottom: 0, reduced: false }, documents, 'taxi', progress * sequence.duration, { progress, ambient, destination });
}
