# Session handover, 2026-10-23

Current priorities: [ROADMAP.md](../../ROADMAP.md). This batch is prepared for the requested main push.
The user's current request was to implement the four next steps: service creation presets,
curve/drop demo, live passenger flow, and Downtown/Metro plus the Harbor commute.

## Current implementation

- Game, editor, title, cutscenes and taxi share `renderWorldFrame`. The old opening drawing
  wrappers are removed. The glide uses ordinary authored zones and one coast backdrop.
- Harbor is five connected playable zones, with the shift on the shared `shift.*` state owner.
  The former one-room prototype and superseded harbor proposals are removed. Before assignment
  the clock holds 19:00; the shift runs at 3× to 06:10 and checkout pins day 2.
- New scene → Preset creates an empty scene, working two-car shuttle, or shell-only curve/drop
  cart as ordinary composition/scene/gameplay/device documents. Test District has direct Vehicles
  and Curves & drops shortcuts. Consist editing, seats, linked furniture, gangways and route tools
  use the existing level step and Circuit movers. Lifts share the vehicle attachment and floors.
- Live `character.flow` passengers approach, queue, board actual open doors, use available seats,
  ride, alight and leave with the same identity. SceneModel owns their bounded transient memory;
  reload memory expires after 60 seconds away. Painting and bounds only read prepared pictures.
  The Passenger inspector edits vehicle/berths, interval/seed/speed, waypoints and queue spacing.
- The Downtown Metro source now paints the underground hall/platform, rather than its previous
  raised platform. Its west stairs join the real Downtown street at 150 units above the platform.
  The opening verification is a `level.barrier` phase rule. Existing arrival anchors remain for
  other routes, with physical traversal handled by the seam and vehicle doors.
- The Harbor service travels west through four ordinary authored tunnel zones to Metro. The
  Circuit owner stays resident while a route zone is active; geometry placements are independent
  of scene-host residency. The ordinary floating origin carries the rider without drift.
- Fresh campaign start now lands at Harbor. The glide's closing shot blends into playable framing
  and its old black fade is removed. Prologue/home personas use the shared person kit. Checkout's
  statement enables the morning commute through a shared boarding query. Metro, Downtown and home
  follow 06:10 checkout with 06:12, 06:14 and 06:20 beats. The existing rest/deletion beats remain.
  Harbor play profiles can now follow world routes; reopening a slot preserves its profile namespace.
- Vehicle saves retain flat named source-path phase/elapsed time and player-relative attachment.
  Restoring never executes saved path steps or re-fires a driven-door action. Ordinary non-vehicle
  mover checkpoint policy is unchanged. A mid-tunnel reload check preserves exact car/player position.
- Static authored-scene preview now validates/expands pending shared declarations, as native Play
  already did. Play fixtures can initialize opted-in shared owners without copying values under a
  scene owner. Harbor Station's `harbor-commute` fixture starts at a door after checkout for review.

## Boundaries and next work

This is the Harbor–Downtown vertical slice, not the whole metro network. Galleria, the former
HarborStation route and the P14 train retain their existing implementation until seamless steps
10–11 replace them. Their `platformQueue` / `trainCrowd` controllers have not been removed globally.
General live city routines and pedestrian routes through stairs remain future work. The new live
boarding source currently uses interval spawns; the other pure schedule helpers are not evidence
of completed integration. Choice-containing mover paths retain settled checkpoints.

Review framing, timing, atmosphere and editor comfort. The two-terminal service currently uses
460-frame dwells and 9-second runs; aligning the remaining network's cadence belongs with its
station migration. This pass does not redesign multi-district Act I, augmentation or later bodies.
Precinct required versus optional remains undecided.

## Verification and preview

Focused native-model checks cover presets, curve/drop motion, live identities/doors/seats,
short memory, mid-ride reload, all four tunnel crossings, exact carried position, alighting,
stairs to Downtown, real Game residency/render placement, and source rejection. Typed authoring
checks cover history, bundle, protected Save/undo/reload and native compilation. Current opening
workflow and shared-state fixtures are also checked. Package TypeScript, homepage and design-demo
builds passed. Vite reports its existing large-chunk warning.

Browser: public editor created a temporary working shuttle from the preset, launched native Play,
showed its open-door boarding prompt and returned to Published snapshot after Stop/Undo. Static
Harbor preview no longer reports missing shared state. An isolated native Harbor morning-commute
fixture boarded the real service and reached Metro through all four tunnels, preserving the player's
64-unit position within the car (within floating-point rounding). Underground Metro renders. Browser
alighting/stairs were not verified; the focused native-model checks cover them. No console errors
were observed on these previews. After explicit user authorization to replace the local test save,
the normal browser New Game check passed: the full glide reached Harbor Station at Day 1, 19:00,
with the first objective and arrival dialogue visible and no console errors.

A separate static preview runs at http://127.0.0.1:4283/ (editor: /editor/). The user's existing
4252 editor tab was not reloaded or altered. The user requested publication to main only.
