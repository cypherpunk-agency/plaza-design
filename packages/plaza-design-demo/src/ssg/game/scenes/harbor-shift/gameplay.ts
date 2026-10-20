import source from './gameplay.json';
import { validateShiftGameplay } from './gameplay-contract';
export const SHIFT_GAMEPLAY = validateShiftGameplay(source);
