/** Compatibility for immutable pre-migration references, whose light input was module-scoped. */
import {frameView,type View} from '../../src/ssg/game/art/core/view';
import {light,type Light} from '../../src/ssg/game/world/light';
type Coordinates=Omit<View,'lighting'|'illumination'>&Partial<Pick<View,'lighting'|'illumination'>>;
export function referenceView(coordinates:Coordinates,lighting:Light=light()):View {
  return {...frameView(coordinates.t,lighting),...coordinates};
}
