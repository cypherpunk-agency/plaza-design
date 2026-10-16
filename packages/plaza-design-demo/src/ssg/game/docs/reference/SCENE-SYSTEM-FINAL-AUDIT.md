# Scene system final acceptance audit

2026-10-16. Final acceptance complete for S0-S7/G1-G8 in the isolated development checkout.
The authoritative scope is [SCENE-SYSTEM-PLAN](../../SCENE-SYSTEM-PLAN.md), S0-S7/G1-G8.
Evidence named below lives in the local `.scene-system/evidence` archive; earlier original
captures remain in the parent checkout's immutable archive. Shipping files are in the isolated
development checkout. Do not overwrite original references to make a comparison pass.

| Requirement | Evidence inspected | Current result |
| --- | --- | --- |
| Original scope and recoverable checkpoints | Original coverage inventory; `checkpoint.mts`; S0-S7 checkpoint archives | Original drawing owners inventoried; final working-source checkpoint retained |
| Artwork/library and controller separation | `audit-boundaries.mjs --strict` and `final-boundary-audit.json`; S7 shop retained-art proof | 73 original files, 565 owners mapped; zero unclassified drawing/controller-import/global-art-state findings; unused aggregate shop paths removed with 32 retained drawing bodies unchanged |
| Directory organization and stable interfaces | S3b move/symbol/body-equivalence ledgers; current MODULES/agent guidance | Scene packages under scenes; runtime/world/story/ui ownership documented; public ids and virtual paths preserved |
| All serializable source documents | `source-documents.ts`, `check-source-authoring.mts`, `check-world-map.mts` | 19 scene compositions, four sequence compositions, two timeline documents; prospective-set validation and invalid-reference rejection pass |
| Typed fields, bounds, anchors and hierarchy | `check-contracts.mts`, `check-static-bounds.mts`, `check-coastal-bounds.mts` | Structured snapshots, defaults, invalid properties/cycles, clips, inherited visibility/opacity, moving/native geometry and 1,701 coastal selections pass |
| Original scene/animation/map/prototype/taxi pixels | S7-final scene/native, sequences, map, prototype and taxi manifests, pinned bundle | 489 original scenes, 15,308 animation frames, eight map states, 32 prototype cases and 804 taxi frames match exactly |
| Image artifacts for every pixel case | Final scene/native capture indexes and final-link animation/map/prototype/flight indexes, each independently verified | All 17,130 final pairs have explicit before/after/diff references; Pillow decoding, expected RGBA hashes, actual byte comparisons, full coverage and final bundle 042fe760 pins pass |
| Actual game/editor rendering parity | `S7-final-scenes-and-native-editor.json`, `S7-clock-scoped-native-editor.json` | All 489 pairs match with native shadows/weather; clock-scope change separately replays all pairs |
| Explicit preview isolation | Light/weather context checks, `check-native-preview.mts`, source-save browser storage checks | Local light collectors isolated; weather/reporting climate restored; city clock now restores original save reference, pin and speed through nested failures; player storage unchanged |
| Static editor operations | S7-static-browser-operations and attachment-layer browser evidence | Eight required categories, pointer drag, numeric/property edits, catalog add/duplicate/delete, attachments/anchor offsets, pass/order, validation, import/export and exact undo/redo verified |
| Source Save and failure protection | Source-authoring and authoring-save checks; S7-direct-save-browser evidence | Actual Save/undo/save/reload and external conflict retain correct data; prospective grouped validation, atomic rollback/recovery, byte-exact journal undo and path/origin/session restrictions checked |
| General animated authoring and playback | `check-animated-authoring.mts`, `check-native-timeline.mts`, S7-new-timeline-browser-operations | Two temporary multi-shot sequences round-trip and run through actual renderer/playback; shared art, attached motion, clips/discrete states, text/fades, scrub/loop/steps/easing/reduced behavior verified; runtime skip/completion commits once, seeking commits nothing |
| Read-only map navigation and rules | World/map contracts and S6 browser evidence; original map parity | 19 scenes, 17 places, 37 callbacks and 14 invalid reference cases; real map selects scenes; geography/membership/travel topology remain read-only |
| Gameplay positions and compatibility | Source placement/identity tests, transport-marker checks, earlier save/body-equivalence ledgers | Physical authored markers feed native behavior; 540 default and 540 moved door cases plus 15 checkpoint/timing cases pass; destination identity retained |
| Documentation/build/cleanup | Updated README, CLAUDE, GAME-DATA, ART-GUIDE, MODULES, authoring README; both build commands | Documents reconciled; both builds pass after final clock-scope and unused shop-path cleanup |

The G4 audit corrections are complete: Harbor exposes supported controls with valid numeric
choices and nonnegative marker sizes; six Mall stools are independent attached instances.
Exact legacy paint/state checks and final scene/native images preserve appearance. Save rollback
also preserves concurrent external edits and retains recovery evidence rather than clobbering them.
Both final builds, type checking, source/behavior contracts and strict boundaries pass.

No required S0-S7 work remains. The final source checkpoint and evidence archive are local;
main's earlier working editor is preserved and no further publication occurred. S8-S13 are
future stretch milestones and do not affect this audit.
