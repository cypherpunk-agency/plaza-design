# Controller and network acceptance

2026-10-20. **G9 PASS** at implementation checkpoint `ddfd92a`, game source
`sha256:57dd859f7da0da1ae027c29f623b6f5d43b8c0f0d6329da072cbdce836d73e37`.
The subsequent ledger/matrix changes record acceptance rather than changing runtime code.
G9 covers registered controller/network contracts and their native behavior. It does not sign
all editor workflows, raster preservation or the whole goal.

## Reconciliation against the original inventory

`CONTROLLER-MIGRATION.json` retains its initial field lists as historical inventory. Its new
current acceptance mapping points here; those lists are not a current backlog. Each family below
has source-owned inputs, reference validation and typed controls feeding the existing runtime.
Ordinary outcomes use shared commands/conditions/events, rather than another evaluator.
Continuous simulation and procedural drawing remain the sole registered native primitives.

| Existing scenes / mechanic | Current ownership and evidence |
| --- | --- |
| Capsule thermal/boot/Pixel | controller state/device/tuning refs and notice parameters are typed in device settings; ordinary schedule, door, readiness/reboot replies, Pixel selection and goals are shared workflows. Current `check-capsule-source-workflows.mts`:1728 immutable histories. Typed Save/fresh import/cancellation receipts: capsule-router-online-save-cqmIMt, capsule-controller/run-EjZ2un and capsule-workflow-save-zbJ6qM. |
| Downtown DLV, gate, Registry and camera | typed motion endpoints/state/offset/speed/signal inputs; ordinary permissions/till/timers/denials/milestones/finale are shared source. Current motion-controller-source-Y0sXFi changes real signal and trajectory inputs. camera-bindings-source-l0jtIh changes real panel/loop inputs. Previous original Registry/DLV/till/source workflow proofs remain scoped in ORDINARY-CONTROLLER-CONSOLIDATION.md and their dedicated checks. The gate E policy is now a source query, not a callback. |
| Yard cargo, hatch and camera | typed cargo places/slots/geometry/deadline/easing and camera state/scale/parcel refs. Shared grab/drop/deadlines/rewards and camera commands. Current yard-controller-source-Yrb33c and camera-bindings-source-l0jtIh prove typed changes through native execution and saved imports;432 original grab cases plus14 hatch histories pass. The full grab/drop source Save receipt is yard-full-save-sHAgNB. |
| Stacks lift, return, watchdog and scope | typed phase durations/return/scanner/cargo refs and authored geometry; shared permissions, selection, alarm/rewards/watchdog outcomes and scope commands. Current motion-controller-source-Y0sXFi changes real lift/scan/return timing. Current watchdog check preserves480 original histories; camera-command-panels preserves actual scope reply/state/paint behavior. Scope action refs live in camera.actions. |
| Beach rental and danger | shared source intervals, costs, billing state, pause/refusal/danger outcomes; registered picture inputs consume typed state/value refs. Current512 original live histories preserve one-fire/overshoot, offscreen/pause/reload/disposal. Typed workflow Save and visual-controller-source-MOhueR cover native pending values, validation, bundle/Save/fresh import/Undo. |
| Laundromat washers, breaker and jacket | shared source deadlines, queue/query/guard/reset/reward logic and copied checkpoint commands; typed clock/washer/deadline/picture inputs. Current2592 original start/stop cases and28 exact timing timelines pass. laundry-sandbox-picture-source-qm3dvU proves changed native picture/query/deadline bindings and optional removal. Existing jacket576 and breaker24 histories, source Save receipts remain separately recorded. |
| Sandbox | resource operations,18-06 time policy and weather reactions are shared source; only cosmetic pulse stamping remains native. Its controller binds actual state/query/clock/network/guard/event/geometry inputs. Current laundry-sandbox-picture-source-qm3dvU and native-block-save/run-fcBMLa prove actual changed inputs, clock delivery, protected Save and Undo. Current night/environment parity is504 cases. |
| Metro, GalleriaStation, HarborStation, Train | one injected city/metro system owns timetable, route, platform/car/siding binding and live snapshots; source controls ride permissions, halt/door outcomes and wording. Current check-metro-sessions:11088 original platform cases and211200 ride frames, isolated sessions and pending routes/names reaching native platform/frame plus actual shared Train status/action. Platform/world protected Save evidence is independently accepted under G11. Train source controls have original permission/paid/live/status and typed Save evidence, including6052 position/boundary histories. |
| Harbor | crane/forklift movement and embedded/detached actor presentation remain source-configured procedural art. Shared actor roles/cues bind authored flags/events to it; no separate economic/security simulator was found. Motion/actor source checks and presentation-cue-crud-5Q7PHv prove typed event binding reaches actual Game presentation state and saved shipping imports. |
| Harbor Shift | source task commands/conversations/objectives/day/minute/flag-role bindings feed native trolley/carry art. No second physical carry state exists.2048 carry/objective/day/minute cases,768 picture snapshots and1100 original tutorial cases; typed changed dialogue/day/carry source and actual Game clock survive protected Save in shift-editable-save-5cRNld. |
| Library, Moth | native LINK/seal/clock/watchdog primitives use declared device sources. Shared observed-goal triggers replace scene ticks; readonly projections and cross-owner state reads add no saved copies. Native observation/source Save and state-read checks cover128 original observation histories, current reference rebinding, idempotence and source removal. Moth's native picture state/value/clock controls are covered by visual-controller-source-MOhueR. |
| Warehouse, Market, Shop, Mall | common actors, commerce, conversations and device engines; no additional independent gameplay controller was found. Mall adaptive storeys/escalators and attached actors remain typed composition art, not a hidden state machine. Source-backed actor/geometry/ordinary dependency proofs are recorded under G8 and the scene-specific editable checks. General device authoring works in every one of these scenes. |

## Cross-cutting requirements

| G9 requirement | Evidence and result |
| --- | --- |
| Finite registered adapters and validated parameters | engine/controllers schemas and renderers for Capsule, Stacks, Downtown, Moth, Beach, Yard, Laundromat and Sandbox; source metro/city, companion, presentation, actor and network contracts cover the other inventoried mechanics. Unknown refs/kinds, invalid durations, wrong state roles and dangling endpoints reject prospectively. |
| Editor controls affect native behavior | Current source transaction checks above mount the real typed controls, build the pending registry, observe native changes, round-trip bundles, protected Save and fresh shipping imports, then restore exact bytes. These are not JSON-registration-only checks. |
| Event and permission authority | Declared physical/guard native inputs have exact origins; only existing typed command sources authorize outcomes. check-native-inputs and the dedicated Yard/Stacks/Train/Registry workflows reject foreign/direct/manual/signal origins, nested work and failed commits; ordinary callbacks are removed. |
| Existing network routes and metadata | Current network-source-save/run-YtOxEP: pending LINK/global node/name/keyring/program/membership edits reach actual SceneModel, Game map/deck/connect consumers and inspector; known-node connection works without scanner; discovery/current connected state persists; bundle/history/protected Save/fresh imports/Undo. Current network forms support node/noun/cable/key/watchdog/program CRUD and atomic refusal. |
| Scanner and reach semantics | Current54 scanner model/Game/terminal/map cases pass, including explicitly disabled binding, source-bound acquisition and no filename fallback. Network source tests reject unknown ports/machines/networks/controlled labels and invalid program ownership; cyclic reach terminates. Existing local/far-machine boundaries are preserved; no new remote ability. |
| Native timed/logic/security blocks | native-block-save/run-fcBMLa adds CLOCK/toy/sequence seal through shared source, survives protected Save/reload/history/Undo/Redo, updates Events inspection, and delivers through the actual native clock plus150ms cable delay. Invalid timing rejects before write. Existing block schemas/forms and guard/seal tests cover the other registered templates. |
| Lifecycle and inactive policy | G5's accepted ownership inventory covers cached Game hosts, shared SceneTime, per-game metro, native panels and pure sampled presentation. Current Beach/Laundry/Camera checks additionally exercise pause/offscreen/reload/disposal. Native async work is owned by model/panel/Game lifetimes; scene visits do not replace the preserved inactive simulation policy. |
| Removal boundary | Current19-scene SceneRules inventory classifies49 callables with zero ordinary gaps. This is a supplemental removal check, not the basis of controller acceptance by itself. G13 retains the final whole-engine duplicate-path audit. |

CAM-3's camera.crates IDs deliberately address cam.zoom.<id> source lines. Its registered check
requires those lines before source can be accepted; new camera targets and their text can be
saved together. This validated primitive convention is not an untracked dialogue evaluator.
The camera renderer, fonts, palette, curves and collision/physics algorithms remain native code.

All19 devicesControllers matrix rows now PASS with the applicable family mapping above.
For scenes without an independent simulator, the shared device/actor contracts apply; no missing
controller is disguised as N/A. Complete Layout/Logic/Wiring/Play entity workflow acceptance is G10;
world routing is G11; final state/HUD/pixel/persistence preservation is G12. No campaign playthrough,
new remote mechanic, historic save-format adapter or new renderer is included.
