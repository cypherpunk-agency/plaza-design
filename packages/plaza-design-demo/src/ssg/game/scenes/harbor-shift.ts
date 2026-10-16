/** Milestone 2: ordinary work, isolated from the campaign by ?play=harborShift. */
import { drawCharacter, type Character } from '../characters';
import { container } from '../sets/containers';
import { drawGantry, GANTRIES } from '../sets/crane';
import { placed } from '../sets/view';
import { drawHarborDistance } from './harbor';
import { box, sign, text, tell, PAPER, type SceneDef, type SceneUse, type UseCtx, type View } from './kit';

type Flags = Readonly<Record<string, boolean>>;
export const SHIFT = {
  assigned: 'shift:assigned', parcel: 'shift:parcel', delivered: 'shift:delivered',
  case: 'shift:case', returned: 'shift:returned', trolley: 'shift:trolley',
  inspected: 'shift:inspected', released: 'shift:released', parked: 'shift:parked',
  checked: 'shift:checked', done: 'shift:done',
} as const;
const L = { boss: 160, parcel: 300, rack: 420, coworker: 580, trolley: 760, bay: 880, checkout: 1020 };

export function shiftGoal(f: Flags): string {
  if (!f[SHIFT.assigned]) return 'Walk right to the supervisor · E to talk';
  if (!f[SHIFT.parcel]) return 'Pick up the blue parcel at DISPATCH';
  if (!f[SHIFT.delivered]) return 'Bring the blue parcel to Mara at RECEIVING';
  if (!f[SHIFT.case]) return 'Take the empty case from the receiving counter';
  if (!f[SHIFT.returned]) return 'Return the empty case to its rack';
  if (!f[SHIFT.trolley]) return 'Report back to the supervisor';
  if (!f[SHIFT.released]) return 'Move the trolley to the marked loading bay';
  if (!f[SHIFT.parked]) return 'Push the released trolley into the loading bay';
  if (!f[SHIFT.checked]) return 'Return your work tag at CHECKOUT';
  if (!f[SHIFT.done]) return 'Read your wage statement';
  return 'SHIFT COMPLETE · Your work is done. Take a breath.';
}

/** Authored time, never a deadline. The commute will belong to milestone 3. */
export const shiftMinute = (f: Flags) => f[SHIFT.checked] ? 5 * 60 + 25 : f[SHIFT.parked] ? 5 * 60 : f[SHIFT.trolley] ? 3 * 60 : f[SHIFT.returned] ? 1 * 60 : f[SHIFT.delivered] ? 22 * 60 : 18 * 60 + 40;

const boss: Character = { seed: 7301, x: L.boss, look: { body: 'wide', garb: 'jacket', hair: 'cap', top: '#827144', extras: ['phone'] }, act: 'stand', facing: 1 };
const mara: Character = { seed: 7302, x: L.coworker, look: { body: 'tall', garb: 'hivis', hair: 'bun', top: '#b5903a' }, act: 'vend', facing: -1 };
const worker: Character = { seed: 7303, x: 0, look: { body: 'avg', garb: 'hivis', hair: 'short', top: '#b77a29', bottom: '#303746' }, act: 'stand' };

export function drawShiftWorker(x: CanvasRenderingContext2D, v: View, wx: number, face: number, moving: boolean, f: Flags) {
  worker.x = wx; worker.facing = face < 0 ? -1 : 1; worker.act = moving ? 'walk' : 'stand';
  drawCharacter(x, v, worker);
  if ((f[SHIFT.parcel] && !f[SHIFT.delivered]) || (f[SHIFT.case] && !f[SHIFT.returned])) {
    box(x, v.sx(wx) + face * 8 - 7, v.y(25), 14, 11, f[SHIFT.delivered] ? '#77664d' : '#39678b', '#e5d4af');
  }
}

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

export const harborShift: SceneDef = {
  id: 'harborShift', name: 'Harbor · night shift', width: 1180, spawn: 80, exits: [],
  ambient: { sky: true }, facing: 90, horizon: 84,
  intro: ['Sundown. Another night on transport. The supervisor is waiting by the office.'],
  objective: shiftGoal, uses: SHIFT_USES,
  lights: [160, 580, 1020].map((x) => ({ x, h: 84, kind: 'lamp' as const, r: 90, col: PAPER })),
  drawBackdrop(x, v) {
    const { sx, y, flags: f, t } = v;
    drawHarborDistance(x, v);
    x.save(); x.globalAlpha = .45;
    placed(x, sx(900, .6), y(40), .75, () => drawGantry(x, GANTRIES.sts1, t));
    container(x, v, 370, 14, { w: 160, h: 70, p: 5, seed: 501, label: 'NIGHT LOADING' });
    x.restore();
    box(x, 0, y(0), v.viewW, v.viewH - v.gy, '#242224');
    box(x, 0, y(4), v.viewW, 4, '#726351');
    for (let i = 0; i < 1180; i += 44) box(x, sx(i), y(-12), 20, 2, '#39332e');
    // Back wall of the office; all labels are attached to physical surfaces.
    box(x, sx(116), y(91), 88, 91, '#242831', '#82745b');
    sign(x, t, 'SUPERVISOR', sx(160), y(80), PAPER, { size: 7 });
    drawCharacter(x, v, boss);
    box(x, sx(135), y(22), 50, 22, '#504332', '#ae966a');
    for (const [wx, label] of [[300, 'DISPATCH'], [420, 'CASE RETURNS'], [580, 'RECEIVING'], [1020, 'CHECKOUT']] as const) {
      box(x, sx(wx) - 1, y(78), 2, 78, '#7a6c53');
      sign(x, t, label, sx(wx), y(78), PAPER, { size: 7 });
    }
    box(x, sx(272), y(20), 56, 20, '#574531', '#b99b6b');
    if (!f[SHIFT.parcel]) box(x, sx(289), y(38), 22, 18, '#39678b', '#abcde1');
    box(x, sx(398), y(34), 44, 34, '#262b30', '#a2967a');
    if (f[SHIFT.returned]) box(x, sx(404), y(21), 32, 14, '#77664d', '#cab68b');
    drawCharacter(x, v, mara);
    box(x, sx(553), y(23), 92, 23, '#544332', '#ae966a');
    if (f[SHIFT.delivered]) box(x, sx(560), y(41), 22, 18, '#39678b', '#abcde1');
    if (f[SHIFT.delivered] && !f[SHIFT.case]) box(x, sx(617), y(37), 26, 14, '#77664d', '#cab68b');
    const trolley = f[SHIFT.parked] ? L.bay : L.trolley;
    for (let dx = -32; dx <= 32; dx += 8) box(x, sx(L.bay + dx), y(2), 4, 2, '#e4bd63');
    text(x, 'LOADING BAY', sx(L.bay), y(-20), '#e4bd63', 7);
    for (const dx of [-17, 17]) box(x, sx(trolley + dx) - 4, y(8), 8, 8, '#15191e', '#a29882');
    box(x, sx(trolley) - 29, y(16), 58, 9, '#656b70', '#cec4ae');
    box(x, sx(trolley) - 29, y(40), 3, 25, '#a9a394');
    box(x, sx(L.trolley + 38), y(22), 12, 22, '#413632', '#998a72');
    box(x, sx(L.trolley + 42), y(32), 4, 12, f[SHIFT.released] ? '#64ba75' : '#df6754');
    if (!f[SHIFT.released]) box(x, sx(trolley + 12), y(11), 17, 12, '#a83f32', '#e78d69');
    box(x, sx(996), y(59), 48, 59, '#353c3b', '#acb7a1');
    box(x, sx(1002), y(50), 36, 20, '#131f1c', '#99b69e');
    text(x, f[SHIFT.checked] ? 'PAID' : 'VERIFIED', sx(1020), y(40), '#a5d6a7', 6);
    if (f[SHIFT.checked]) {
      box(x, sx(1064), y(38), 29, 28, '#e0d1aa', '#8c7a5e');
      text(x, 'NET 3', sx(1078), y(24), '#3d352a', 6);
    }
    for (const u of SHIFT_USES) if (!u.available || u.available(f)) tell(x, t, sx(u.x), y(52));
    if (f[SHIFT.done]) sign(x, t, 'SHIFT COMPLETE', sx(1020), y(114), PAPER, { size: 9 });
    // The assigned bay has physical boundaries, not routes into the campaign.
    for (const end of [22, 1150]) {
      box(x, sx(end), y(40), 4, 40, '#9b8461');
      box(x, sx(end) - 18, y(36), 40, 4, '#bba06d');
    }
  },
};
