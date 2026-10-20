# G11: world and story source acceptance

2026-10-20. **PASS for G11**, as defined in ENGINE-CONSOLIDATION-GOAL.md.
This signs pending world/scene connections and existing story/cinematic handoffs. It does
not sign complete scene migration, controller authoring, campaign playthrough, lifecycle,
pixel preservation or the remaining gates. ALL-GAME-MIGRATION.json records only its world
column as PASS; the other columns retain their own acceptance requirements.

## Requirement-to-evidence audit

| G11 requirement | Current evidence |
| --- | --- |
| Pending scene documents drive exits and arrivals | `check-all-scene-world-routes.mts`: all19 source exit collections equal their compiled native collections, with no extra native-only routes. All41 authored exits dispatch through actual Game.useExit. All30 ordinary destinations/arrival points are changed in prospective source and observed in native dispatch. Every changed scene rejects a dangling arrival. Harbor Shift has no authored exit; its existing guided prototype is not given a new route. |
| Pending world documents drive map and transport | `check-city-source.mts`:26 original registries, all19 lookups,13,824 district cases,7,752 travel refusals, exact original traced plan and532 original map keyboard/pointer cases. Pending membership/arrival/name/line/fare edits and malformed references are covered. |
| Map/transport permissions agree with edited source | `check-world-access-policy.mts`: actual typed access-policy edits and native map/exit consumers, grouped source edits, history/bundle/protected Save and refusal behavior. Evidence `.scene-system/world-access-policy-equ7OJ`. |
| Travel consumes pending station/car/siding/taxi destinations | `check-transport-destinations.mts`: actual Game boarding, platform/siding exit, taxi completion, explicit arrivals and deliberate spawn arrivals. Ride updates and map riding state follow the pending car role. `check-platform-world-source.mts`: typed station routing, all three native platform presenters at four times, invalid membership rejection, history/bundle/Save/fresh shipping import/byte Undo. Evidence `.scene-system/platform-world-source-ALnyUs`. |
| Opening follows authored story and the same world roles | `check-opening-runtime.mts`:42 original Game controller/transcript/timing/paint comparisons, edited start/resume, wake/message/turnstile/sleep/clock boundaries and cancellation. `check-opening-phase-rules.mts` and `check-opening-source.mts`:64 original flag histories, typed phase CRUD/order and malformed/ref rejection. `check-opening-car-role.mts`: actual Game.enter follows three pending car scenes in home/free phases; the old train ID and duplicate source field have no special behavior. |
| Story targets follow scene source geometry | `check-opening-target-binding.mts`: pending anchor/rest resolves to native E target, nearest selection and guidance; exact original default502/46, elevated prompt, atomic relocation and missing/colliding reference rejection. |
| Existing cinematic documents reach native playback/handoffs | `check-cinematic-pending.mts`: pending title/cutscene/taxi duration/text/visual/handoff edits reach native playback; finish/skip/cancel and continuation boundaries, explicit same-scene arrivals, Composer history/bundles, protected Save/reload/byte Undo. Evidence `.scene-system/cinematic-pending/run-4Kp3jV`. |
| Shared event handoffs remain transactional and scoped | `check-gameplay-handoffs.mts`: real SceneTime1499/1500ms, pause/resume, failed commit isolation, repeat guards,100 clock-clear/reuse cycles and disposal cancellation. |
| New destinations and incompatible grouped imports validate atomically | Cinematic pending check creates a new scene/arrival plus city membership and cinematic handoff without TS registration. Dangling renamed arrivals reject; grouped corrected scene/cinematic references pass history/bundle/source validation. Opening source Save rejects missing references and restores exact bytes. Evidence `.scene-system/opening-story-save/run-nyWVED`. |

The scripts above were inspected for these assertions and run on the current worktree; their
PASS labels alone are not the basis of this signoff. They complement one another: route dispatch
does not prove cinematic timing, and a schema check does not prove actual native travel.

## Removed duplicated/default behavior

City source accepts the current explicit version2 format. The retired version1 upgrade that
inserted shipping train/taxi/harbor destinations is removed. Immutable old city fixtures remain
untouched and are used as behavior/geometry oracles; old source now rejects instead of upgrading.
This is source validation, not historical player-save migration.

The opening controller no longer has a second homeRun.scene field fixed to train. Game.enter
uses World TRANSPORT.boarding.scene, the same owner used by boarding, ride advancement and map
state. Opening's from/to stations, run timing, announcement and explicit narrative start/resume
destinations remain authored. The packaged Game opening editor points to the World boarding role.

## Source identity and preservation boundary

Runtime raster checkpoint:
`sha256:6b2f6bc28dc1f53a8428daad0d85d98855b9c85a6f405ba39ee6bfd46c60b9d3`.
Raw report:
`.scene-system/all-game-pixel-check/evidence/6b2f6bc28dc1f53a8428daad0d85d98855b9c85a6f405ba39ee6bfd46c60b9d3-1792477428122.json`.
All four result arrays equal the earlier published-source diagnostic. Original-baseline status
remains FAIL solely for the already recorded Mall animation frame; no baseline was replaced.
This is recorded under G12 and does not prevent acceptance of source routing under G11.

The G11 matrix/status/roadmap updates follow that runtime capture and change acceptance metadata,
not runtime sources. The all-scene route check writes its own current source fingerprint and raw
per-scene results under `.scene-system/world-story-routes-*/evidence.json`.
Final route/metadata checkpoint:
`sha256:9221a015e2657fc02adf5ea5334ae299920f576778bbe798a38d4d7b82ba5536`,
`.scene-system/world-story-routes-ogfjXS/evidence.json`.
Both root builds pass (app-XISW3PUU.js / play-5LJYJ2II.js;97 documents/128 source references).
No rendering/layer/object implementation was changed in this batch.
