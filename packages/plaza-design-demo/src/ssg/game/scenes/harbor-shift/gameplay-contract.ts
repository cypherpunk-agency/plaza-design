import { validateGameplay } from '../../engine/gameplay/validation';
/** Ordinary vocabulary and invocation permissions belong to the authored graph. */
export function validateShiftGameplay(value:unknown){
 const doc=validateGameplay(value);if(doc.native)throw new Error('Native bindings are not registered for this gameplay document');return doc;
}
