/** Extracted progression responsibilities; function bodies and stored identifiers are preserved. */
import { type Save } from '../../runtime/save';


export type Objective = 'handle' | 'till' | 'box' | 'install' | 'relay' | 'gate' | 'done';


/** Downtown's next step (the scene's goals, downtown/save.ts `reached`, follow the same fields). */
export function objective(s: Save): Objective {
  if (!s.handle) return 'handle';
  if (!s.flags.till) return 'till';
  if (!s.controlled.includes('0x2F')) return 'box';
  if (!s.jump) return 'install';
  if (!s.controlled.includes('0x31')) return 'relay';
  if (!s.flags.end) return 'gate';
  return 'done';
}
