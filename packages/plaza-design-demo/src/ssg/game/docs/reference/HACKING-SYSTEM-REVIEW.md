# Hacking, wiring and network review

2026-10-17. Reviewed source revision `66cc8540641bdc90a7a4c1b5e65d7fc8a6818047`.
This is an assessment and discussion proposal, not a new gameplay specification.
Story, progression and systems remain open to redesign.

## Scope and evidence

Source inspection covered the scene registry and device documents, shared model/rules,
network reachability, terminal adapter, schematic/vision UI, scene hosts, save handling,
runtime loop and relevant reference/progression documents. Three small native-model probes
confirmed behavior described below. No campaign playthrough, browser interaction assessment,
render benchmark, production changes or regression-suite expansion was performed.

One-off probes are at repository-root `.scene-system/hacking-review-probes.mts` (ignored,
local investigation evidence). Run from the root:
`pnpm --filter plaza-design-demo exec tsx ../../.scene-system/hacking-review-probes.mts`.
These probes construct isolated models; they do not read or write player saves.

## Overall assessment

Keep the foundation. A machine exposes nouns; nouns accept verbs and emit events; a cable
turns an event into another noun's verb. This makes the environment programmable rather
than making hacking an unrelated puzzle screen. Timers, switches, schedules, guards and
watchdogs can combine into interesting machines without every scene inventing a new system.

The main weakness is the boundary between systems. Reachability, discovery, connected
schematics, permissions, trace, capability ownership and progression are distinct concepts,
but their rules are not consistently explicit or enforced through one operation boundary.
Adding many more noun kinds now would increase this ambiguity. Consolidate the existing
rules and feedback before expanding the vocabulary.

## What is implemented

| Layer | Current implementation | Assessment |
| --- | --- | --- |
| Physical interaction | Scene uses/items plus device everyday actions; device actions generally call the same model verbs as hacking | Good continuity between ordinary use and taking control; scene-specific uses remain a separate integration path |
| Device model | `data/types.ts`, `engine/model.ts`; SENSE, ACT, STORE, DAEMON, GUARD, LOG, LINK, CLOCK; generated SEAL/WATCH nouns | Roles are useful; several kinds are labels while GUARD/LINK/CLOCK have engine behavior |
| Rule execution | Ordered first-matching cases, sequential actions, conditions/time windows, scene-owned named effects | Good declarative core and escape hatch; custom effects still need explicit contracts |
| Wiring | Event endpoint to noun/verb; fan-out; replace matching endpoint pair; cuttable/default/fixed cables | An event bus rather than an electrical circuit or packet network; no wire capacity/energy simulation |
| Signal timing | Delivery after 150 ms; cable activity displayed for 500 ms; pausable delayed callbacks | Readable causal animation; queued work and feedback need observable semantics |
| Logic | `timer.so` starts owned; TIMER waits 1/2/3 s; Moth can grant `switch.so`; SWITCH gates a signal | Small, understandable vocabulary; not a general Boolean/dataflow language yet |
| Clues/access | Keyring fragments, joins/transforms/recipes, keys, password guards, key/guard/sequence/condition sectors | Rich puzzle vocabulary; teach these as separate concepts rather than presenting them together |
| Lock toys | Rings, cipher, cryptex, Morse | Engine supported; these are not currently four separately earned network programs |
| Security | Per-device trace/log wiring, per-guard and device lockouts, fixed-route watchdog freezes | Strong connection to rewiring; no implemented general adaptive city heat system |
| Network discovery | `net.json`, pure `reachNets`; port, network and controlled-node rules; known hosts without scan; `scan.so` for broader discovery | Sensible lightweight graph; not an actual distributed simulation |
| Interfaces | Physical popup, in-world hack vision, device schematic/board, terminal, network map | Reuses much of the model; too many simultaneous representations can overwhelm learners |
| Persistence | Scene state/cables/cuts/logic/access/trace/locks/clocks/watchdog plus global inventory/programs/controlled nodes | Substantial coverage; in-flight actions intentionally settle/reset rather than resume exactly |

Ten scene device files exist among 19 registered scenes. Counts below are authored devices,
before generated seal/watchdog nouns or player-placed logic. A node is board-only, not
necessarily a remotely network-reachable host: some appear through scene-specific effects.

| Scene | Devices | Nodes | Nouns | Initial cables | Main systems represented |
| --- | ---: | ---: | ---: | ---: | --- |
| Capsule | 7 | 1 | 17 | 1 | Domestic state, power/boot timing, known connection, routine |
| Downtown | 10 | 5 | 41 | 4 | Guards, sectors, trace/logs, network access/control, movement reward |
| Library | 3 | 3 | 16 | 0 | Local LAN, known hosts, guard/sector, scan reward |
| Yard | 3 | 1 | 9 | 0 | Physical machinery, events/actions, scene effects |
| Moth | 7 | 2 | 26 | 0 | Remote discovery chain, clocks, sequence seals, watchdog, switch reward |
| Laundromat | 7 | 1 | 14 | 7 | Schedule, shared machine state/resources, rewiring |
| Beach | 6 | 1 | 16 | 3 | Clock, sensor/action wiring, ordinary exchange |
| Stacks | 4 | 1 | 10 | 2 | Machinery, alarm wiring, watchdog/tamper restoration |
| Train | 1 | 1 | 5 | 1 | Route/control interactions and scene effects |
| Sandbox | 37 | 3 | 66 | 12 | Demonstration coverage of every authored noun kind and multiple security/network systems |

HarborShift deliberately teaches ordinary movement, interaction and carrying without exposing
the hacking UI. Other scene packages include world interactions without device documents.
This is implementation coverage, not evidence that the intended teaching order is playable.

## Findings and decisions

### 1. Device lockout is bypassed by password entry — correctness, high priority

`engine/model.ts:334` blocks manual `act` on a device-wide lock.
`guessAs` at line 606 checks a watchdog but not that device lock; `check` at line 617
checks only the guard-specific deadline. Fragment use also reaches `check` directly.
By contrast, `toyBlocked` at line 673 checks both deadlines. The terminal's login calls
`guess` through `scenes/downtown/shell.ts`, so these entry paths do not share the same rule.

Probe result: after trace reaches 100, the device has a 10,000 ms lockout; its ordinary
lamp verb is refused, but the correct password still adds the guard to `passed`.
This can execute guard actions/open sectors during the supposed device-wide exclusion.

Recommendation: one eligibility function used by manual verbs, guesses, fragment use and
toys, with explicit allowances for signals. Do not remove signal-based bypasses of sealed
controls indiscriminately: those may be intended puzzle solutions.

### 2. Discovered, connected and reachable need separate semantics — design/architecture

`engine/model.ts:936` treats every up, unsealed LINK in the scene model as an available
port, including connected nodes' LINKs. This is scene-level access, not a distance-based
physical jack/session. `join` at line 995 installs the remote node as a device. Subsequent
actions do not revalidate its path; restore reinstates connected nodes independently of
current reach. The net map also knows machines that the current scene cannot instantiate:
`nodeHere` limits board nodes to that scene's data or shared net nodes.

Probe result with actual Capsule data/rules: connect CONCIERGE with the router up, turn
off the plug, and CONCIERGE is no longer in `nodesHere()` but remains a device and remains
in the saved connected list. That is confirmed behavior, not necessarily an unwanted rule.

Recommendation: retain discovery, represent current reach explicitly, and decide whether
an established connection survives path loss. If it does, explain it as a durable foothold;
otherwise mark it offline and consistently gate use. This matters before Act III remote
presence. A global machine registry is also needed before the same remote machine can be
operated from arbitrary scenes: current device state/cables/trace live in each SceneModel.
A network map entry alone does not supply that shared simulation.

### 3. Signal cancellation and feedback limits are undefined — design/reliability

`emit` at line 386 captures matching links and schedules callbacks. Cutting one later
does not cancel its captured callback; changing its verb leaves the old delivery in flight.
The probe confirmed delivery after cutting the only link before 150 ms. Treating a signal
as already in transit is reasonable, but the player needs a consistent explanation.

`connect`/`addLogic` do not impose a global runtime work budget. UI prevents a direct
self-wire and wiring to a GUARD, but multi-device feedback and fan-out remain possible.
There is no general runtime callback/queue cap. The scoped authoring behavior lab has
cycle checks and 256-callback limits; the shipping engine does not share those protections.
This is a potential growth problem, not a measured slowdown in normal authored scenes.

Recommendation: specify in-flight delivery/cut/reset semantics, expose pending deliveries
in diagnostics, and introduce a bounded work policy that permits intentional timed loops.
Do not blanket-ban cycles: repeating circuits can be a valuable mechanic.

### 4. Scheduling has several authorities — architecture/performance risk

`runtime/game.ts:558` runs animation/update with a capped frame delta (about 50 ms).
Each lazy-created host separately runs a 250 ms interval (`engine/host.ts:241`), and
`SceneTime` schedules each delayed action using native timeouts. Scene time and wall
lockouts are intentionally different and must remain so.

Inactive hosted scenes skip their custom `rules.tick`, but their clocks/watchdogs/trace
can still tick while the game is running. Uninstantiated scenes do not. Global pause
stops scene time for all hosts. Hosts retain interval/pagehide registrations, with no
host disposal path; Game.stop pauses hosts rather than clearing these registrations.
This is not proof of an accumulating Game-instance leak, but visited-scene background
work and lifecycle ownership need measurement and an explicit world policy.

Under a long frame stall, movement/city time use the capped delta while puzzle deadlines
use elapsed scene time. Timed puzzles can therefore feel different under load. Preserve
this existing behavior in baseline measurements; consider changes separately as gameplay.

Recommendation: document active/visited/unvisited/offscreen semantics first; later give
schedulers explicit ownership/inspection/disposal. A unified scheduler may help, but a
whole-loop rewrite is not a prerequisite for a useful performance harness.

### 5. State changes can cause excessive UI/save work — confirmed paths, unmeasured cost

The host's `changed` hook redraws both schematic instances synchronously and schedules a
save. A visible `Schematic.render` (`engine/schematic.ts:602`) removes/recreates device
groups and rebuilds wire geometry; geometry reads include `getBoundingClientRect`.
Hidden schematics return immediately, and meter-only updates already exist: retain those
good shortcuts. Nested actions/emissions can still produce several full redraws per action.

Also, `model.labelOf` at line 368 calls `tokens(0)` even for a label with no token template.
The live token hook (`runtime/game.ts:261`) always calls `storeSave` and `syncHud`, including
for zero. Opening a popup can therefore serialize/write the whole player save once per
everyday label. This is a concrete unnecessary side effect; its duration is not measured.

Recommendation: separate balance reads from writes; count saves/redraws per operation.
If profiling confirms layout churn, batch invalidation and update affected elements while
preserving drag/focus and the exact rendered result. Do not attribute all slowness to Canvas.

### 6. Documentation overstates parts of the implemented system — documentation

`NET.md` still describes city heat, adaptive watchdogs and stricter city access without an
implemented general coupling in the reviewed model/runtime. Its future programs are
proposals: `net.json` currently defines only `scan.so`. Password/lock-toy support does not
mean `decrypt` is an earned program. `data/types.ts:394` says switch.so is unobtainable,
but `scenes/moth/devices.json:257` contains an install action giving it. The separate
`Save.jump`, modules, programs and uplink keyring chip are several capability representations.

Recommendation: separate implemented rules from proposed fiction/progression, update stale
comments and eventually expose a common read-only capability view. Preserve stored IDs and
save compatibility; a unified capability view need not migrate saves immediately.

## Recommended sequence

1. Decide a compact semantic contract: manual/signal eligibility; connection lifetime;
   in-flight signals; background scene/time policy. Fix the lockout inconsistency.
2. Make operation results explainable: accepted/blocked reason, source/destination,
   delivery/drop/cut, permission and access path. Extend the existing event inspector
   rather than creating a second execution engine.
3. Build the measurement harness in [PERFORMANCE-HARNESS-PLAN.md](../design/PERFORMANCE-HARNESS-PLAN.md).
   Measure actual costs before choosing renderer/DOM/scheduler optimizations.
4. Align progression with the existing concept: ordinary use first; one direct hacked
   state change; one event/wire; known host then scan; logic/timing; combined security;
   distributed operation later. This is a recommendation, not a replacement act roadmap.

No runtime fixes or gameplay design changes were applied during this review.
