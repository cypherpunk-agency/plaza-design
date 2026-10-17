# Game editor plan: from scene composer to full game editor

Status: proposed direction, approved 2026-10-17. No phase is implemented yet.
This is a separate engineering track. It builds on the completed
[scene system](./SCENE-SYSTEM-PLAN.md) and does not renumber story milestones in
[ROADMAP.md](./ROADMAP.md).

## Goal

The editor should let us **review** the game as it plays, **set up** scenes visually and logically,
and eventually **click our own levels together** without writing TypeScript for ordinary content.
New mechanics remain code, exposed to the editor as typed building blocks.

## Decisions (2026-10-17)

- The editor's purpose widens from an art, composition and timeline tool to a full game editor.
- For this track, the following `SCENE-SYSTEM-PLAN.md` exclusions are lifted: behaviour editing
  beyond the S13 Sandbox inventory, quest/objective and story-state authoring, and world,
  membership, transport and access editing. They are still out of scope for the completed
  S0-S13 work, whose evidence stays valid. Each phase below defines its own scope.
- Order: **play mode first**, then a **scene-document pilot** on one simple scene.
- Still not authorized: arbitrary scripting or code in documents, publishing as a side effect
  of editing, and changing art or story as part of migration.

### Open decision

- Are custom levels **internal authoring only**, or eventually a **player-facing feature**?
  Phases 1-5 are the same either way. Phase 6 depends on the answer.

## Where we start (review findings, 2026-10-17)

Line counts and file lists here are approximate.

Each scene is three layers held together by string ids:

| Layer | Source | Editor today |
| --- | --- | --- |
| Visual | `scenes/<id>/composition.json` | Editable: transforms, typed props, anchors, decorative add/duplicate/delete |
| Device logic | `scenes/<id>/devices.json` (`data/types.ts`, run by `engine/model.ts`) | Sandbox only (`authoring/inventories/S13.json`: 5 nouns, 10 handlers, 2 cables) |
| Everything else | `index.ts` `SceneDef`, `rules.ts`, `composition.ts`, `scene.ts`, registries | TypeScript; read-only or "opaque" in the event inspector |

Things an editor cannot reach today, because they are code:

- **Scene contents:** exits, spawn, people and talk, readables, `SceneUse` closures, intro, rests.
  Seven scenes have no `devices.json` and are entirely TypeScript.
- **Logic limits:** named effects, `tick` and `derived` values. Data conditions are a single atom
  (`key`, `!key`, `key=value`, `signal`) with no AND/OR, so compound logic moves into code. Data
  cannot read or set save flags, and there is no `wait` step and no item `give`.
- **Bindings:** each `composition.ts` hard-codes required gameplay instance ids and its own allowed
  binding sources, and maps placements onto `devices.json` spots.
- **Registration:** a new scene touches about 6-8 TypeScript files: `scenes/index.ts`,
  `world/city.ts`, `data/index.ts`, `authoring/scene-adapters.ts` (which feeds
  `authoring/source-documents.ts`) and `scripts/generate-demos.tsx`.
- **Story and progression:** `Save.flags` is an undeclared flat namespace. Objectives are
  if-ladders (`shiftGoal`, Downtown `progression.ts`, `SceneDef.objective`), the opening is
  tables in `story/opening.ts`, and `runtime/game.ts` holds about 11 scene-specific special cases.
  Cross-scene links exist only through flags set and read in code.
- **World:** `world/city.ts` is TypeScript. Access rules such as the harbor gate are evaluated in
  about four places (`placeBlocked`, `fly`, `updateTravel`, `lineOpen`). `world/document.ts` is a
  read-only mirror.
- **Review:** `authoring/native-preview.ts` deliberately never constructs `Game`. Gameplay runs only
  in the Sandbox behaviour lab.

What already works in our favour:

- The device vocabulary is finite and data-driven: 9 action types, guards, toys, sectors, clocks,
  watchdog, dialogue, goals and texts. `data/check.ts` validates it.
- The Sandbox runner (`authoring/behavior-sandbox.ts`) proves logic can run on the real
  `SceneModel` with an isolated clock and save.
- `ComposerModel` is pure (history, validation, transactions), rendering is injected, and
  workbenches use a plugin interface.
- The public editor accepts data only and never code, so a data-first model keeps it safe.
- The appearance baseline, ledger and native preview give us a way to prove a migration
  changed nothing.

The root cause: **the editor is ahead of the content model.** Until levels are data, new editor
features remain viewers or narrow exceptions like S13.

## Target architecture

- **Data:** places, exits, people, dialogue, interactions, devices, wiring, flags, objectives,
  cutscenes and world links.
- **Typed blocks:** a small registered library of effects with parameter schemas (for example
  timer, wait, move along path, play cutscene, set flag, give or take item). The editor places
  them and validates their parameters.
- **Code:** genuinely new mechanics only (a new lock toy, the crane simulation), exposed as new
  blocks or element types.

## Phases

Sizes are relative (S/M/L). Each phase ends with the listed acceptance checks.

### Phase 0: groundwork (S)

- Split `authoring/app.ts` `mountComposer` into modules (header and menu, layers, inspector,
  timeline, preview input) without behaviour change. New editors build on these pieces.
- Add an aggregate `check-editor` package script that runs the existing focused editor checks.
  It replaces running scripts one by one. It is not a game regression suite (see Verification).

Acceptance: identical public-editor browser check and build check results before and after.

### Phase 1: play mode (M)

- **Play** a selected scene inside the editor with the real `Game`, isolated from player
  storage (in-memory save, its own clock).
- **Play from here** with fixture state: flags, items, tokens, modules, programs, scene state,
  city time and weather. The existing environment fixtures become the starting save.
- A live **state panel**: flags, scene state, goals, and the last events or trace, plus reset.
- Return to editing with the document untouched; edits apply on the next Play.
- Works in the local and public editor. Player saves (`access-denied-save-v3` and slots) are
  never read or written.

Acceptance: playing the Sandbox and one story scene works in both editors; storage checks show
player keys unchanged; an edited composition is visible on the next Play.

### Phase 2: content model pilot (L)

- **Scene document** (`scenes/<id>/scene.json`): spawn, exits (`requires`, `needs`, `sets`),
  readables, people and talk, and use interactions expressed as condition plus actions instead
  of closures. The `SceneDef` factory reads it. Code hooks remain for anything not yet expressible.
- **Flag registry** (`data/flags.json`): id, description, owner, and expected setters and readers.
  The build rejects undeclared flags in data.
- **Data language upgrades:**
  - conditions with `all`/`any`/`not` and flag reads;
  - actions: set or clear a flag, give or take an item, wait, play cutscene.
- **Typed blocks:** register the existing named effects with parameter schemas where feasible.
  The rest stay opaque, but are listed.
- **Pilot** one code-only scene (shop or market are candidates).

Acceptance:
- Pixel identity on the baseline cases for the pilot scene.
- Identical interaction positions, exits, flags and saves.
- `data/check.ts` covers the new schema.
- Existing saves load unchanged.

### Phase 3: generic wiring and registration (M)

- Declare required gameplay instances and binding sources in the scene document. Replace the
  per-scene `composition.ts` adapters with one generic adapter.
- Add a **scene manifest** so a new scene is one folder of data. `SCENES`, the editor allowlist
  and the build checks derive from it.

Acceptance: the pilot scene has no hand-written adapter. A data-only test scene registers, builds,
validates and plays without TypeScript changes.

### Phase 4: editor tooling on the new model (L, incremental)

- **New scene** from a template.
- **Interaction inspector:** exits, people, readables and uses, with conditions built from
  dropdowns.
- **Device palette:** add devices, nouns, verbs, events and state keys within the vocabulary.
- **Editable wiring graph:** the event inspector becomes an editor for cases, cables and blocks.
  Cycle detection comes from S13.
- **Objective editor:** consider `PROGRESSION-CONCEPT.md` §9's scene matrix as the schema.
- **Dialogue editor** for people.
- Replace the remaining raw JSON boxes (shots, text cards, fades, beats) with typed forms.

Acceptance per tool: round-trip through `ComposerModel` history, validated save, and Play
reflects the change.

### Phase 5: world and story (L)

- Make the world document the runtime source for districts, places, links, transport and gates.
  Use **one** access evaluator instead of the copies in `placeBlocked`, `fly`, `updateTravel` and
  `lineOpen`.
- Map editing: places, pins, links and gates.
- Move the opening tables, objective ladders, contacts and the `game.ts` special cases into data.
- Save compatibility: migrate per chapter, as ROADMAP's foundations already suggest.

Acceptance: travel, discovery and access behave identically; old saves load or migrate explicitly.

### Phase 6: custom level packs (depends on the open decision)

- Export and import a pack of new scenes and their world links, built on the existing
  `access-denied-editor-edits` bundle format.
- Data only, validated atomically, and never code.
- If player-facing: decide on loading and sharing separately.

## Migration order

1. Pilot scene (Phase 2), proven by the appearance and behaviour checks.
2. Remaining code-only scenes.
3. Device scenes, whose `devices.json` is already data and which need scene documents for
   their interactions.
4. Downtown, the opening and the train, which carry the most special cases.

Port one scene at a time. A scene that cannot be expressed keeps its code hooks and is listed,
rather than getting a weakened replacement.

## Invariants

- Appearance preservation remains an acceptance gate: seeded variation, coordinates, canvas
  state and draw order.
- Player progress stays compatible unless a reset or version change is explicitly requested.
- The public editor keeps static snapshots and downloads only. The loopback write service and its
  credentials are never published.
- Imports and bundles validate atomically before entering pending state.
- Publishing is a separate action from editing or committing.

## Verification

Each phase uses builds and focused checks of its own changes. Game playthroughs and a regression
suite or CI expansion are pending discussion. Play mode makes manual playthroughs easier, but
this plan does not itself start them.

## Risks

- **Migration cost:** proving look and behaviour per scene is real work.
- **Over-generalising:** generalise from two or three real scenes. ROADMAP warns against an early
  generic tutorial framework.
- **Block sprawl:** keep blocks few, typed and inspectable so they don't become a scripting
  language through the back door.
- **Save compatibility** when flags and objectives move into data.
