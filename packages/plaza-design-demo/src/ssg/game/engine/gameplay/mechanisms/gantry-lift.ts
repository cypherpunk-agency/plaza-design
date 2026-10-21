/**
 * Mechanism `gantryLift` (scene.json `stage.mechanics`): a gantry crane's lifts, the thermal gate's
 * timing and the end of Act I, as the stacks' code side (P15 NRLU 404 0451, the end of Act I). Almost
 * everything is data/stacks.json on the engine: STS-2, the Port Authority's
 * thermal gate and its alarm cable, the night ferry, the reefer with Moth in
 * it, the Registry's watchdog walking port → crane → ferry, and Moth's talk.
 * Source Case lists own lift/alarm refusals, busy eligibility and empty/airborne
 * alarm policy. Shared milestone commands own alarm counts and return outcomes;
 * source queries own status wording and the finite regular/reefer trajectory kind.
 * Remaining native work still includes the ordinary lift-start/scan tails
 * listed in STACKS-ORDINARY-MIGRATION.md; this file is not fully consolidated.
 *
 * The trajectory mechanics:
 *
 * - `sts2.lift`: STS-2's spreader. Only a cable lifts (the pre-wired
 *   `ferry.watchdog:leaves → sts2.spreader lift`: the crane lifts when the
 *   Registry has cleared the ferry); a finger is refused. Untagged, it moves a
 *   regular box from the quay chassis into the ferry's hold (cold: the gate
 *   clears it). Once 0451's slot is tagged on the crane's camera (`found`),
 *   the next lift takes the reefer out of block B, through the thermal gate,
 *   onto the ferry's deck. On the way it passes the gate: the gate raises
 *   `port.scanner:warm` (a person is warm). Wired to the alarm, the alarm
 *   sounds and the box goes back. While the watchdog sits on PORT AUTHORITY
 *   nothing leaves it (the engine's freeze), so the warm is lost: the clever way.
 * - `port.alarm`: sounds; with 0451 in the air, the lift is aborted and the box
 *   returned to its slot.
 * - the source watchdog trigger restores a cut alarm cable and records trace
 *   through shared domain actions while PORT AUTHORITY is frozen. The cut must
 *   therefore be made while it is away and hold until the lift.
 * - `moth.end`: the end of Act I. Flags `act1:done`, `heard:spire` (the Spire is
 *   named on the map) and `contact:moth` (Moth on your deck), the ACT II card,
 *   and NIGHT FERRY 7 leaves with Moth (`departed`; NIGHT FERRY 8 takes the berth and the
 *   crane goes on loading regular cargo).
 *
 * Where the trolley and its box are (`trolley`) is a pure function of the model's
 * clock and the lift in progress, so the drawing and the gate's timing agree.
 *
 * Pure: no DOM, so node can run it (the build's check).
 */

import type {TerminalGeometry} from '../../../art/assemblies/terminal-state';
import type { SceneData } from "../../../data/types";
import type { PlayerServices } from "../../../runtime/player";
import type { Effect, SceneRules, World } from "../../rules";
import type { SceneModel } from "../../model";
import {stacksController} from '../../controllers/motion';
import {cameraPanel, registerCameraPainter, zoomButton, type CameraView} from '../../camera-panel';
import type {SceneMechanism} from '../scene-mechanisms';

export const stacksState=(m:SceneModel,key:keyof import('../../controllers/motion').StacksController['state'])=>m.get(stacksController(m.data).state[key]);

/** Default world x of the things the trolley works between; a scene's own artwork roles (`gantryGeometry`) replace them. */
export const X = {
  /** Where the trolley waits between lifts. */
  rest: 1000,
  /** 0451's slot, block B's back row. */
  slot: 476,
  /** The quay chassis under the crane, where the straddle carriers set regular boxes down. */
  chassis: 930,
  /** The thermal gate's plane. */
  gate: 1064,
  /** The ferry's open hatch (regular boxes go down into the hold). */
  hatch: 1300,
  /** 0451's place on the deck, plugged into the ferry's reefer power. */
  deck: 1452,
};
/** Heights of a box's bottom: carried, on the chassis, in its slot, on the deck, down in the hold. */
export const H = { carry: 120, chassis: 14, slot: 58, deck: 4, hold: -64 };

/** A lift's timeline (ms from the cable): the trolley moves over, lowers and hoists, travels, lowers. */
const timeline=(data?:Pick<SceneData,'controller'>)=>{const c=stacksController(data??{});return{over:c.lift.overMs,hoist:c.lift.hoistMs,travel:c.lift.travelMs,lower:c.lift.lowerMs};};

/** What the trolley carries: nothing, a regular box, or 0451. */
export const KIND = { none: 0, regular: 1, box: 2 } as const;

/** Linear between a and b at f (clamped), eased at both ends. */
const ease = (f: number) => { const k = Math.max(0, Math.min(1, f)); return k * k * (3 - 2 * k); };
const lerp = (a: number, b: number, f: number) => a + (b - a) * f;

/** Where a lift picks up and sets down, by kind. */
const route = (kind:number, geometry:TerminalGeometry={X,H}) => {const {X,H}=geometry;return kind===KIND.box?{from:X.slot,to:X.deck,low:H.slot,end:H.deck}:{from:X.chassis,to:X.hatch,low:H.chassis,end:H.hold};};

/** The trolley's x and its box's bottom height `ms` into a lift that started with the trolley at `x0`. */
function liftAt(kind: number, x0: number, ms: number, geometry:TerminalGeometry={X,H},data?:Pick<SceneData,'controller'>) {
  const T=timeline(data);
  const {H}=geometry,r = route(kind,geometry);
  if (ms < T.over) return { x: lerp(x0, r.from, ease(ms / T.over)), h: H.carry, load: false };
  let u = ms - T.over;
  if (u < T.hoist) { const k = u < T.hoist / 2 ? u / (T.hoist / 2) : 1 - (u - T.hoist / 2) / (T.hoist / 2); return { x: r.from, h: lerp(H.carry, r.low, ease(k)), load: u >= T.hoist / 2 }; }
  u -= T.hoist;
  // travelling at an even speed, so the box crosses the gate at a known moment
  if (u < T.travel) return { x: lerp(r.from, r.to, u / T.travel), h: H.carry, load: true };
  u -= T.travel;
  if (u < T.lower) return { x: r.to, h: lerp(H.carry, r.end, ease(u / T.lower)), load: true };
  return { x: r.to, h: H.carry, load: false };
}

/** ms into a lift at which its box crosses the thermal gate. */
export const scanMs = (kind: number, geometry:TerminalGeometry={X,H},data?:Pick<SceneData,'controller'>) => { const T=timeline(data),{X}=geometry,r = route(kind,geometry); return T.over + T.hoist + T.travel * (X.gate - r.from) / (r.to - r.from); };

/** Where the trolley is now, and what hangs under it: `h` is the bottom of the box (or the empty spreader). */
export function trolley(m: SceneModel,geometry:TerminalGeometry={X,H}): { x: number; h: number; carry: number } {
  const {X,H}=geometry,s = m.scratch, now = m.now();
  if (s.retT0 !== undefined) {
    const u = now - s.retT0, k = u / stacksController(m.data).returnMs;
    if (k < 0.7) return { x: lerp(s.retX, X.slot, ease(k / 0.7)), h: H.carry, carry: KIND.box };
    if (k < 1) return { x: X.slot, h: lerp(H.carry, H.slot, ease((k - 0.7) / 0.3)), carry: KIND.box };
    return { x: X.slot, h: H.carry, carry: KIND.none };
  }
  if (s.liftT0 !== undefined) {
    const p = liftAt(s.liftKind, s.liftX, now - s.liftT0,geometry,m.data);
    return { x: p.x, h: p.h, carry: p.load ? s.liftKind : KIND.none };
  }
  return { x: s.restX ?? X.rest, h: H.carry, carry: KIND.none };
}

/** Is the crane busy (a lift or a return in progress)? */
const busy = (m: SceneModel) => m.scratch.liftT0 !== undefined || m.scratch.retT0 !== undefined;
/** A lift's ticket: an alarm or a reload makes a lift in flight forget to land. */
let ticket = 0;

function stacksRules(_player: PlayerServices,geometry:TerminalGeometry={X,H}): SceneRules {
const {X}=geometry;
  const effects: Record<string, Effect> = {
    /** STS-2's spreader: a cable lifts (the Registry's clearance), a finger does not. */
    'sts2.lift': (w) => {
      const m = w.m;
      const kind = m.value('stacks.liftKind');
      if (kind !== KIND.box && kind !== KIND.regular) throw new Error('STS-2 requires source liftKind 1 or 2');
      const t = ++ticket, s = m.scratch;
      s.liftT0 = m.now(); s.liftKind = kind; s.liftX = trolley(m,geometry).x; s.ticket = t;
      w.input('stacks.crane.started');
      // the gate: the box passes through the thermal scan
      m.later(scanMs(kind,geometry,m.data), () => {
        if (s.ticket !== t) return;
        if (kind === KIND.regular) { s.cold = m.now(); w.changed(); return; }
        s.warm = m.now();
        // a frozen gate still sees it; it just cannot tell anyone (the engine says so: watchdog.mute)
        w.input('stacks.crane.scanned');
        w.changed();
      });
      m.later(Object.values(timeline(m.data)).reduce((sum,ms)=>sum+ms,0), () => {
        if (s.ticket !== t) return;
        delete s.liftT0; s.restX = route(kind,geometry).to;
        w.input('stacks.crane.landed');
        w.changed();
      });
      w.changed();

    },

    /** The alarm: by hand a test; with 0451 in the air, the lift is aborted and the box goes back. */
    'port.return': (w) => {
      const m = w.m, s = m.scratch;
      // abort: the box goes back into its slot from wherever it is
      s.retX = trolley(m,geometry).x; s.retT0 = m.now(); delete s.liftT0; s.ticket = ++ticket;
      const t = s.ticket;
      // Physical trajectory is valid before a source commit can request a redraw.
      w.input('stacks.crane.return.started');
      m.later(stacksController(m.data).returnMs, () => {
        if (s.ticket !== t) return;
        delete s.retT0; s.restX = X.slot;
        w.input('stacks.crane.returned');
        w.changed();
      });
      w.changed();
    },


  };

  function tick(w: World) {
    const m = w.m, s = m.scratch;
    // the crane's moving: redraw is the game's; the status line wants a refresh when a lift ends
    if (s.cold !== undefined && m.now() - s.cold > 1200) { delete s.cold; w.changed(); }
  }

  return {
    effects,
    inputs:['stacks.crane.started','stacks.crane.scanned','stacks.crane.landed','stacks.crane.return.started','stacks.crane.returned'],
    panels: ['scope'],
    derived: {
      /** Physical trajectory occupancy; source cases own permission/refusal policy. */
      craneBusy: (m) => busy(m),
      reeferTrajectory: (m) => m.scratch.liftKind===KIND.box,
      portFrozen: (m) => m.frozen(stacksController(m.data).scannerDevice),
      craneReturning: (m) => m.scratch.retT0 !== undefined,
    },
    tick,
    needs: {
      devices:[],
      texts: {

        // the scope (scope.ts, engine/camera-panel.ts)
        'scope.zoom': 'label', 'scope.tag': 'label', 'scope.hud': 'label', 'scope.aim': 'label', 'scope.on': 'label',
        'scope.zoom.ground': 'line', 'scope.zoom.box': 'line', 'scope.zoom.found': 'line', 'scope.zoom.out': 'line',
        'scope.tag.none': 'line', 'scope.tag.wrong': 'line', 'scope.tag.ok': 'line', 'scope.tag.refused': 'line', 'scope.tag.done': 'line',
      },
    },
    /** The physical scope identifies the cargo slot; watchdog topology is authored. */
    check: (z: SceneData) => {
      const errs: string[] = [];
      if (!z.camera?.crates.some((k) => k.id === z.state[stacksController(z).state.box])) errs.push('camera.crates: state.box must be the slot that holds NRLU 404 0451 (P15)');
      return errs;
    },
  };
}

/** The artwork roles the mechanism measures its geometry from (scene.json manifest.artwork). */
export const GANTRY_ROLES=['rest','slot','chassis','gate','hatch','deck'] as const;
/** Where the trolley works, read from the scene's own artwork: x of each role, and its height. */
export function gantryGeometry(roles:Readonly<Record<string,{placement:{x:number;h:number}}>>):TerminalGeometry{
  const p=(id:string)=>roles[id].placement;
  return{X:{rest:p('rest').x,slot:p('slot').x,chassis:p('chassis').x,gate:p('gate').x,hatch:p('hatch').x,deck:p('deck').x},H:{carry:p('rest').h,chassis:p('chassis').h,slot:p('slot').h,deck:p('deck').h,hold:p('hatch').h}};
}

/** For the build-time check: the contract does not depend on whose save it is. */
const SHAPE_PLAYER:PlayerServices={
  save: () => ({ handle: '', tokens: 0, jump: false, controlled: [], flags: {} }),
  persist: () => {}, nodes: () => 42, granted: () => {}, end: () => {},
} as unknown as PlayerServices;

/**
 * The stacks' camera: STS-2's scope (engine/camera-panel.ts), looking straight
 * down from the trolley on blocks A, B and C. Every container's roof carries
 * its code, too small to read until you zoom; TAG FOR LIFT gives STS-2 the
 * slot under the crosshair (only 0451's is on tonight's schedule). Reefers wear
 * frost on their roofs; 0451, warm inside, does not. The boxes, which slots
 * hold reefers (`camera.bindings.reefers`) and every word come from
 * stacks.json (`camera`, `texts`); the look is this file's.
 */


/** Roof paints for the dry boxes: faded, earthy, none cyan. */
const PAINT = ['#6a2a12', '#24484a', '#5a1a20', '#5a4a14', '#2e4a26', '#3a3a48', '#4e3020', '#585048'];

const mine = (m: SceneModel) => stacksState(m, 'box') as string;
/** 0451 still in its slot (it leaves the picture once lifted). */
const home = (m: SceneModel) => stacksState(m, 'boxAt') === 'stack' || stacksState(m, 'boxAt') === 'air';

registerCameraPainter('stacks.roofs', (g, { m, things: boxes, zoom, t }: CameraView) => {
  const W = 320, H = 150;
  /** Slots that hold reefers (white roofs, a unit at one end). 0451's is one of them. */
  const reefers = new Set(m.data.camera?.bindings?.reefers ?? []);
  /** A container's roof, seen from above: corrugation, corner castings, its code stencilled small. */
  const roof = (k: (typeof boxes)[number], i: number) => {
    const reefer = reefers.has(k.id), warm = k.id === mine(m);
    g.fillStyle = reefer ? '#c8c4b8' : PAINT[i % PAINT.length]; g.fillRect(k.x, k.y, k.w, k.h);
    g.fillStyle = 'rgba(0,0,0,.22)'; for (let x = k.x + 3; x < k.x + k.w - 2; x += 3) g.fillRect(x, k.y + 1, 1, k.h - 2);
    g.strokeStyle = reefer ? '#f2eee4' : 'rgba(255,217,165,.55)'; g.lineWidth = 0.6; g.strokeRect(k.x + 0.3, k.y + 0.3, k.w - 0.6, k.h - 0.6);
    g.fillStyle = 'rgba(255,217,165,.5)'; for (const [dx, dy] of [[0, 0], [k.w - 2, 0], [0, k.h - 2], [k.w - 2, k.h - 2]]) g.fillRect(k.x + dx, k.y + dy, 2, 2);
    if (reefer) {
      // the refrigeration unit at one end, its fan turning
      g.fillStyle = '#5a5a5e'; g.fillRect(k.x + k.w - 7, k.y + 2, 5, k.h - 4);
      const a = t / (warm ? 90 : 160);
      g.strokeStyle = '#2a2a2e'; g.beginPath(); g.moveTo(k.x + k.w - 4.5 + Math.cos(a) * 2, k.y + k.h / 2 + Math.sin(a) * 2); g.lineTo(k.x + k.w - 4.5 - Math.cos(a) * 2, k.y + k.h / 2 - Math.sin(a) * 2); g.stroke();
      // frost on the cold ones; 0451 is warm inside, so none (and the rain steams off it)
      if (!warm) { g.fillStyle = 'rgba(235,245,255,.55)'; for (let j = 0; j < 9; j++) g.fillRect(k.x + 3 + ((j * 13 + i * 5) % (k.w - 12)), k.y + 2 + ((j * 7) % (k.h - 4)), 1, 1); }
      else { g.fillStyle = 'rgba(235,240,245,' + (0.06 + 0.04 * Math.sin(t / 300)) + ')'; g.fillRect(k.x + 4, k.y + 1, k.w - 12, k.h - 2); }
    }
    // the code, stencilled: at ×1 the camera only resolves smudges; at ×3 it reads
    g.fillStyle = reefer ? '#1a1410' : '#ffd9a5';
    if (zoom > 1) { g.font = '600 2.6px "IBM Plex Mono", monospace'; g.fillText(k.label, k.x + 3, k.y + k.h / 2 + 1); }
    else { g.globalAlpha = 0.55; for (let j = 0; j < 4; j++) g.fillRect(k.x + 3 + j * 6, k.y + k.h / 2 - 1, 4 + ((i + j) % 2), 1.4); g.globalAlpha = 1; }
  };
  // wet asphalt, lane lines, the block letters painted on the ground
  g.fillStyle = '#0c0a0a'; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(232,200,58,.35)'; for (let x = 0; x < W; x += 12) g.fillRect(x, 112, 7, 1);
  g.fillStyle = 'rgba(255,217,165,.18)'; g.fillRect(0, 22, W, 1); g.fillRect(0, 106, W, 1);
  g.font = '600 9px "IBM Plex Mono", monospace'; g.fillStyle = 'rgba(255,217,165,.35)';
  for (const [l, x] of [['A', 48], ['B', 152], ['C', 256]] as [string, number][]) g.fillText(l, x, 18);
  // the quay at the bottom: the chassis lane and the water's edge
  g.fillStyle = '#04060c'; g.fillRect(0, 134, W, 16);
  g.fillStyle = 'rgba(170,210,255,.12)'; for (let x = (t / 40) % 20; x < W; x += 20) g.fillRect(x, 140 + Math.sin(x) * 2, 8, 1);
  boxes.forEach((k, i) => { if (k.id !== mine(m) || home(m)) roof(k, i); else { g.fillStyle = '#060504'; g.fillRect(k.x, k.y, k.w, k.h); g.strokeStyle = 'rgba(255,217,165,.25)'; g.setLineDash([1.5, 1.5]); g.strokeRect(k.x + 0.5, k.y + 0.5, k.w - 1, k.h - 1); g.setLineDash([]); } });
  // a straddle carrier crossing the lane, seen from above: four legs and a frame
  const sc = ((t / 30) % (W + 60)) - 30;
  g.fillStyle = '#c8641e'; g.fillRect(sc, 114, 26, 3); g.fillRect(sc, 126, 26, 3); g.fillStyle = '#2a2624'; g.fillRect(sc + 2, 117, 22, 9);
  // a gull on a roof
  g.fillStyle = '#e8e4dc'; g.fillRect(230, 52, 3, 2); g.fillStyle = '#e8b030'; g.fillRect(233, 52, 1, 1);
  // the tag: STS-2's target
  if (stacksState(m, 'found') && home(m)) {
    const k = boxes.find((b) => b.id === mine(m));
    if (k) { g.strokeStyle = '#ff3df2'; g.lineWidth = 0.8; g.setLineDash([2, 2]); g.strokeRect(k.x - 2, k.y - 2, k.w + 4, k.h + 4); g.setLineDash([]); }
  }
});

const scopePanel = cameraPanel({
  painter: 'stacks.roofs',
  texts: 'scope',
  start: { x: 160, y: 66 },
  reach: 2,
  /** 0451 leaves the picture once lifted. */
  visible: (k, m) => k.id !== mine(m) || home(m),
  buttons: [
    zoomButton('scope.zoom', 'scope.zoom.out', (k, { m, say }) => {
      if (!k) return say(m.line('scope.zoom.ground'));
      say(m.line(k.id === mine(m) ? 'scope.zoom.found' : 'scope.zoom.box', { id: k.id, label: k.label }));
    }),
    {
      label: 'scope.tag',
      press: ({ m, say, under }) => {
        if (!home(m)) return say(m.line('scope.tag.done'));
        const k = under();
        if (!k) return say(m.line('scope.tag.none'));
        if (k.id !== mine(m)) return say(m.line('scope.tag.wrong', { id: k.id, label: k.label }));
        const command = m.data.camera?.actions?.tagOwned;
        const result = command ? m.runCommand(command) : { ok: false, reason: 'unknown-command' } as const;
        if (!result.ok) return say(m.line('scope.tag.refused', { reason: result.reason, id: k.id }));
        say(m.line('scope.tag.ok', { id: k.id }));
      },
    },
  ],
});

/** scene.json `stage.mechanisms: ["gantryLift"]` (scene-mechanisms.ts): the rules, the scope panel and the source checks. */
export const gantryLift:SceneMechanism={
  face:{function:'act',controller:'stacks'},
  label:'Gantry lift (crane, thermal gate, scope)',
  requires:GANTRY_ROLES,
  world:false,
  apply:({roles})=>{const geometry=gantryGeometry(roles);return{rules:(player:PlayerServices)=>stacksRules(player,geometry),panels:{scope:scopePanel}};},
  rulesShape:()=>stacksRules(SHAPE_PLAYER),
  check:({gameplay})=>{
    const kind=gameplay.queries?.['stacks.liftKind'];
    if(kind?.kind!=='select'||kind.cases.some(row=>!('literal'in row.value)||![1,2].includes(row.value.literal as number)))throw new Error('STS-2 liftKind requires select outputs 1 or 2');
  },
};
