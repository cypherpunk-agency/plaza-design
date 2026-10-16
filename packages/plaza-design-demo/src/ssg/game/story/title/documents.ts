import composition from './composition.json';
import timeline from './timeline.json';
import { openingRegistry, type OpeningDocuments } from '../../art/sequences/opening/sequence';
import type { TimelineDocument } from '../../art/core/timeline';
export const openingDocuments: OpeningDocuments = { compositionId: 'sequence-opening', composition: openingRegistry.validate(composition), timeline: timeline as TimelineDocument };
