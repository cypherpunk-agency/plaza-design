import intro from './intro.composition.json';
import act2 from './act2.composition.json';
import taxi from './taxi.composition.json';
import timeline from './timeline.json';
import { cinematicRegistry, type CinematicDocuments } from '../../art/sequences/cinematics';
import type { TimelineDocument } from '../../art/core/timeline';
export const cinematicDocuments: CinematicDocuments = {
  compositions: { 'sequence-intro': cinematicRegistry.validate(intro), 'sequence-act2': cinematicRegistry.validate(act2), 'sequence-taxi': cinematicRegistry.validate(taxi) },
  timeline: timeline as TimelineDocument,
};
