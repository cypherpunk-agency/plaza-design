# Session hand-over, 2026-10-22

Working notes for the next session: what is in flight, what was found, what to do next. Priorities stay in
[ROADMAP.md](../../ROADMAP.md); step status in [SEAMLESS-WORLD.md](./SEAMLESS-WORLD.md) (Status). Delete this file
once its items are done or moved.

Branch `claude/happy-euler-oxkna1` = `main` = `production` at `fba1cfd` (deployed), plus the title-glide
performance commits merged after it (not yet deployed).

## Open from Tommi's play-test of `?play=harbor-station` (2026-10-22)

Content (harbor zones in `scenes/authored.json`):

1. ~~No walk cycle~~ and 2. ~~gliding then popping on the stair~~: **fixed** (merged). Both came from the
   dockworker avatar (`runtime/dockworker.ts`): its pose was never marked as moved by the game and ignored the
   player's height. The stair link was right. Still to add: a check that a mirrored stair's link ends match its
   drawing.
3. Station redesign: the player must walk right (east) first along the platform; stairs and lift at the
   platform's east end; then east on the quay to the checkout (station↔quay seam offset changes).
   Worked-out layout: train at x 20, spawn 200; stair `via-stair` at x 1410, h −160, run −200 (top 1210, foot
   1410); lift `via-lift` at 1150 (mover `across` and `spot.x` 1150, buttons 1174); WAY OUT sign ~1270. Seam
   `station-quay` dx 900, dh −160 (foot lands at quay x 510, lift at 250); station-owned piers over the water
   west of the quay (`level.section-wall` at h −160). Quay: keep piers 100 and 470, drop 840/1210/1422, add ~530;
   station sign ~600, notice ~680, tea stall ~760, quay spawn ~560. Update check-harbor-zones (station offset
   `[-900,160]`, stair head 1210, foot quay x 510) and HARBOR-ZONES.md.
4. Turnstile: the player passes between two barriers, one in front and one behind (`drawNear` in the
   over-player slot).
   Plan: occluder kind `{kind:'barrier', barrier:id}` in `engine/level.ts` (`compileOccluders` adds
   `level.barrier`; `levelNear` while walking at its height within `w/2 + 8 + HALF_BODY` of its x);
   `level.barrier` gets `visualFields.near` and `drawNear` (far cabinet + arm behind, near cabinet over the player).
   No parity scene uses barriers.
5. Talking to the supervisor jumps the clock: the zones' story clock pins on `shift.*`; let time run instead.
   A started patch is saved at [wip/harbor-clock-run.patch](./wip/harbor-clock-run.patch) (scene-document,
   manifest-content-compiler, scenes/kit): a scene `time` row may carry `rate` (the clock runs on from where it is,
   at that multiple) and `until` (holds there); the final `timeDay` row may omit `day`. Remaining: `pace` on
   `CityClock` (world/clock.ts: tick × pace, saved in withSnapshot); `runtime/game.ts` `pinStory` scene-rule
   branch sets `city.pace` from `def.storyRun` and pins at `until`; guard rows without `minute`/`day` in
   authoring/scene-authoring.ts; harbor zones' time rows → checkedOut `minute 370`, tagReceived
   `rate 3, until 370`, fallback `minute 1140`; timeDay → checkedOut `day 2`, fallback `{}`; update
   check-harbor-zones (lines ~97, 99, 111).
6. Shed: the staff-room stair runs across the wages NOTICE; the coffee note covers the STAFF sign. No sign
   under a flight or over another sign, in all five zones. Specifically: `locker-notice` sits under the staff stair (x 750–864)
   — move to ~1000, h 30 or west of 740; `coffee-note` (x 938, h 150) covers the STAFF ROOM label — lower to ~120.

Engine at seams (causes found, nothing fixed; plan below is the investigating agent's):

7. **A different backdrop per zone.** The active scene paints its whole composition (distance layer included)
   across the view; each neighbour paints its own distance rows clipped to its rect. Every harbor zone has its own
   far shore, crane, ship, apron, fog, boats; the Spire jumps (quay `spireX` 980, checkout 340). Complication:
   every harbor zone keeps its walkable ground (`shift.floor`) in the distance layer, and parallax is stored both
   in `placement.parallax` and `props.parallax` (vehicles: depth bands back 0.9 / far 0.55).
   **Plan:** `world/zone-graph.ts` gets optional `backdrops: [{ zones, from }]` (validated: `from` in `zones`,
   zones joined, no zone in two groups; helper `backdropOf`); `world/zone-graph.json` gets
   `{ zones: [harbor-quay, harbor-checkout, harbor-yard, harbor-shed], from: harbor-quay }` (station: decide).
   In `render-scene.ts` the shared backdrop is the owner's distance rows at depth (effective parallax ≠ 1), drawn
   once, unclipped, through the owner's view (`cam − dx`, so continuous through `crossInto`); hosts skip their
   depth distance rows when in a group (the `only` predicate of `drawCompositionSlot`); parallax-1 rows (ground)
   stay per zone, clipped. Scenes without a group take today's path exactly (scene parity).
8. **Pieces vanish at a seam.** A piece at parallax p < 1 sits at `x − cam·p`, so it slides past its zone's
   edge and is covered by the neighbour's clipped draw or clipped by its own rect (the quay's parked sky taxi at
   x 1540 on the 0.9 band, past the seam once cam > 600). **Plan:** clip only ground/backdrop rows in
   `drawJoined`; set/playfield rows that overhang draw unclipped, in zone order.
9. **State changes on crossing.** `showHost()` gives only the active host `show(true)`, and `tick` passes
   `live` only for it, so a visible neighbour's people, cues and captions don't advance the same way (the
   checkout's walking dockworker jumps on crossing). **Plan:** `show(tier)` from `zoneTiers`; visible hosts tick
   live; confirm one scene time and one city clock across crossing. The harbor zones have no `facing` (all 180),
   so light should agree; check `levelIndoor`/outdoor and per-zone `storyMinute` if the grade still differs.
10. A focused check `scripts/game-tests/check-seam-continuity.mts`: backdrop drawn once and identical before and
    after `crossInto`; overhanging rows not clipped; a visible neighbour ticking live; no clock jump.

Repro: `?play=harbor-station` (the worker profile, 19:00). Click the canvas, hold ← 3.4 s to the stair head, ↓,
hold → 3 s, then Shift; the quay→checkout crossing comes about 6.5–7 s after Shift. Headless: playwright-core at
`/opt/node-tools/node_modules/playwright-core`, Chromium at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`,
serve `dist-homepage` with `scripts/opening-playthrough/serve.mjs`.

## First priority: one render path (decided 2026-10-22)

ROADMAP.md item 0 / SEAMLESS-WORLD §7 step R. Done: the guard `check-one-render-path`, the `FrameDirector` on
`renderWorldFrame` (+ `directorFromTimeline`), and the cutscenes and the taxi flight on it (`runtime/sequence-frame.ts`;
`capture-sequence-frames.mts` showed all 80 sampled frames paint the same before and after). Two frame paths remain:
world `renderWorldFrame` and the opening's `renderOpeningSequence` → `openingFrame` (art/sequences/opening, ~2,600 lines;
own projection `sx = W/2 + p·(g − X)`, own scale `H/195`, own sky mood/warmth/rain, pieces are draw closures wrapped by
`sequence.opening.*` rows), on the guard's temporary allow-list. Next: the glide as zones with a timeline camera
ending in `harbor-station`. Do not add features to the opening path.

### Glide migration design (agent, checkpoint e46b8a5)

Capture harness: `scripts/game-tests/capture-glide-frames.mts` (title + 22 glide times through Opening.draw,
1280×720 and 960×540). Zones in scenes/authored.json (sudoOnly, walkable): glide-beach 6760–5260 (beach, pier,
inlet), glide-downtown-west 5260–4130, glide-downtown 4130–3150, glide-galleria 3150–2790, glide-spire-bay
2790–2330, glide-harbor 2330–2000 (later the real harbor-station). 1 glide px = 3 world units; zoom from the
director scale. Backdrops are world documents (SEAMLESS-WORLD decision 24), e.g. `world/backdrops/glide-coast.composition.json`
(far shore, Spire, sea, boats, breakwater, skyline rows, air lanes), referenced by the glide zones; the harbor
zones get `world/backdrops/harbor.composition.json` the same way (fixes item 7). Engine: drawJoined clips only distance/backdrop rows; the backdrop owner's distance rows drawn once,
unclipped; drawSky opt-in 'sunset' style; rain clipped to zones with weather. People → character.resident (+ dim)
and a people-flow element; traffic → a street-kit element on world/vehicles routes; camera track = world centre;
line0.train a cue element. Order: kit elements → zones + backdrop group → Opening via renderWorldFrame + director →
editor preview → remove opening frame paths, update checks → captures and perf comparison.

### Glide migration state at session end (main 5a227a7)

Done: kit pieces for the whole glide (coast/shore kit art/environment/coast.ts, sunset sky style, city kit
architecture.tower/skyline-rows/ring/through-block, street.side-street, building.galleria, LINE 0 kit transit.*,
vehicle.line0-run, street.traffic on world/vehicles, vehicle.air-lanes, beach kit, character.flow on
world/people-flow, opt-in street.lamp 'coast' and resident dim/facing). The title still plays on its old path.
Next: generate world/backdrops/glide-coast and the glide zones from the glide layout; generic backdrop support in
renderWorldFrame (decision 24); Opening through renderWorldFrame with the director; after captures vs
`.claude/captures/glide-one-path/before` (regenerate with scripts/game-tests/capture-glide-frames.mts on an
older commit if lost); empty the guard's allow-list.

## Title glide

- Performance: about 3.7× cheaper (render CPU p50 45.5 → 12.3 ms; Downtown 56 → 14.7) by skipping occluded
  skyline towers (`art/sequences/opening/occlusion.ts`), plus a shared `composition.ts` clone fix and title-only
  memo/mirror fixes. Workload `title-glide` in `scripts/performance/`. Not yet: live after-numbers; normal-play
  before/after (`?play=downtown`, harbor seam walk); per-fix split. Recommended next (unmeasured): skip facade
  rows hidden behind nearer bodies in shared `downtown-towers.ts` (also helps Downtown in play; check parity),
  cache `drawSea` colour strings / skip the sea under the city, prepare only on-screen title actors.
- Between tau 16 and 20.5 the unchanged code draws slightly differently from one draw to the next (one column, up
  to 8 levels): find the nondeterminism.
- The glide still draws through `renderOpeningSequence`, not `renderWorldFrame`. Proposed later step (after
  Downtown is a zone): fly the glide over real zones with the one renderer. Tommi to confirm adding it to the plan.

## Decisions waiting on Tommi

- Unjoined scenes stay hosted after you leave (only joined zones unload). Change?
- Lift list on a landscape phone scrolls with six 44px rows: shorter rows instead?
- The precinct: an Act I step or an optional place?
- Switching from the `harborShift` prototype to the harbor zones.
- Glide review questions (beach district Old Quarter vs new Shore; Neon Market/Old Quarter in the glide; Metro
  hall level, second exit, depth; train doors fading aboard).

## Process notes

- Tommi wants UI that explains itself before he is asked to review it; screenshots of the built editor first.
- Simple engineering tasks on Sonnet, design and engine work on Opus.
- Deploy = fast-forward `main` and `production` to the branch (`git push origin HEAD:main HEAD:production`), only
  when Tommi has said to; check-opening-from-data forbids story words such as "turnstile" in `runtime/game.ts`.
