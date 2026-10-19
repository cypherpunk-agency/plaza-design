import source from './gameplay.json';
import { validateShiftGameplay } from './gameplay-contract';
import type { UseCtx } from '../kit';
export const SHIFT_GAMEPLAY = validateShiftGameplay(source);
export function shiftCommand(c:UseCtx,id:string):boolean{
  if(!c.gameplay)throw new Error('Harbor shift requires its gameplay session');
  return c.gameplay.dispatch(id,'interaction').ok;
}
