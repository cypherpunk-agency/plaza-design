/**
 * The glide's map and its camera (glide.ts draws, coast.ts and town.ts lay out, finale.ts ends it).
 *
 * Tommi, 2026-10-15 (second pass): stretch everything out; calmer, "easy, but also kind of
 * stressful". So the coast is longer and the camera slower, it eases off over the bay to give the
 * Spire its moment, and it brakes long into Downtown, still creeping west as it drops after the train.
 *
 * Units: view units (glide.ts), X west of the title's middle; a thing at depth `p` (1: the near coast)
 * is at screen x = W/2 + p·(g − X), with `g` the camera's distance west.
 */

/** Where things are along the coast (X at depth 1). */
export const PLACES = {
  /** The sand: from far east of the title to its end at the rocks. */
  sand: 760,
  /** The pier out over the water: its stairs on the sand, its lantern at the seaward end. */
  pier: [400, 640] as [number, number],
  /** Rocks down into the inlet, the inlet (water under the footbridge), the breakwater's root. */
  rocks: 800,
  inlet: [800, 960] as [number, number],
  /** The port's fenced buffer: gravel, the double fence, the staff gate at its west end. */
  buffer: [960, 1180] as [number, number],
  staffGate: 1150,
  /** The quay: the stacks, the cranes, the ship behind; the logistics hub at its east end. */
  quay: [1180, 2240] as [number, number],
  hub: 1260,
  /** The truck gate at the quay's west end: the public road starts here, west. */
  gate: 2270,
  road: 2290,
  /** The bay bridge (the Spire's stretch: open water, a low deck, little on it). */
  bridge: [2330, 2790] as [number, number],
  /** The Galleria's plaza, the building, LINE 0's Galleria station beside it (the viaduct starts there). */
  plaza: [2790, 3130] as [number, number],
  galleria: [2840, 3070] as [number, number],
  station: [3076, 3150] as [number, number],
  /** Downtown's street from the plaza's steps on. */
  street: 3130,
  /** THE RING: from its east end (curving in from inland) west. */
  ring: 3180,
  /** LINE 0: the viaduct comes down this ramp into the cutting; the tunnel's portal. */
  ramp: [3800, 4010] as [number, number],
  portal: 4010,
};

/**
 * The city map since 2026-10-22 (Tommi): the beach is in the west, the harbor in the east, and the
 * glide runs east. The near coast above is drawn as it always was (its own X runs west, the harbor
 * east of Downtown); the beach is drawn a second time, mirrored, west of Downtown's street: a beach
 * point `Xb` of the native layout stands at `WEST.beach − Xb`, so the inlet (the canal's mouth) and
 * its sea wall meet the street at `WEST.junction` (the street's last tower ends before it). The
 * title looks at that mirrored beach (`WEST.beach`); the glide's camera runs from there east,
 * through Downtown, the Galleria and over the bay to the raised Harbor Station (`HARBOR_STATION`,
 * over the truck gate where the bay bridge lands on the quay). Camera, clock and train come from
 * the timeline (story/title/timeline.json).
 */
export const WEST = { junction: 5260, beach: 5260 + PLACES.inlet[1] };
/** LINE 0's raised Harbor Station (X east end, west end) on the viaduct over the bridge's landing; a two-car train stops in it. */
export const HARBOR_STATION: [number, number] = [2200, 2580];

/** The Spire, in the bay at depth 0.3 (centred a little right of the middle while the camera eases over the bridge). */
export const SPIRE_P = 0.3;
/** The camera's slow stretch over the bridge (X), and how much it eases off there. */
const SLOW: [number, number] = [2330, 2800], SLOW_K = 0.55;
export const SPIRE_X = Math.round((SLOW[0] + SLOW[1]) / 2 - 46 / SPIRE_P);

/** The camera's cruise (view units a second at depth 1), its ease in, and where it brakes to (it never quite stops before the end). */
const SPEED = 70, EASE_IN = 6, END = 4420, BRAKE = 520;

const smooth = (a: number, b: number, v: number) => { const f = Math.max(0, Math.min(1, (v - a) / (b - a))); return f * f * (3 - 2 * f); };
const lerp = (a: number, b: number, f: number) => a + (b - a) * f;

/** The camera's speed at distance g, time t (it eases in, eases off over the bay, brakes long into Downtown). */
function speed(g: number, t: number) {
  const slow = smooth(SLOW[0] - 160, SLOW[0] + 40, g) * (1 - smooth(SLOW[1] - 40, SLOW[1] + 160, g));
  const brake = g > END - BRAKE ? Math.max(0.04, Math.sqrt(Math.max(0, END - g) / BRAKE)) : 1;
  return SPEED * smooth(0, EASE_IN, t) * (1 - SLOW_K * slow) * brake;
}

/** The camera's distance west, sampled at 30 Hz from NEW GAME (integrated finer). */
const DIST = (() => {
  const out: number[] = [0];
  let g = 0, t = 0;
  for (let i = 1; i <= 140 * 30; i++) { for (let s = 0; s < 4; s++) { g += speed(g, t) / 120; t += 1 / 120; } out.push(g); }
  return out;
})();
export const glideDist = (tau: number) => { const i = Math.max(0, tau) * 30, k = Math.floor(i), f = i - k; return k + 1 >= DIST.length ? DIST[DIST.length - 1] : lerp(DIST[k], DIST[k + 1], f); };
/** When the camera is over world position X (depth 1: anything at X is in the middle of the view). */
export const tauAt = (X: number) => { let a = 0, b = 140; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (glideDist(m) < X) a = m; else b = m; } return Math.round(b * 10) / 10; };

/**
 * LINE 0 at the end (finale.ts): the train comes out of a tower's portal (the canyon line from the
 * harbor, CITY.md), overtakes the camera on the viaduct, runs down the ramp and dives under the
 * street. `TRAIN_V` its speed (view units a second), `TRAIN_LEN` its three cars, `NOSE_IN` when its nose
 * reaches the portal (the camera is then over the ramp's foot), `OUT` when it came out of the tower,
 * and the tower portal's west edge (`TOWER_X`), placed so it is on screen, right of the middle, then.
 */
export const TRAIN_V = 108, TRAIN_LEN = 3 * (533 / 3) + 2 * 3;
export const NOSE_IN = tauAt(PLACES.portal - 170);
const run = PLACES.portal - 0;
export const TOWER_X = (() => {
  // solve: the nose leaves the tower at OUT = NOSE_IN − (portal − TOWER_X)/V, with the camera then 130 east of it
  let X = PLACES.portal - 600;
  for (let i = 0; i < 30; i++) { const out = NOSE_IN - (run - X) / TRAIN_V, g = glideDist(out); X = g - 130 > 3300 ? g - 130 : 3300; }
  return Math.round(X);
})();
export const OUT = NOSE_IN - (run - TOWER_X) / TRAIN_V;
/** The drop after the train: to the bore (first), then on down to the Undercity's canal; the dark, and the handover. */
export const DROP1: [number, number] = [NOSE_IN - 0.6, NOSE_IN + 3.6], DROP2: [number, number] = [NOSE_IN + 4.6, NOSE_IN + 8.6];
/** Seconds from NEW GAME to the handover; the last second and a half fade to the dark of the tunnel. */
export const GLIDE = Math.round((NOSE_IN + 11) * 10) / 10;

/** Named moments for sudo's time control (transport.ts; 1–9 jump to them). */
export const GLIDE_BEATS = [
  { at: 0, name: 'BEACH' },
  { at: tauAt((PLACES.pier[0] + PLACES.pier[1]) / 2), name: 'PIER' },
  { at: tauAt((PLACES.inlet[0] + PLACES.buffer[1]) / 2), name: 'INLET' },
  { at: tauAt(1700), name: 'HARBOR' },
  { at: tauAt((SLOW[0] + SLOW[1]) / 2), name: 'SPIRE' },
  { at: tauAt((PLACES.galleria[0] + PLACES.galleria[1]) / 2), name: 'GALLERIA' },
  { at: tauAt(3420), name: 'DOWNTOWN' },
  { at: Math.round(OUT * 10) / 10 + 1.5, name: 'LINE 0' },
  { at: Math.round((NOSE_IN + 5.5) * 10) / 10, name: 'UNDER' },
];
