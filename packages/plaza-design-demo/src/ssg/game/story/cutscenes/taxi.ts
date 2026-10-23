import{lightAt,type Light}from'../../world/light';
/** The sky-taxi flight: its timeline drawn as one frame of the world; exact clock/progress enter the same timeline used by the composer. */
import {renderWorldFrame} from '../../runtime/render-scene';
import type { CinematicDocuments } from '../../art/sequences/cinematics';
import { cinematicDocuments } from './documents';
/** Native game clock uses 60 ticks per second. Kept separate from the city travel-time cost. */
export const taxiDurationFor=(documents:CinematicDocuments=cinematicDocuments)=>documents.timeline.sequences.find(s=>s.id==='taxi')!.duration;
export const taxiSequenceDuration=taxiDurationFor();
/** One frame of the flight at `progress` (0 → 1), `scale` pixels per world unit. */
export function drawFlight(x: CanvasRenderingContext2D, W: number, H: number, progress: number, ambient: number, destination:string,lighting:Light=lightAt(1,580,90,null),documents:CinematicDocuments=cinematicDocuments,scale=x.getTransform().a) {
  renderWorldFrame({kind:'sequence',context:x,  documents, sequenceId: 'taxi', scale, width: W, height: H, reduced: false, lighting, time: progress * taxiDurationFor(documents), progress, ambient, destination });
}
