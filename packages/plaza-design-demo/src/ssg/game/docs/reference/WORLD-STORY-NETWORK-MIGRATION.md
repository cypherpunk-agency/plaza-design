# World, story and existing network migration audit

Date: 2026-10-19. Read-only source audit for G11 and the existing-network portion of G9 in [ENGINE-CONSOLIDATION-GOAL.md](../../ENGINE-CONSOLIDATION-GOAL.md). This records remaining work; it does not mark either gate complete. Counts describe the source snapshot inspected, not permanent limits on the game.

## Current coverage

The inspected JSON contains 9 districts, 17 places, 43 ordinary scene-document exits, 10 map links and 3 planned lines. `data/net.json` contains 8 networks, 15 access rules, 25 machine-membership rows, 1 program and no global nodes, cables or keyring items. Membership rows are not a count of unique machines.

- Ordinary scene sources already drive manifest-bound spawn, exit destinations and arrival anchors, required flags and keys, and arrival pages. Typed forms exist in `authoring/scene-authoring.ts` (spawn/manifest targets, Arrival, Exits). Opening overrides can still supersede this content.
- `world/city.json` and `validateCitySource` own city registries, places, map coordinates, district frames, reveal relationships, links, taxi data and station data. `authoring/pending-city.ts` validates against a prospective scene registry. Private Play receives an independent `CityModel`; native map and travel consumers use it.
- The typed City & travel panel exposes names, start scene, place entrance/arrival, taxi fare, quick-travel duration and metro settings. It exposes only part of the existing city schema: map positions, frames, reveal relationships, links, memberships and transport destination bindings largely need JSON editing. This is a forms gap, not absence of declarative source.
- `world/transport/metro.json` already supplies platform/ride timings, phase offsets and brake/halt configuration. Independent line sessions and pending native control behavior exist. Fixed station identities are registered controller vocabulary; this audit does not propose adding transport types.
- Timeline documents and cinematic compositions already have composer preview/editing. The timeline form edits both `handoff.scene` and `handoff.entrance`. Pending playback integration is the missing part.
- Shared conversations/actions/handoffs already exist, including the Moth act transition. `engine/gameplay/handoffs.ts` performs post-commit cutscene delivery and delayed commands with scoped disposal; it must remain the shared owner.
- Device source documents already expose LINK `known`, `reach`, `when`, sectors and ordinary node definitions. The existing reach evaluator in `engine/net.ts` is shared by model/query consumers. Global network source ownership and injection remain missing.
- `world/document.ts` is a validated read-only world index derived from registries; `authoring/world-panel.ts` is a read-only map browser. Do not confuse these with the writable city source and its typed authoring panel.

## Finite remaining slices

### 1. Pending cinematic documents in native playback

`authoring/play-frame.ts` builds pending scene/city/metro inputs for `Game`, but does not pass the pending title/cinematic compositions and timelines into playback. `runtime/game.ts` constructs the module-global `Opening` and calls module-global `cutsceneById`. `story/title/index.ts` captures shipping `openingDocuments`; `story/cutscenes/documents.ts` captures shipping cinematic documents.

Use the existing composition/timeline contracts and evaluators. Inject a validated private document bundle; do not add another animation engine or mutate module-global documents.

Completion conditions:

- Pending duration, text, representative visual parameter and destination edits affect actual native Play without Save/rebuild.
- Title, intro and Act II native playback use the pending documents where applicable; identify the existing taxi sequence's playback owner explicitly.
- Shipping/default playback remains independent of the private bundle.
- Untouched documents retain original render commands, pixels, animation timing, skip behavior and reduced-motion behavior.
- Stop/restart/supersession do not retain an earlier bundle or its pending callbacks.

### 2. Complete cinematic handoff destination

`story/cutscenes/index.ts` projects `sequence.handoff.scene` into `next` but drops `entrance`. `story/cutscenes/types.ts` represents only `next: string`; `Game.playCutscene` ultimately calls `handTo(scene.next)`. Title glide already exposes a full handoff through `Opening.handoff` and `startOpening(destination)`; preserve that distinction while consolidating the adapter.

Completion conditions:

- Natural completion and skip land at the authored scene and entrance exactly once.
- Interrupted playback never travels or performs completion work.
- Existing callback-based post-cutscene continuation semantics remain intact; an explicit continuation is not silently replaced by default travel.
- Missing or invalid destination references reject before native execution.

### 3. Prospective timeline destination validation

`authoring/source-documents.ts` builds its timeline destination context from shipping `SCENES`, then uses it in grouped validation. Changed arrival anchors and newly authored scene destinations need the same prospective registry used by scene/city validation. The composer handoff picker/context must agree with that prospective destination set.

Completion conditions:

- Grouped creation of a scene/arrival anchor and a handoff referencing it succeeds atomically.
- Dangling, deleted and incompatible destination references reject the entire grouped operation.
- Undo/redo, grouped imports, source Save and fresh saved-document reload validate the same registry.
- Validation does not instantiate live gameplay or alter player storage.

### 4. Explicit existing transport route bindings

`Game.enterTrain`, `stepOut` and taxi travel retain fixed destination/arrival strings: `train/out`, platform `train`, siding `harbor/metro`, and taxi arrival `taxi`. `rideHome` directly initializes the Harbor-to-Downtown route and segment position. These are separate from already authored metro timings and city station/stand registries.

Completion conditions:

- Each existing route's destination and arrival binding is declared, validated against pending scene sources and consumed by actual native travel.
- Editing a route binding moves the real arrival; missing anchors reject before mutation.
- Boarding windows, train synchronization, emergency brake/siding outcomes, reduced-motion synchronization and saved ride state retain current behavior.
- No new station identities, transport modes or remote gameplay are introduced by this migration.

### 5. Existing travel permission inputs

`world/city.ts` hardcodes market/harbor quick-travel restrictions in `placeBlocked`; `world/access.ts` separately hardcodes the harbor transport destination check. `Game.mapState` supplies market access from `save.flags.end`. Existing exit visibility and key checks already use shared access adapters.

Completion conditions:

- Existing map/taxi/native route policy inputs have one declared source and consistent permission evaluation.
- Preserve intentional route differences explicitly, including leaving Harbor while access is closed and refusal from a moving train.
- Preserve fare charging, token state, native animations and refusal outcomes.
- Account for fixed travel clock costs still declared in `world/clock.ts` (`TRAVEL.quick`, `TRAVEL.taxi`); do not infer them from animation duration.
- Representative permission source edits affect all applicable native consumers, with missing context refusing safely.

### 6. Opening story configuration and registered execution

`story/opening.ts` still owns phase predicates, resume destinations, goals, clock pins, everyday action overrides, exit overrides, story target positions, turnstile/sleep timing and morning thresholds. `Game`'s story region owns their execution: failed attempts, mail scheduling, wake/reset, uplink acquisition, PC-jack completion and direct continuation callbacks. These can override otherwise editable scene content.

Extract existing configuration first, then migrate execution through typed registered controllers/shared actions. Configuration extraction alone must not be claimed as complete controller migration. Preserve native reset semantics explicitly rather than hiding callbacks inside a generic source wrapper.

Completion conditions:

- Representative authored pacing, target, line, resume destination and permission edits change real opening playback.
- Existing flags, old saves, partial-opening resumes and state-dependent scene presentation behave identically by default.
- Failed-attempt/mail thresholds, delayed completion, wake reset, clock pin/release and uplink handoff retain their ordering and timing.
- Delayed work cancels safely on interruption/reset/scene lifecycle changes.
- Existing shared conversation and gameplay handoff owners remain authoritative; no second conversation or delayed-action engine is introduced.

### 7. Validated global network source

`data/net.json` is declarative, but absent from `authoring/source-documents.ts`. `SceneModel` already accepts `NetData` as its fifth constructor argument; `SceneHost` currently uses its default NET. `authoring/device-sources.ts` validates against static NET. Reuse the existing `NetData`/`NetworkData`/`AccessRule` shapes and `data/check.ts` game/network validation instead of inventing alternative reach semantics.

Completion conditions:

- A bounded validated editor source owns the existing networks, memberships, access rules, program metadata and existing global-node/cable/keyring fields as applicable.
- Validate port references against pending LINK nouns, memberships against pending devices/nodes, network references and controlled-node labels.
- Pending membership, access rule, name/note and need-text changes reach native model, map and terminal consistently.
- Preserve discovered network IDs, connected-node saves, controlled-node identity and scan.so acquisition/permissions.
- Reject invalid grouped source imports atomically.
- Preserve local versus far-machine limitations; no new remote gameplay.

### 8. Remove shipping-global network metadata paths

`Game.showNet`, `netState`, `deckScan` and `deckConnect` read static NET. `machineName` reads static SCENE_FILES; remote-place messages consult shipping SCENES. `authoring/event-inspector-model.ts` also reads static NET. These consumers must share the injected pending source and pending device/scene registry rather than merely adding an editor document.

Completion conditions:

- Pending device/network naming and membership edits appear consistently in native map, terminal and event inspection.
- Deleting/rebinding a referenced machine cannot leave stale labels, topology or permission metadata.
- Actual model/map/deck tests cover known-node access without scan, sealed/down ports, controlled-node reach, cyclic access rules, discovery persistence, and current far-machine refusals.
- Equal IDs continue to identify the same saved entities; source changes do not reset unrelated player progress.

## Recommended execution order

1. Slices 1-3 together: one bounded cinematic pending-document/full-handoff/prospective-validation migration.
2. Slices 7-8 together: one global network-source and native-consumer migration.
3. Slices 4-5: existing transport route and permission inputs, preserving controller behavior.
4. Slice 6: opening configuration followed by explicit controller migration.

Each slice needs source edit/history/Save/fresh-load proof, actual native-callsite outcomes and preservation checks. Demo coverage supplements real-scene migration rather than replacing it.

## Existing evidence to extend

Relevant existing scripts under `scripts/scene-system/` include:

- `check-native-timeline.mts`, `check-timeline.mts`, `check-gameplay-handoffs.mts`.
- `check-city-source.mts`, `check-city-source-save.mts`, `check-world-map.mts`.
- `check-metro-snapshots.mts`, `check-metro-sessions.mts`, `check-metro-source-save.mts`, `check-metro-fixture-save.mts`.
- `check-transit-content.mts`, `check-transit-editable.mts`, `check-transit-editable-forms.mts`, `verify-transit.mts`.
- `check-world-conversations.mts` and existing all-scene preservation fixtures.

The audit inspected source and counted JSON records. It did not run a fresh verification batch, change runtime behavior or establish new raster evidence. Existing scripts are coverage pointers, not a claim that they already prove these remaining acceptance conditions.
