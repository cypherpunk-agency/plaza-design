# Session handover, 2026-10-23

**Sequence unification complete; publication authorized (2026-10-23).** Title, Opening glide,
Act I cinematic, Act II cinematic and Taxi flight are single composition documents containing
`sequence` timing controls. Separate timeline sources and the three sequence adapters are removed.
`runtime/prepare-frame.ts` prepares the normal frame; `renderWorldFrame` remains the sole renderer.
Normal editor preview captures actual painted scopes for source-owned selection and drag geometry.
Objects can be edited in the sequence preview; world objects edit their actual scene/backdrop,
inline cinematic objects edit the sequence composition. Catalogue projections update during drag.

Verified real browser click/inspector edit/undo/pointer drag; history/bundle/protected Save/fresh
native reload of scenery and timing; 128/128 canonical paint samples unchanged and 84/84 actual
Canvas2D lifecycle comparisons. Focused checks, package TypeScript and homepage/design builds pass.
The source-inspector temporary rename check passed outside the Windows sandbox after sandbox EPERM.
ROADMAP.md owns priorities. C3 remains incomplete; this work does not close its asset-portability audit.

Prior C1/C2 work was published to main and production at `c14a9d9`, with successful deployments.
The local prologue review guide and Escape-to-skip opening change are also present.

The dated notes below describe intermediate states and are superseded by this completion note.

Cleanup audit: removed the unused platform-stop role and marker from Galleria/Harbor; station
canopy and departure bindings no longer require it. Arrival-marker coordinates are unchanged.
Station/binding/artwork/physical-source checks, package tsc and homepage build pass. The focused
C1 native/editor/seek/pause/resize raster check was refreshed and passes 84/84.

Latest visual state: **20/24 exact** after recording the user's approvals and requested seated
pose/gull corrections. Remaining review is only Train, Galleria Station, Harbor Station and
Tower (missing reference). The user's earlier approval does not automatically cover later
transport edits; those three current frames remain unaccepted. The six-case saved-source/native
reload matrix passes. The disposable verification servers were stopped after capture.

Native saved-source/reload matrix now passes **6/6**: Downtown, Galleria, Harbor, moving,
siding with safety-locked doors, and siding with released doors. The editor moved the actual
east door 12 units, protected Save wrote a temporary source tree, and a new source store
reloaded it before native Play. Each opaque Play realm checkpointed through the shipping
reload event and was destroyed/recreated with its current private save. Tests verified the
edited doorway, vehicle-relative continuity across zone origins, station alight/reboard,
moving/locked refusal, and the siding introduction after alighting. Shipping saves were untouched.
This caught and fixed a real defect: shared mover checkpoints previously dropped conditional
paths and restarted a moving train at its departure station. Checkpoints now store an address
to the chosen leg in current source, retaining remaining authored steps and siding halt identity;
no executable steps or old-format decoder are stored. Actual-source checks verify position,
phase, doors and subsequent motion for running, siding and siding-open restores. Route-wide
visual acceptance remains open; the reload matrix does not close that gate.

Current follow-up: legacy Game.enterTrain/stepOut actions are removed; source engine markers
remain, with valid destinations and no old BOARD/OUT action. One-time station/siding narrative
uses introOnFoot, and goal-door pings read actual vehicle frames. Source/physical/siding/story
checks pass. Frozen editor inspection now receives source-local world vehicle placements and
presence queries, including joined models. Prepared state/visibility is retained for selection
bounds. Focused inspection checks verify default placement, pending seam shift and service
visibility. Unused timetableVehicle/sceneFlowTime helpers are removed; passenger, train,
station-session and original prologue commute checks pass. The six-case native reload matrix now passes (above); route-wide visual acceptance remains open. Older progress notes below describe earlier states.

Visual review feedback (2026-10-23): Tommi accepts appearance/seed-only people-kit changes,
vehicle-kit improvements, updated Sandbox/hacking terminology, Yard improvements and the
corresponding night/rain variants. Specific exceptions remain open: Warehouse/Library sitters
must read as seated; investigate the Shop's two similar changed people and Mall seats/vehicle/
upper-floor people; prefer the original Galleria COMPLIANCE IS COMFORT sign and original gulls
in Harbor/Beach. Stacks, Harbor Station and Harbor otherwise accepted. Tower was a captured
view with no reference, not an additional reference image. Do not blanket-accept unresolved
exceptions or later transport changes. Pose inspection confirmed Warehouse mender and
Library student/kid were still act=sit but selected sitFront. Source sitView=side now makes
those three visibly seated; fresh actual-renderer captures verify the change. Shop and Mall
actor source comparison against the reference revision found no changes to seed, bakeSeed,
look, act, ps, dim, parallax, depth, seated or sitView; their human differences come from the
people-kit renderer. Mall's hovering drone changed with the robot kit. The station slogan
screen now uses the preferred original layout in the shared station art library. Beach/Harbor
far flocks now select their preferred white/grey silhouettes from the shared flock primitive;
close-up/robot gull artwork is unchanged. Fresh renderer captures verify the seated overrides and restored sign. Beach day/night
remaining difference bounds now start at y232 or lower: the gull/sky region matches the original
reference exactly. Harbor uses the original grey-wing drawing and its original flock positions.
The shared flock exposes explicit drawing style, vertical sway and screen wrapping; no close-up
or robot gull frames were changed. User feedback fixes are source edits, not new historical
fixtures. Shop/Mall source appearance fields are unchanged from the reference revision; Mall
floor-17 is the drone now rendered with the robot kit.
Accepted exact reviewed references were updated for Laundromat, Stacks, Harbor Station,
Sandbox, Yard, Downtown night/rain and Sandbox hacking/reduced-motion. Shop/Mall, scenes
with gull corrections, and later transport changes were not blanket-accepted.


- C1 lifecycle/light code is implemented; current intro raster checks pass 84/84. Broader visual
  acceptance remains open: stored scene comparisons give 2/24 exact matches, including a missing
  Tower reference and Metro's obsolete design. Tommi subsequently accepted the shown Metro,
  Downtown and Train comparisons (2026-10-23). Their reference images now contain exactly those
  reviewed captures. The remaining 18 recorded mismatches and missing Tower reference still need
  investigation; the saved 2/24 result predates these approvals and is not a fresh test result.
  Subsequent transport edits are not covered by that visual approval.
- The actual `train` composition now owns `cab-frame` / vehicle `line0`, driven by the original
  TRAIN-0 car/doors movers. Original artwork, regulars, devices and exit prompts follow it. The
  source has no stationary floor copy: vehicle-only levels arrive through the existing moving
  floor and attachment rules. Straight route projection is exact rather than sample-grid based.
- The route joins the actual `metro-siding` source through `line0-siding`. At route parameter 5350
  the frame is at siding-local -700: the original east door meets the ledge at x80, while the
  existing stairs remain beyond the car. Train fill is bounded to its footprint instead of erasing
  the adjoining scene. The ledge's ordinary stair/service-door exit leads to the existing Harbor.
- `train-physical-source` checks real shipping sources: pass refusal, safety cable, brake snap,
  continuous carry/alighting, moving art/regulars/prompts and current attachment restore. Opaque
  native private Play also confirms E changes car floor to ledge floor without moving x80/y0,
  retaining the same train and open doors. Camera extent and first-frame residency include the
  occupied car, so private starts at a distant berth do not become stranded in the owner zone.
- Private Play spawn is now Game.start's optional third argument, a source-local arrival point;
  it does not mutate SceneDef or disappear when the scene binds its pending world. The original
  legacy exit prompt is suppressed where a shared berth owns physical alighting.
- Seven focused source/commute/vehicle/private-start/storage checks and package TypeScript pass.
  Native browser evidence is disposable under `.game-test-output/c2-browser/`. Use a fresh image
  filename when re-viewing updated captures; an earlier image preview was stale, while fresh PNG
  pixels confirm the player is visible. The native browser uses only its own disposable profile.

- Galleria and old Harbor now have ordinary platform floors and shared route berths. Their old
  platform train drawing and BOARD action are removed. Actual-source checks pass the journey from
  Galleria to Harbor and skipping locked Harbor. Isolated native Play passes at both stations:
  E transfers car floor to station floor at unchanged x930/y0, retaining the same car/open doors.
- `siding-source` now edits the shipping Galleria berth/route through undo/redo, bundle transfer
  and protected source Save, then verifies native arrival follows the reloaded placement. Focused
  metro-source-save, metro-sessions, station-shared-ride, train-physical-source and siding-source
  checks pass. Opaque pending native Play also passes with Galleria's berth moved 150→180:
  car/door/player move by 30, and alighting/reboarding retain x960/y0. Harbor reboarding retains
  x930/y0. These focused checks are not a full-line browser/reload proof.

- Downtown now has a physical berth at x700 on `metro/floor-station`, joined by `metro-line0`.
  Native Play alights/reboards at x1480/y0 without moving or replacing the car. Ordinary gameplay
  presence queries select the prologue service before `opening:home` and the regular line after
  that handoff (or direct free inspection). One query gates physical frames and inherited artwork
  visibility; typed controls and source reference validation use that contract. Foreground drawing
  receives its own host model. Actual-source P14/station/presence checks, the original seamless
  commute, package TypeScript and the homepage build pass. Prologue narrative, full-line native
  reload and old transport helper removal remain open.

- All three regular stations now have model-owned passenger flows in the train composition.
  Actual-source checks verify boarding, stable keys/look/phase, alighting and current-save restore
  for Downtown, Galleria and Harbor. Queue and exit coordinates are local to their source berths;
  the existing vehicle-zone placements project them into the train owner's world. Existing rider
  artwork/recipes are reused and named actors stay in place. Nine ordinary car seat positions use
  the former bench slots, excluding named passengers' places. No second crowd scheduler is added.
- Removed 25 old queue/crowd actor instances, both legacy presentation controllers, their editor
  modes and the unused platform-flow timing helper. Typed passenger controls expose rider kind,
  phase and size. Focused people-flow, actual train, seamless commute, vehicle authoring/service,
  actor entity and binding checks pass, as do source Save, TypeScript and the build. Current native
  Galleria alighting/reboarding passes. One initial native observation read was too early for the
  private Play state broadcast; waiting for the next broadcast confirmed the unchanged transfer.

Still open: full editor/pending native Play/save/reload acceptance for the migrated line,
visual/behavior preservation and remaining legacy clock/transport-cut removal
(including the now-unused siding cut fallback).
The current route is an intermediate source migration, not completion of the whole metro network.
C1 visual preservation still needs resolution. Do not publish or mark the goal complete.

Current priorities: [ROADMAP.md](../../ROADMAP.md). The implementation batch is on main at `7e10e9a`.
The subsequent code audit found open animation-lifecycle, transport and asset extraction work;
the roadmap owns C1–C4 and their completion conditions. Do not equate one frame renderer with
complete animation ownership or every registered piece being independently reusable.
The current goal is **complete C1 and C2**; prior local C3 work remains in the worktree. The prior four-step implementation is on main;
the C1–C3 batch below is local and unfinished. Do not publish or declare completion from these notes.

## Active C1–C3 batch

- C1 code is implemented: existing playback advances packet state, painting consumes recorded
  commands, editor seeking reconstructs separately. Removed unused `citySkyline` and
  `metro.skyline-part`; providers/title/taxi consume explicit lighting.
  Skyline painting now rejects an unprepared viewport instead of creating/resetting packet layout.
  The existing owner prepares viewport changes before its tick. Time-zero and 600-tick replay,
  backward/live timeline seek, resuming after seek, pause/read-only preparation and resize checks pass.
  The obsolete paint-time step field and unused initial-snapshot constructor option are gone.
  An isolated rebuilt-game intro completed into Capsule with no captured warning/error logs.
  Current native tick versus actual editor seek/paused-paint Canvas2D output is now 84/84 exact
  across 640×360 and 1024×576, scales 1/2/3, five sample times, reduced motion on/off, canvas
  resizing and seek/resume. `pnpm test:game:visuals --intro-only`
  is the focused repeatable check; it writes no expected images. Both comparison canvases use
  willReadFrequently so Chromium's readback-induced GPU/CPU switch cannot create false gradient
  differences. The broader stored scene-image drift below remains unresolved.
  The suspected scale-sensitive gradient preparation discrepancy did not reproduce. Shipping
  can prepare on a context left scaled by its previous frame while the editor starts afresh;
  those actual paths still match at every checked scale. No gradient implementation change was needed.
- C2 attachment foundation is implemented; the real network has not been migrated. Tommi confirmed
  on 2026-10-23: keep existing journey/P14 timing, align station timing, and show a delay on station
  signs when the puzzle brake stops the train. Platform/onboard views share the actual train state;
  no fleet-management feature or second scheduler. The timing question is resolved; continue migration.
  Vehicle-attached manifest devices now project live composition anchors into model spots and
  interaction prompts, including descending cars and current mover reload. Actual pending cab-panel
  position/letter edits were verified in private native Play. The projection is now
  moving-manifest-geometry.ts: devices, uses, readables and rests share the same resolver and
  existing Circuit motion. Native prompt standing floors derive from the actual consist deck;
  using response text height could wrongly select a stationary floor above a descending car.
  Queries preserve source/model state, grouped IDs do not collide, and current mover reload
  restores geometry. Vehicle-lab has an attached route map and announcement speaker. Actual
  pending X/text edits survive private Play, E opens the route text, and the ordinary speaker
  responds in the caption lane. History/bundle/protected Save/native reload checks pass.
  CUA programmatic fill did not commit change-only inputs; native typed input followed by Tab
  did. This was an automation issue, not an editor persistence defect. Cross-zone interaction
  ownership and the actual legacy network migration remain; no new motion/save owner was added.
  Visible joined hosts now get the same seam/camera mapping as their artwork, with owner-local
  player coordinates for caption avoidance. Previously only the active host received that mapping.
  `joined-host-projection`, `moving-interactions` and `moving-device-geometry` pass (3/3), package
  tsc and homepage build pass. Ordinary attached uses/readables/rests now retain their source owner
  through native E/tap targets, permission/price queries and runUse. Foreign popup actions keep that
  owner; conversation/popup input and communication coverage use its existing host. A stationary
  source interaction cannot be invoked through the moving-target route. Focused joined-interaction
  checks include colliding IDs, actual native E, owner permissions/prices, captions, popup callbacks,
  movement locks and departure. Moving menus now follow live device spots or pure ordinary use/rest
  anchor queries via the existing host follow. Relative walk-away detection preserves menus while
  riding together; walking away or source removal closes them. Actual host pick/choose/follow and
  native use/rest menu wiring checks pass without advancing gameplay during UI reads.
  Native Game.crossInto now retains the vehicle owner UI while riding out of its source zone;
  ordinary scene/on-foot departures retain close-on-leave. The existing seamless-commute check
  now calls actual Game.crossInto through all four tunnels, instead of copying its rebasing
  calculations, and still checks boarding/alighting, passengers and current-format ride reload.
  Attached device E/pointer targets and hack-vision taps now resolve their actual source host.
  Riding selects its train controls; an existing local popup retains input priority and lifts
  retain their prior ownership. Terminal context/shell reads that same model. Shared rendering
  selects joined-owner hack vision world/device passes; ordinary joined drawing stays unchanged.
  Focused native method/pass tests cover this, but isolated browser verification of the combined
  device/hacking path still remains. Resident model player inputs now use owner-local seam
  coordinates; building tags are restricted to the actual floor owner and departed hosts are
  cleared. `check-joined-player-zones.mts` proves actual native sensor crossings in both axes,
  building separation, stair behavior and read-only projection. Six related focused checks and
  package tsc pass. The Chrome connector is blocked by an already-used profile; do not stop that
  browser or call this browser-verified. Disposable `.game-test-output/joined-device-review.mts`
  uses the actual isolated Play frame and Harbor commute with an attached panel; its full pending
  registry and fixture validation passes. This is not completion of C2 or the old network migration.
  P14's actual source now passes a focused shared-vehicle integration check: unpaid position signals
  are refused, paid signals brake the carried floor at the siding, the default safety cable prevents
  alighting, rewiring opens the door/unlocks Harbor, and shared attachment reload honors the current
  train checkpoint policy. `check-train-shared-vehicle.mts` uses a small physical track fixture, not
  the final authored route. No replacement brake calculation or second simulation was added.
  SEAMLESS-WORLD's obsolete separate station scheduler/boarding swap text is corrected to the user's
  single-vehicle direction. Actual route/art/sign migration is still outstanding.
  Train shared-vehicle/ride/paid-brake Save/position Save checks pass (4/4). The shared check also
  verifies that a source door-duration change affects native physical alighting timing. These
  checks do not certify the unperformed browser pass or full authored-route migration.
- C3: Seven train fittings are now independent: ceiling light, advert/tell, car plate, Registry screen,
  handrail and strap. Their native source uses scalar bindings instead of train.frame. Removed old
  room-factory methods, copied advert arrays and the unused handrail artwork role/requirement.
  Geometry/scrolling/swing/native binding and strict page checks pass; independent authoring covers
  399 types and all 625 reusable placement contracts pass. The new family has no dedicated browser
  verification yet. A stale positive Drink artwork role check was replaced with normal props.drink
  movement/Save plus rejection of the retired role; the dedicated drink kernel check remains.
  Source-owned `environment.sky-traffic` replaces automatic scene/editor fleets with typed,
  validated ship configuration. All actual sky scenes and affected proposals contain source rows.
  Terminal/Sandbox snapshot-copy classes are removed. The stale manual embedded-component list
  is removed; signage selection stores types and derives actual usage references from compositions.
  There are 625 reusable contracts, 231 context entries and 27 helpers. Focused contract checks
  pass for all reusable entries; the 231 context entries have not been certified portable. Finish
  their dependency/extraction audit. Reviewed Warehouse/Library/Market/Moth/Capsule/Laundromat/landmark
  families have 125 independently authorable types checked across another native scene, history,
  bundle, protected Save and native painting. Isolated browser previews show all 126 sampled
  pieces including sky traffic; no scene/controller snapshot is supplied to those previews.
  Warehouse label's default now says WAREHOUSE; both shipping labels already have explicit text.
  Whole-frame/parent-relative pieces retain context. Backdrop-only preview uses only authored
  content: the glide backdrop has no fleet, while an added fleet paints once through the shared
  sky pass. Isolated asset preview also runs that phase. Sky art is restricted to distance;
  ordinary Add chooses distance and unsupported layer edits reject atomically.
  Shop source now uses one `furniture.shelf`, one `furniture.strip-light` and one
  `shop.upstairs-room` type instead of 14 numbered registrations; each variation is a property.
  All original IDs/positions/order stay intact. Old registrations and unused array/shelf/tube
  drawing wrappers are removed without aliases. Shelf/room commands and failing-light timing
  are checked against current primitive contracts.
  Unused Shop people/keeper/outside drawing wrappers and their empty actor input arrays are gone;
  source-bound registered character artwork remains the actual actor rendering path.
  The broader fitting audit now checks 399 types across another native scene, including Downtown,
  Shop, Beach, Harbor, Metro, Yard, Mall, Sandbox, Station and Dockwork. QA rack/spool cable drawing
  is separated into attached pieces with explicit cross-device endpoints; body placement, connected
  state, exact cable endpoints and source paint order are checked. No drawing algorithm changed.
  The emergency brake uses a shared electronics kernel with standalone pulled/highlight controls;
  native P14 versus standalone commands/culling match across four phases, hover and camera positions.
  Terminal/Harbor-shift fittings are covered too. The expanded isolated browser run renders 361/361
  sampled canvases with nonzero alpha and no captured warning/errors, without source-scene context.
  Live device projection uses selection in the existing composition resolver so unrelated scenery
  is not prepared on each interaction query. Ancestor resolution and strict full binding validation
  remain the same; no cache, timer or second transform implementation was added.
  Six additional train fittings (camera, pole, window frame, staff door, seat back/front) now
  have independent scalar geometry and shared kernels. Their six isolated browser previews pass;
  direct native/standalone command comparisons cover dimensions, height offsets and culling.
  Current tests: 399 cross-scene authoring types; 625 reusable / 231 context / 27 helper entries.
  C3 library preview controls are now implemented: Properties/Visual state reuse the existing
  scene inspector fieldInput widgets and createAssetPreview renderer. Overrides are local to the
  selected inspection, strictly validated, resettable and never passed into a scene-usage preview
  or Add/Save/gameplay. Raw JSON inputs are collapsed under Advanced inputs. Actual browser brake
  checkboxes/reset/usage isolation pass with Published snapshot and disabled Undo intact.
  asset-preview-state checks actual draw changes, invalid types/unknown fields and repeatable reset.
  SALT's five bar layers now expose independent width properties, while their existing native
  shared-width bindings still resize the whole bar from its controlling source. Unused inputs
  were pruned. The mixer and jukebox are independently placeable. The drink is now `props.drink`,
  replacing the existing marker at its stool attachment and following the same native freeDrink
  and visibility conditions. Its exact source pixels/position are checked; the mixer no longer
  draws it. Old drinkX/drinkH stage values, all their bindings and the unused drink geometry role
  are removed. Eight new default isolated browser previews pass. The authoring workflow now edits
  typed numeric/select/boolean/color values too, asserting those values survive native compilation.
  Fifteen further local station/Market fittings, Mall reflection patches, the QA trace meter
  and beach stairs are independently authorable. All fifteen isolated browser previews render;
  station bounds include mounting rods and ground spans. ARTWORK-ROLE-AUTHORING.md records grouped
  retained dependencies and remaining extraction candidates. C3 is still partial; do not
  certify every remaining context intrinsic.
  Harbor hut rear/front now have independent dimensions, geometry and anchors. Their former
  whole-Harbor snapshot bindings are removed; the native front uses only scalar scene values
  linked to rear width/height. Native/standalone command comparisons cover three sizes/cameras,
  and both isolated browser previews render. Counts are now 625 reusable / 231 context / 27 helpers,
  with 399 cross-scene authoring workflows checked. No hut drawing algorithm was replaced.
  The laundry schedule now uses the independent wash-schedule kernel. It paints no cable by
  default; explicit cableConnected/cableTo inputs retain the existing native connection to washer 1
  through scene values. Body/cable/hover paint order and endpoint coordinates are unchanged.
  Unused schedule visual bindings, the room-factory schedule function and clock layout field
  are removed. Three actual library previews render without source context; focused checks
  cover countdown/hover/culling, cable bounds and pending native washer movement. Binding-key
  validation was stale for underground Metro's removed canopy; it now corrupts an actual station
  binding. All five related checks, package TypeScript and the homepage build pass.
- New tests: `animation-ownership`, `asset-placement-contracts`, `sky-traffic-authoring`,
  `independent-art-authoring`. The sky
  workflow checks history, bundle, protected Save and native source drawing, including duplicate
  placement and removal of the hidden default fleet. Related sequence/light/layer/frame/signage
  checks, TypeScript and both builds passed.
- **Pixel acceptance is open.** Existing browser visuals are 2/24 exact; Tower reference is
  missing on disk. Metro reference is the old raised station, and Shop has different character appearance
  already observed before its extraction; the 2,337-pixel mismatch count/bounds remain unchanged.
  No references were replaced. Investigate reference drift
  versus actual regressions; do not treat this as preservation proof.
- User's 4252 editor was not reloaded. Browser diagnostic on a separate loopback port only.
  Disposable results are in `.game-test-output`; no historical engine copy was created.

## Published M3 implementation

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
