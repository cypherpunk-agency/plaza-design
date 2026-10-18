# ENG-04: interactions, devices and wiring

Approved 2026-10-18. Parent: [ROADMAP.md](./ROADMAP.md). Evidence:
[ENG-04-STATUS.md](./ENG-04-STATUS.md). Builds on ENG-01 through ENG-03.

## Frozen delivery corpus

Game migrations: Market `fortune`; Beach `kiosk.meter/run`, `kiosk.meter/pause`,
`mixer.pump/pour` including repeated pours and manual refusal. Test Workshop uses the existing
Sandbox artwork/role with shared lamp on/off, hatch open/shut and fan spin/stop operations.
Its sensor, button, pressure plate, native timer/switch and hatch-to-fan cable demonstrate composition.
Ordinary Sandbox/S13 authoring retains its original scope; the Workshop has its own protected source.

Native state remains authoritative in SceneSave, projected as declared shared typed values. Only
selected verbs use the common command runner. Existing cable delivery, pausing, reset/restore,
wall-clock lockouts, seals and watchdogs stay native. Commands called by dialogue must also respect
bound device eligibility; a different UI must not bypass security. Authored initial wires are source;
player cables/cuts/logic parts remain player progress. Existing native verb text/definitions remain
compatibility/reference data; shared bindings override only the frozen native verb slots.

Intentional changes: paid Market fortune progression persists across reload; invalid runtime cable
endpoints refuse without replacing a valid cable. Demo gains a connected Workshop and switch module.
No campaign capability unlock changes. No art or geometry changes to migrated game scenes.

## Gates

| Gate | Required evidence |
| --- | --- |
| I1 | Corpus/effect ledger and changes/exclusions explicit; existing plans point here |
| I2 | Pure eligibility predicts command/native failures without changing state, progress, events or timers; permissions/resources and atomic rollback preserved |
| I3 | Native manual, signal and dialogue adapters share commands; manual locks/seals and watchdog rules preserved; failed commands emit no success signal |
| I4 | Typed authored cables/bindings validate native endpoints/verbs/references; fixed conduits protected; invalid runtime connections preserve prior wires; player cuts/rewires/logic survive supported saves |
| I5 | Editor pending command/response/wire edits, Undo/Redo, portable bundles and protected grouped Save/reload reject invalid sets atomically; pending Play uses new sources privately |
| I6 | Navigable same-runtime Workshop demonstrates direct use, actual 150ms cable, chain, switch off/on, timer, and denied/invalid cases; demo persistence isolated from campaign/Harbor |
| I7 | Market/Beach scoped behavior/text/state parity and appearance/geometry evidence; old saves/native state/repeated construction preserve progress; unmigrated timers unchanged |
| I8 | Feature coverage/docs/evidence current; both builds and focused checks pass; no publication or inferred player feedback |

## Sequential and timed effects retained for later scopes

Beach: sunbed rent/end, per-minute charges, danger timeout, jukebox sequence, drone flag and pier
clock, boat/readables stay native. In particular, billing pausing must still affect the existing
minute accumulator. Market haggling/umbrella state remains native; ordinary talk stays in the
ENG-03 legacy corpus. Workshop sensor pulses, guard/trace/net/watchdog examples, ordinary device
items and native logic-part delays remain native adapters. This phase does not claim that every
legacy action list is atomic, all device conditions are converted, or clocks/networks are unified.

ENG-05 objectives/access, ENG-06 clock/lifecycle and performance harness, ENG-07 networking and
ENG-08 generic scene registration remain separate. No campaign playthrough, CI expansion or push.
