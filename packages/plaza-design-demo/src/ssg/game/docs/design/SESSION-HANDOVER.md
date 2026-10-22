# Session hand-over, 2026-10-22

Working notes for the next session: what is in flight, what was found, what to do next. Priorities stay in
[ROADMAP.md](../../ROADMAP.md); step status in [SEAMLESS-WORLD.md](./SEAMLESS-WORLD.md) (Status). Delete this file
once its items are done or moved.

Branch `claude/happy-euler-oxkna1` = `main` = `production` at `fba1cfd` (deployed), plus the title-glide
performance commits merged after it (not yet deployed).

## Open from Tommi's play-test of `?play=harbor-station` (2026-10-22)

Content (harbor zones in `scenes/authored.json`; an agent was working on these at hand-over, branch
`worktree-agent-a451357d160c76337` if it was pushed, else redo):

1. The player has no proper walk cycle in the harbor profile (dockworker look).
2. Stairs: ↓ at the station stair makes the player glide along the floor to the stair's right edge, then pop
   down: the stair's level link (`run * facing`, foot/top) does not match its drawing for a stair rising west.
3. Station redesign: the player must walk right (east) first along the platform; stairs and lift at the
   platform's east end; then east on the quay to the checkout (station↔quay seam offset changes).
4. Turnstile: the player passes between two barriers, one in front and one behind (`drawNear` in the
   over-player slot).
5. Talking to the supervisor jumps the clock: the zones' story clock pins on `shift.*`; let time run instead.
6. Shed: the staff-room stair runs across the wages NOTICE; the coffee note covers the STAFF sign. No sign
   under a flight or over another sign, in all five zones.

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
