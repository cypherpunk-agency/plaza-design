import intro from './intro.composition.json';
import act2 from './act2.composition.json';
import taxi from './taxi.composition.json';
import {sequenceProgram} from '../../art/core/sequence';
import { cinematicRegistry, type CinematicDocuments } from '../../art/sequences/cinematics';
const compositions = {'sequence-intro': cinematicRegistry.validate(intro), 'sequence-act2': cinematicRegistry.validate(act2), 'sequence-taxi': cinematicRegistry.validate(taxi) };
export const cinematicDocuments: CinematicDocuments = {
  compositions,
  timeline: sequenceProgram(compositions),
};
