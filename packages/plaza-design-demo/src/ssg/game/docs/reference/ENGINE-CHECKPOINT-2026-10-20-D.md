# Checkpoint D: source-owned procedural picture inputs

2026-10-20. Goal remains ACTIVE; this is a bounded integration checkpoint, not final G0-G13 acceptance.

Verified game source: `sha256:55ba9a26bd958a15be6df6146568aa24802a6d8ed08c6ced86b33c866ee080d4`.
Local package: `app-QESYVUBW.js`, `play-QHCY6LF6.js`, `play-f8bc853f999921e2.html`.
97 documents / 128 source references. TypeScript and both builds pass.

## Delivered

- Yard and Downtown camera inputs are typed source references. Downtown camera and world billboard share the same feed predicate.
- Moth and Beach pictures read typed state, comparison values and clocks.
- Yard cargo places, geometry, gate query, slide deadline and hook easing are source-owned. A rebound tray can replace the former artwork and still provide the real elevated pickup target.
- Downtown controlled indicators, gate/lock/scanner, trace and sign pulses use typed bindings.
- Laundromat washer indicators, breaker, door/waiting queries, schedule clock, deadline progress and picture geometry are typed. Progress reads the executing shared deadline; no second timer or saved state.
- Sandbox picture fields have typed state, pulse, clock, network, device-freeze, sector, trace, guard and event bindings. The native model remains authoritative. Removing these optional bindings cannot restore original state names.
- Market uses the shared scene presentation flag roles. Its former end-wall may be removed after reattaching its exit marker; real geometry dependencies still validate.
- Removed renderer-only fixed state requirements from migrated scenes. Procedural art implementations and their default output remain intact.

## Evidence

All commands below run in `packages/plaza-design-demo`.

| Command / artifact | Observed result |
| --- | --- |
| `check-camera-bindings-source.mts` | Typed state/scale/feed/endpoint, real native panels and source transactions; integrated evidence `camera-bindings-source-Rv9BJL` |
| `check-visual-controller-source.mts` | `visual-controller-source-MOhueR`: 120 original snapshots; typed state/clock/values, optional removal, protected Save/fresh shipping/Undo |
| `check-yard-controller-source.mts` | `yard-controller-source-moaari`: typed slots/places/geometry/deadline/easing, real event progress and raised pickup target, source transactions |
| `check-downtown-visual-source.mts` | `downtown-visual-source-4C1rXK`: common camera/world feed, real trace/pulse, native drawing change, source transactions |
| `check-market-editable.mts` | `market-editable/run-iSFwKV`: actors/ordinary content, typed visual flag, real reference-preserving end-wall removal, protected Save/fresh shipping/Undo |
| `check-laundry-sandbox-picture-source.mts` | `laundry-sandbox-picture-source-C7Hykt`: actual typed controls, common model/query/deadline, native environments, invalid-reference atomicity, optional disable, bundle/Save/fresh shipping/byte Undo |
| `check-sandbox-ordinary.mts` | 109 immutable ordinary interaction and pulse/pause cases match |
| `check-laundromat-deadlines.mts` | 2592 immutable cases and 28 exact timelines match |
| `check-laundromat-breaker-workflow.mts` | 24 immutable real-model/session cases match |
| `check-scene-batch.mts` | Three pending native factories, typed purchase/state edits, dangling-reference rejection, bundle/history and grouped protected Save/reload/Undo |
| Browser raster | `.scene-system/all-game-pixel-check/evidence/55ba9a26bd958a15be6df6146568aa24802a6d8ed08c6ced86b33c866ee080d4-1792448667168.json`: all 173 rows independently checked, zero differing pixels/max delta/errors |
| Packaged editor native Play | `.scene-system/evidence/editor-native-play-55ba9a26-20261020.json`: all 19 real frames start with matching scene status and visible native terminal, then Stop. No warning/error logs |

Earlier 50dca405 raster evidence belongs to the earlier partial batch. Never relabel it as this source.
The prior tab referencing a removed Play HTML file produced a 404 after a rebuild; a fresh current-package tab loaded the current app and completed all19 checks. No release-cache redesign inferred from this local stale tab.

## Remaining acceptance

These results close specific authoring holes. They do not sign full controller/world/network/lifecycle/persistence acceptance. Finish the all19 coverage matrix, audit remaining native geometry/content dependencies (including Sandbox station/window/reset geometry), reconcile the inventory and removal ledger, and verify final current-format save and lifecycle cases. No old-save-format compatibility is introduced.
