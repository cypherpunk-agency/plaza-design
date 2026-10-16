/** Plain authored source; validated by the composition adapter before runtime/editor use. */
import source from './composition.json';
import type { Composition } from '../../art/core/composition';
export const downtownSource=source as unknown as Composition;
