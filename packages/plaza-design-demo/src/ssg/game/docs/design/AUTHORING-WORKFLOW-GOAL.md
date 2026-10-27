# Authoring workflow goal

Authorized 2026-10-26. ROADMAP.md owns priority and status. This contract defines
the bounded follow-up to E1–E6: make the existing engine genuinely authorable
through contextual workflows, then remove the displaced forms and special paths.

## Completion conditions

### U1 — Build a world in the world editor

- Select chunks and groups in the outline and viewport; drag them or edit X/Y.
  Connected placements explain constraints rather than silently breaking seams.
- Add opens a chunk/group picker before changing source. Unmount removes membership,
  never the source, and handles affected connections explicitly in one undoable edit.
- Inspect and author connections, endpoints and traversal in the same workspace;
  retained source distinctions do not require competing Compositions/Zones screens.
- Browse/create chunk sources, including standalone interiors, from that workspace.
- Retire standalone Compositions, Zones and Scenes panels after replacing their tasks.

### U2 — Author characters and conversations in context

- Character selection exposes appearance, behavior, interaction and conversation
  references. Shared definitions offer Edit definition and Show usages.
- Companion setup uses contextual character configuration; follow distance/trail/
  catch-up remain a shared physical behavior. Unlocks and dialogue use normal logic.
- Companion, bot and critter dialogue use the ordinary conversation workflow and
  runner. Migrate existing content and remove obsolete reply formats/runtime paths
  and standalone dialogue panels without losing the authored lines or cycling.
- Doors/gates, travel objects and triggers expose their relevant logic in context.

### U3 — Organize global configuration and remove competing rules

- Retain City map and Networks. Map exposes districts, places, discovery and travel.
- Provide a world-variable browser with declarations, values, bindings and usages.
- Game settings groups Launch/start, player defaults, guidance/time, contacts and
  ending. Replace the Game opening catch-all with those homes, contextual chunk/
  sequence settings and normal conditions/actions for progression and triggers.
- Test configurations, review shortcuts and experimental labs live in Developer
  tools. Checkpoints describe starting situations; profiles retain genuine run
  configuration and storage isolation, without duplicate start-state authoring.
- Physical gates and travel eligibility consume the same condition wherever they
  represent the same rule. Discovery stays separate; mounting/loading is not access.
- Remove displaced panels, formats and dead branches after migrating consumers.

## Evidence required for every milestone

1. Perform its real authoring tasks in the browser, including invalid/cancel cases;
   form presence alone is not acceptance. Record exact tasks and outstanding limits.
2. Verify Undo/Redo, bundle round-trip, protected source Save and fresh reconstruction
   for the changed source graph; private Play consumes the pending edits and keeps
   campaign saves isolated. Focused tests cover the actual changed contracts.
3. Package TypeScript and homepage build pass. Relevant current visual/behavior
   comparisons preserve the existing game, source identities and authored content.
4. Update current authoring/agent guidance and remove superseded instructions.

## Boundaries and stop rule

Use ComposerModel, SceneModel, GameplaySession, ConversationSession and the existing
renderWorldFrame. No new renderer, adapter, gameplay engine, scheduler, entity system
or compatibility layer. No redesign of campaign geography, story, pacing or visuals.
No historic-save migration, new performance campaign or general engine rewrite.
Different lifecycle semantics remain distinct where needed (profiles/checkpoints,
follow motion/dialogue, preview sampling/native Play).

Finish only when U1–U3 and their evidence pass, with no displaced reachable path left
unmigrated. Further generalization needs a concrete remaining failure, not symmetry.
Publishing is a separate action and is not part of this goal.

## Current acceptance audit — 2026-10-26

The following evidence maps to every completion condition above. Checks use current source,
current native systems and current visual expectations; no historic implementation is required.
Implementation is local. Publication remains excluded.

| Requirement | Current implementation and authoritative evidence |
| --- | --- |
| U1 select/move chunks and groups; explain connected constraints | `world-members.ts`/`world-workspace-controls.ts` and shared endpoint geometry. Browser X/Undo, constrained rejection and group dragging; `composition-workspace` check. |
| U1 picker-first add, explicit connection handling, source-preserving unmount | Workspace picker/cancel/mount/unmount/empty composition tasks; `composition-workspace` history/bundle/protected Save/native reconstruction. |
| U1 contextual endpoints/connections and new/interior chunk sources | Workspace connection controls and chunk catalogue actions. Browser endpoint edit, creation/cancel and retained source after unmount; old standalone Scenes/Compositions/Zones registrations and form files absent. |
| U2 contextual character appearance/behavior/interaction/reference | Actor and native target inspector bindings; `actor-entities`, `native-target-context-save`, `vehicle-authoring` checks. Browser actor/door/vehicle edits and Undo. |
| U2 shared definition editing and usages | `conversation-library.ts`, shared character controls, scoped linker. Browser robot → graph edit → Show usages → private Play/Stop; `conversation-library` and `robot-conversations` checks. |
| U2 companion normal logic and shared physical behavior | Contextual companion form, ordinary follow condition and graph references; physical Companion retains motion only. `companion-source`, `companion-forms`, `companion-save`; earlier browser local/shared edits and Undo. |
| U2 ordinary human/robot/animal conversations and preserved content/cycling | Explicit named graphs, GameplaySession/ConversationSession; no talk shorthand, reply-list runner, standalone bot/critter dialogue panels or presentation pet counter. `actor-entities`, `robot-conversations`, `critter-reactions`; current 60/60 visual comparison. |
| U2 doors/gates/travel/triggers in context | Compiled target bindings, vehicle inspector, normal live-condition controls. Browser door/trigger/vehicle invalid/edit/Undo and pending vehicle Play; `contextual-triggers`, `trigger-history`, `native-target-context-save`, `vehicle-authoring`. |
| U3 retained map/networks; contextual places/districts/travel/discovery | Current workbench registry retains Networks and City map. Browser place edit/rejection/correction, staged-route retention/cancel and Undo; `map-authoring`, `world-map`, `city-locks`. Old Districts/City & travel panels absent. |
| U3 variable declarations/values/bindings/usages | Authored schema/defaults and checkpoint overrides in World variables; no campaign-save reads. Browser create/type/default/binding rejection/correction/Undo; `world-variables` including scoped references and source Save. |
| U3 grouped game settings and ordinary progression/triggers | Game settings Launch/Player/Guidance & time/Contacts/Ending; chunk Story phases; Library Story logic. Browser player/guidance/trigger edits and invalid/Undo; `story-authoring`, `opening-workflows`, `opening-source-save`, `story-rules`, `story-trigger-runtime`. No catch-all Game opening form, CounterTest evaluator or incrementing presentation counter store. |
| U3 developer tools and one starting-state source | Test configurations/Review shortcuts/labs registry; profiles reference `world/checkpoints.json` via unchanged document ID `play-fixtures`. No profile seed/location fields or story START fallback. `play-profiles`, `starting-state-inspector`, `initial-save`; protected Save/bundle/fresh reconstruction and referenced-checkpoint deletion rejection. |
| U3 actual launch/private Play consume pending state | Shared `checkpoint-state.ts`/`runtime/sequence-state.ts`; native values, entrance/X, clock/weather, real metro movers and sampled sequence receipts. `configured-new-run`, `checkpoint-arrival`, `preview-checkpoints`, `sequence-inspection`; native New Game/Skip and Demo browser checks. Pending 11-token/44-second checkpoint runs with explicitly selected Full game configuration; Stop/Undo returns clean. |
| U3 shared physical/travel admission and distinct discovery/residency | Actual Game/map/physical-exit matrix and source Save in `world-access-policy`, plus `city-locks`/`world-map`. No new access-policy evaluator. |
| All milestones: history/bundles/protected Save/fresh reconstruction/isolation | Named focused checks above cover each changed graph; `play-storage` and startup lifecycle checks verify isolated frame reset/disposal. Browser private realm contains no campaign save; Stop removes frames. |
| All milestones: preservation/build/guidance/removal | Package `tsc -b` and `pnpm build:homepage` pass. Final visual compare is 60/60 exact with unchanged expectations. Skip/touch/actual-Game story timing checks pass. AGENTS, handbook and authoring guide describe current ownership; displaced files/registrations and imports removed. |

Retained distinctions have concrete purposes: profile configuration versus checkpoint situation;
source inspection/reconstruction versus full native Play; pausable presentation timestamps and
cues versus ordinary gameplay values/commands; physical following versus conversation graphs;
discovery versus physical access. These share existing systems without introducing another
renderer, adapter, runtime, scheduler, entity system or save compatibility layer.
