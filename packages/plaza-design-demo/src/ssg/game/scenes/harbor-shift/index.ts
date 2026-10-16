import { harborShiftComposition,harborShiftGeometry,harborShiftLayout,adaptHarborShift,type HarborShiftRenderOptions } from './composition';
import type { Composition,Environment } from '../../art/core/composition';
/** Milestone 2: ordinary work, isolated from the campaign by ?play=harborShift. */
import type { Character } from "../../runtime/characters";
import { type SceneDef, type SceneUse, type UseCtx } from "../kit";


type Flags = Readonly<Record<string, boolean>>;
export const SHIFT = {
  assigned: 'shift:assigned', parcel: 'shift:parcel', delivered: 'shift:delivered',
  case: 'shift:case', returned: 'shift:returned', trolley: 'shift:trolley',
  inspected: 'shift:inspected', released: 'shift:released', parked: 'shift:parked',
  checked: 'shift:checked', done: 'shift:done',
} as const;
const L = harborShiftLayout();

export function shiftGoal(f: Flags): string {
  if (!f[SHIFT.assigned]) return 'Walk right to the supervisor · E to talk';
  if (!f[SHIFT.parcel]) return 'Pick up the blue parcel at DISPATCH';
  if (!f[SHIFT.delivered]) return 'Bring the blue parcel to Mara at RECEIVING';
  if (!f[SHIFT.case]) return 'Take the empty case from the receiving counter';
  if (!f[SHIFT.returned]) return 'Return the empty case to its rack';
  if (!f[SHIFT.trolley]) return 'Report back to the supervisor';
  if (f[SHIFT.inspected] && !f[SHIFT.released]) return 'Release the red wheel clamp beside the trolley';
  if (!f[SHIFT.released]) return 'Move the trolley to the marked loading bay';
  if (!f[SHIFT.parked]) return 'Push the released trolley into the loading bay';
  if (!f[SHIFT.checked]) return 'Return your work tag at CHECKOUT';
  if (!f[SHIFT.done]) return 'Read your wage statement';
  return 'SHIFT COMPLETE · Your work is done. Take a breath.';
}

/** Attention follows the task, without revealing the clamp before its discovery. */
export function shiftAttention(f: Flags): { x: number; gentle?: boolean } | null {
  if (!f[SHIFT.assigned]) return { x: L.boss };
  if (!f[SHIFT.parcel]) return { x: L.parcel };
  if (!f[SHIFT.delivered]) return { x: L.coworker };
  if (!f[SHIFT.case]) return { x: L.coworker + 52, gentle: true };
  if (!f[SHIFT.returned]) return { x: L.rack, gentle: true };
  if (!f[SHIFT.trolley]) return { x: L.boss };
  if (!f[SHIFT.released]) return { x: f[SHIFT.inspected] ? L.trolley + 44 : L.trolley };
  if (!f[SHIFT.parked]) return { x: L.trolley };
  if (!f[SHIFT.checked]) return { x: L.checkout };
  if (!f[SHIFT.done]) return { x: L.checkout + 58 };
  return null;
}

/** Authored time, never a deadline. The commute will belong to milestone 3. */
export const shiftMinute = (f: Flags) => f[SHIFT.checked] ? 5 * 60 + 25 : f[SHIFT.parked] ? 5 * 60 : f[SHIFT.trolley] ? 3 * 60 : f[SHIFT.returned] ? 1 * 60 : f[SHIFT.delivered] ? 22 * 60 : 18 * 60 + 40;

const boss: Character = { seed: 7301, x: L.boss, look: { body: 'wide', garb: 'jacket', hair: 'cap', top: '#827144', extras: ['phone'] }, act: 'stand', facing: 1 };
const mara: Character = { seed: 7302, x: L.coworker, look: { body: 'tall', garb: 'hivis', hair: 'bun', top: '#b5903a' }, act: 'vend', facing: -1 };


export function shiftCarry(f: Flags): 'parcel' | 'case' | null { return (f[SHIFT.parcel] && !f[SHIFT.delivered]) || (f[SHIFT.case] && !f[SHIFT.returned]) ? f[SHIFT.delivered] ? 'case' : 'parcel' : null; }

const after = (key: string) => (f: Flags) => !!f[key];
const pending = (key: string, until: string) => (f: Flags) => !!f[key] && !f[until];
const deliver = (c: UseCtx) => {
  if (c.flags[SHIFT.delivered]) return ['Already logged. You can keep your hands free.'];
  if (!c.take('shift.parcel')) return ['The blue parcel is waiting at dispatch, to the left.'];
  c.set(SHIFT.delivered);
  return ['Thanks. Pump seals. Maybe the floor gets to stay dry tonight.', 'Could you return the empty case on my counter to the rack?'];
};
const rack = (c: UseCtx) => {
  if (c.flags[SHIFT.returned]) return ['The case is back in its place.'];
  if (!c.take('shift.case')) return ['EMPTY CASE RETURNS · Bring a transport case from receiving.'];
  c.set(SHIFT.returned);
  return ['The case settles into the rack. RETURN REGISTERED.', 'The supervisor has one last job.'];
};
const checkout = (c: UseCtx) => {
  if (c.flags[SHIFT.checked]) return ['TAG RETURNED · SHIFT CLOSED. Your statement is ready.'];
  if (!c.flags[SHIFT.parked]) return ['SHIFT OPEN · Loading trolley not parked.'];
  if (!c.take('shift.tag')) return ['A work tag is required. Ask the supervisor for yours.'];
  c.set(SHIFT.checked); c.give(3);
  return ['IDENTITY VERIFIED · TAG RETURNED · SHIFT CLOSED.', 'Three tokens credited. Your wage statement is ready to read.'];
};

export const SHIFT_USES: SceneUse[] = [
  { id: 'boss', x: L.boss, name: 'SUPERVISOR', label: '[E] TALK TO SUPERVISOR', use(c) {
    if (!c.flags[SHIFT.assigned]) {
      c.set(SHIFT.assigned); c.add('shift.tag');
      return ['You are on transport. Here is your work tag.', 'Pick up the blue parcel at dispatch, just to my right. Bring it to Mara at receiving.', 'The Registry pays for completed movements. Try to have some.'];
    }
    if (c.flags[SHIFT.returned] && !c.flags[SHIFT.trolley]) {
      c.set(SHIFT.trolley);
      return ['Last job. Move the trolley into the striped loading bay, then check out.', 'The day crew needs the space. They are very particular about other people doing their work.'];
    }
    if (!c.has('shift.tag') && !c.flags[SHIFT.checked]) c.add('shift.tag');
    if (c.flags[SHIFT.done]) return ['You are off the clock. I am contractually unable to notice you.'];
    return [shiftGoal(c.flags) + '.', 'Ask if you need the assignment again.'];
  } },
  { id: 'parcel', x: L.parcel, name: 'DISPATCH', label: '[E] PICK UP BLUE PARCEL', available: pending(SHIFT.assigned, SHIFT.parcel), use(c) {
    if (c.flags[SHIFT.parcel]) return ['You have already collected this delivery.'];
    c.add('shift.parcel'); c.set(SHIFT.parcel);
    return ['You pick up the blue parcel. RECEIVING · MARA.', 'Carry it to the receiving counter on the right.'];
  } },
  { id: 'mara', x: L.coworker, name: 'MARA', label: '[E] TALK TO MARA', available: after(SHIFT.assigned),
    items: [{ item: 'shift.parcel', label: 'give Mara the blue parcel', use: deliver }],
    use(c) {
      if (!c.flags[SHIFT.delivered]) return ['Blue parcel for me? Use “give Mara the blue parcel” when you have it.', 'He makes every shift sound like a national emergency.'];
      if (!c.flags[SHIFT.returned]) return ['The empty case goes in the rack to the left. Thank you.'];
      return ['You got the case back. That is one less thing for the next shift.', 'Same train home? Get some sleep when you can.'];
    },
  },
  { id: 'case', x: L.coworker + 52, name: 'EMPTY CASE', label: '[E] TAKE EMPTY CASE', available: pending(SHIFT.delivered, SHIFT.case), use(c) {
    if (c.flags[SHIFT.case]) return ['The case has already been collected.'];
    c.add('shift.case'); c.set(SHIFT.case); return ['You take the empty transport case.'];
  } },
  { id: 'rack', x: L.rack, name: 'CASE RACK', label: '[E] CASE RETURNS', available: after(SHIFT.delivered),
    items: [{ item: 'shift.case', label: 'put the empty case in the rack', use: rack }], use: rack },
  { id: 'trolley', x: L.trolley, name: 'LOADING TROLLEY', label: '[E] PUSH TROLLEY', available: pending(SHIFT.trolley, SHIFT.parked), use(c) {
    if (!c.flags[SHIFT.released]) {
      c.set(SHIFT.inspected);
      return ['It will not roll. A red wheel clamp is still fastened around the near wheel.', 'A release handle sits just beside it.'];
    }
    c.set(SHIFT.parked); return ['The wheels roll freely. You push the trolley into the striped bay.', 'LOADING POSITION CONFIRMED. You can check out.'];
  } },
  { id: 'clamp', x: L.trolley + 44, name: 'WHEEL CLAMP', label: '[E] RELEASE CLAMP', available: pending(SHIFT.inspected, SHIFT.released), use(c) {
    c.set(SHIFT.released); return ['You pull the handle. The clamp opens and its indicator turns green.'];
  } },
  { id: 'checkout', x: L.checkout, name: 'CHECKOUT', label: '[E] CHECK OUT', available: after(SHIFT.trolley),
    items: [{ item: 'shift.tag', label: 'return work tag and check out', use: checkout }], use: checkout },
  { id: 'statement', x: L.checkout + 58, name: 'WAGE STATEMENT', label: '[E] READ STATEMENT', available: after(SHIFT.checked), use(c) {
    c.set(SHIFT.done);
    return ['NIGHT SHIFT · GROSS 4 TOKENS · EQUIPMENT ACCESS 1 TOKEN · NET 3 TOKENS.', 'STATUS: PAID. YOUR IDENTITY REMAINS IN GOOD STANDING.', 'Shift complete. The morning train is next. For now, your work is done.'];
  } },
];

const base: Omit<SceneDef,'drawBackdrop'> = {
  id: 'harborShift', name: 'Harbor · night shift', width: Number(harborShiftGeometry().find(r=>r.instance.id==='scene')!.props.width), spawn: harborShiftGeometry().find(r=>r.instance.id==='spawn')!.placement.x, exits: [],
  ambient: { sky: true }, facing: 90, horizon: 84,
  intro: ['Sundown. Another night on transport. The supervisor is waiting by the office.'],
  objective: shiftGoal, uses: SHIFT_USES,
};

export const HARBOR_SHIFT_ACTORS={boss,mara};
export function harborShiftScene(doc:Composition=harborShiftComposition,state:Environment['state']={},options:HarborShiftRenderOptions={}):SceneDef{return adaptHarborShift(base,HARBOR_SHIFT_ACTORS,doc,state,options);}
export const harborShift=harborShiftScene();
