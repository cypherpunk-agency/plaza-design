# Shared gameplay: commands, events and conversations

Implemented pilot, 2026-10-17; persistent commerce and scoped conversation consolidation, 2026-10-18. This is a foundation, not completion of the full game editor.
The existing device evaluator, render pipeline and player-save format remain in use.

## Model

An interaction, conversation choice or native signal requests a **command**. The command
checks its allowed invocation source and conditions, stages its actions, then produces
**events** describing the result. Authored event reactions may invoke further commands.
One request and its reactions commit atomically before any event is published.

For the pilot:

```
supervisor choice → shift.accept → assignment.accepted
                                → shift.issue-tag → work-tag.issued

ordinary handover ─────────────────┐
                                  ├→ shift.deliver → parcel.transferred
scanner event → native cable ──────┘                → shift.record-delivery → delivery.completed
```

The final event is observed with the delivered flag already true and the parcel removed.
The existing harbor objective, attention cues and artwork read those same legacy flags.
Hacking is not introduced into the ordinary-work prologue: the connected terminal is an
isolated editor laboratory fixture. No scene artwork, composition or interaction positions
changed in this implementation.

## Ownership

| Location | Responsibility |
| --- | --- |
| `engine/gameplay/types.ts` | Versioned document, conditions, actions, commands, conversations, state port and event contracts |
| `engine/gameplay/validation.ts` | Closed JSON schema, reference validation, depth/size/quantity limits and pure condition evaluation |
| `engine/gameplay/session.ts` | Atomic draft execution, invocation permissions, bounded reaction queue and post-commit observers |
| `engine/gameplay/conversation.ts` | Conditional entry, read-only frames, choices and transitions; no rewards on opening/closing |
| `engine/gameplay/delivery-terminal.ts` | Small native SceneModel fixture and bridge to the same delivery command |
| `scenes/harbor-shift/gameplay.json` | Harbor command/reaction definitions and supervisor/Mara dialogue |
| `scenes/harbor-shift/gameplay.ts` | Validation and compatibility with the harbor's existing one-press interactions |
| `scenes/harbor-shift/gameplay-contract.ts` | Stable pilot IDs and invocation permissions shared by runtime, imports and source Save |
| `runtime/game.ts` | Per-scene session state ports onto the current player save; existing save/HUD handling after interaction |
| `authoring/gameplay-pilot-session.ts` | Independent pilot state, bounded controlled clock and native device model |
| `authoring/gameplay-workbench.ts` | Editor Gameplay tab for dialogue choices, handover, cable operations, state and committed events |
| `authoring/gameplay-authoring.ts` | Typed dialogue, choice, condition, action and reaction editing using ComposerModel history |

New mechanics can later register typed operations rather than becoming executable code inside
documents. Travel, access, network reach, cutscenes and the rest of the campaign have not yet
been moved into this kernel. Device guards and permissions continue to be enforced by their
existing evaluator; this pilot does not fix the separate lockout finding in the hacking review.

## Supported document vocabulary

Version 1 declares flag IDs, carried-item IDs and event IDs. Commands declare allowed sources:
`interaction`, `conversation`, `signal`, `system`.

- Conditions: flag equality, minimum carried quantity, minimum tokens, all/any/not.
- Actions: set/clear a flag, add/remove a carried quantity, add/remove tokens, emit an event.
- Reactions: a declared event invokes a declared system command.
- Conversations: ordered conditional entry routes with a final fallback; speaker/pages;
  choices with optional conditions and command, followed by a declared next node.

Conversation choices can only refer to commands permitting `conversation`. Native signal
adapters dispatch with `signal`; they cannot call the privileged wage or tag reward directly.
Sources are supplied by trusted adapters, not chosen by imported content. These are gameplay
capabilities, not an anti-cheat boundary against a user modifying JavaScript in their browser.

The schema deliberately has no arbitrary expressions, scripts, async waits or generic native
effect lookup. Existing device signal delay remains 150 ms. Async continuations, persistence
and clock ownership must be specified before adding a wait action.

## Transactions and lifecycle

State includes flags, carried quantities, token balance and qualified typed values. State ports read the current
save (not a cached copy), so existing load/new-game operations continue to work. Only a scene
declaring a gameplay document receives a session through `UseCtx.gameplay`.

Every operation clones state, executes the request and reactions into that draft, and writes
it once on success. Unknown operations, denied invocation, failed conditions, insufficient
resources or work-budget exhaustion change nothing and publish no events. A StatePort must
implement atomic replacement; notification/persistence callbacks are outside that replacement.
Observer exceptions cannot change accepted gameplay. Reentrant dispatch during a transaction
or notification is refused; authored reactions are the supported way to chain commands.

Execution ceilings per request: 64 commands, 512 actions, 128 events, and 256 queued commands.
The last 128 committed events are retained for inspection. Cycles are allowed to be expressed
but cannot run unboundedly; exhausting the budget rolls back the whole request. This is not a
replacement for the shipping device engine's separate signal scheduling or future timed-loop policy.

Game.stop disposes the new sessions. The editor laboratory owns no browser storage or global
clock, uses manually advanced native signal callbacks, and cancels its work on reset/unmount.
The laboratory's native scheduler is capped at 256 pending/executed callbacks per advance.

## Harbor compatibility

Assignment, collection, handover, case return, trolley/clamp work, checkout and wages now use
shared commands. Supervisor and Mara lines come from the conversation document. The regular
harbor interaction explicitly selects its authored continuation, retaining the existing
one-press flow and exact normal-path dialogue. The editor lab exposes the accept/later choices
so they can be exercised without changing the tutorial's current presentation.

The default document retains existing `shift:*` flags, item IDs, wages, objective order and save keys.
Authored changes can deliberately change the rewards/conditions/dialogue within that vocabulary.
Checkout and its wage reaction commit together; a repeated checkout or a resumed completed
save does not pay twice. No new save version is introduced.

## Trying and checking the pilot

Build the homepage and open the existing local/static editor, then select **Gameplay**.

1. Talk to the supervisor; inspect or decline without receiving an assignment.
2. Reopen and accept, then pick up the blue parcel.
3. Give it to Mara, or scan it and advance the circuit by 150 ms.
4. Inspect the shared state and event trace. Reset to try the other route.
5. Cut/reconnect the cable or try the restricted reward command to inspect refusal behavior.

The Gameplay tab now includes typed authoring for the registered `harbor-shift-gameplay`
document. Selecting that document also opens its workbench. Edit speaker/pages and choices,
conditional entry routes, command conditions/actions, or event-to-system-command reactions.
No arbitrary script or JSON text field is needed. Existing command/conversation/event/flag/item
IDs and invocation permissions stay fixed; required legacy accept choices are retained.
New dialogue nodes/choices and bounded declared actions/reactions are supported.

Each accepted edit restarts the lab against the pending definition. Undo/redo and portable
import/export use ComposerModel's atomic history. Public Download edits includes the gameplay
document in the existing version-1 envelope; older clients without this document reject it as
unknown rather than applying it. The snapshot now contains 38 documents; S13's scope is unchanged.
The header's local **Save to source** (formerly a separate Save gameplay button) uses the existing origin/token/revision-protected service
and writes only the allowlisted `scenes/harbor-shift/gameplay.json`. Reload discards pending edits
after confirmation. Saving source takes effect in the game after rebuilding the homepage.
The lab remains distinct from **Play**, which runs the actual Harbor Shift, Sandbox, Shop, Library or Laundromat `Game`
against pending composition, gameplay/scene or scoped behavior snapshots. Play uses an opaque-origin disposable frame, private
memory saves/slots, native clocks and the shipping renderer/styles/fonts. Detached diagnostics
include objectives, speech, pause/popup state, save data and committed gameplay events. Stop,
reset or leaving Play destroys the runtime; source edits remain in ComposerModel. Slot reloads
restart that private frame. Fresh runs use the selected validated fixture (default weather seed 3). Public source writes remain unavailable.
The shared `runtime/storage.ts` adapter preserves native browser storage for shipping defaults;
all game storage callers, including slots, UI preferences and terminal reset, use that boundary.

Focused native checks:

```
pnpm --filter plaza-design-demo exec tsx scripts/scene-system/check-gameplay-foundation.mts
pnpm --filter plaza-design-demo exec tsx scripts/scene-system/check-gameplay-authoring.mts
pnpm --filter plaza-design-demo exec tsx scripts/scene-system/check-gameplay-authoring.mts --http
pnpm --filter plaza-design-demo exec tsx scripts/scene-system/check-harbor-compositions.mts
```

`check-gameplay-browser.js` is a function for browser evaluation against the built editor.
It checks actual choice/cancel controls, timed native delivery, cut/reconnect, permissions,
reset/remount and zero browser-storage reads/writes. The native check covers transaction
rollback, reaction budgets, observer isolation, normal harbor state/messages and serialized
save continuity. The existing harbor check compares effective drawing commands at 36 shift
snapshots. These focused checks are not a campaign playthrough or performance measurements.

`check-gameplay-authoring-browser.js` exercises the actual typed fields, pending ordinary and
wired delivery, global history, downloaded bundles, atomic rejection of invalid permissions,
and zero storage/write-service access publicly. The native authoring check covers source
round-trip/conflict/group rollback and the `--http` variant exercises the actual protected
loopback API against temporary source copies, never the repository's game document.

Harbor objectives/guidance and the first three additional scenes are now authored (see below). Next steps include a generic conversation presentation adapter,
and reviewed expansion of typed subsystem operations and authoring inventories. Full scene migration,
world editing and the performance harness remain separate work.


Actual Play focused checks:

```
pnpm --filter plaza-design-demo exec tsx scripts/scene-system/check-play-storage.mts
pnpm --filter plaza-design-demo exec tsx scripts/scene-system/check-play-storage.mts --native
```

For browser reproduction, build the homepage, run
`pnpm --filter plaza-design-demo exec tsx scripts/scene-system/serve-editor-play-check.mts`,
open its isolated `http://127.0.0.1:4204/editor/` and evaluate `check-editor-play-browser.js`.
The fixture adds test-only key controls, drawing observations, callback heartbeats and throwing
native storage getters to the built frame script; these never enter a production bundle.
The check edits pending spawn/placements and dialogue/item actions, uses actual keyboard handlers
for movement, pickup and item-choice handover, and checks objectives/events, stop/reset/replay,
repeated mounts, source preservation and undo/redo. Parent and frame storage calls were both zero.
The local protected composer was also checked under its actual response CSP. No campaign
playthrough or general regression/CI expansion is implied.


The combined follow-up registers `harbor-shift-scene` and `play-fixtures`. The reusable
`engine/gameplay/scene-document.ts` compiler evaluates authored objective/attention/time routes
and ordinary interactions through the existing command/conversation runner. It accepts finite
JSON only, validates flag/item/conversation references and interaction invocation permissions,
and requires final fallbacks. Harbor's scene adapter retains protected IDs and artwork geometry.
The scene factories receive pending content explicitly; they never mutate the global scene registry.

`play-fixtures.ts` validates the two supported scenes, their known resource/capability catalogs,
primitive native state types and clock/weather/spawn ranges. Native saved scene state supplies
starting overrides; source defaults stay intact. Runtime wire edits, local save slots and queued
actions remain session state. Private reload checkpoints current native scene state before
restarting; resets without a saved run reenter the selected fixture.

Native `SceneModel.inspect()` returns detached diagnostic snapshots only when enabled in an
editor Game. Its last 128 observations come from the actual evaluator; timers and pending signal
metadata come from the existing SceneTime queue, CLOCK implementation and watchdogs. State
inspection does not execute verbs, reevaluate branch actions or advance time. Default shipping
hosts do not enable recording. Lockout time continues to use wall time.

Additional focused reproduction:

```
pnpm --filter plaza-design-demo exec tsx scripts/scene-system/check-editor-milestone.mts
pnpm --filter plaza-design-demo exec tsx scripts/scene-system/check-scene-pilot-parity.mts
```

The parity check reads the immutable compressed legacy baseline (1,100 cases), captured before
moving Harbor's closures into scene data. `check-editor-milestone-browser.js` runs against the
same local focused fixture server as the earlier Play check. It edits actual typed scene/fixture
forms, exports both new source kinds, performs Harbor pickup, installs pending Sandbox behavior,
uses native hack-view pointer gestures to rewire a signal, checks paused delivery and a failed
native condition, and verifies reset/source preservation/invalid-import atomicity with zero
native storage calls in parent and frame. These are scoped checks, not an automated campaign.

## Historical three-scene migration batch (2026-10-18, before ENG-02/03)

`authoring/gameplay-scenes.ts` registers Harbor Shift, Shop, Library and Laundromat with paired
scene/gameplay validators and native factories. This is an explicit pilot registry, not automatic
new-scene discovery. Sandbox retains its separate frozen behavior contract.

`SceneDocument` now supports optional objectives/time, price/action-label metadata, outcome cycles,
readables, existing actor dialogue and plain exit presentation. `applyScenePresentation` merges
content into native geometry. Scene validators protect IDs, destinations and invocation catalogs.
Native actors used for painting also receive the authored dialogue metadata, retaining hint marks.

Shop and Laundromat purchases use atomic commands. At that checkpoint, Shop's cycle cursor was supplied by a trusted
adapter to retain its original module lifetime: it advances only after success and is not saved.
NPC talk remains native: sequential sets, then the last set repeats. Library has an empty resource
command catalog. These are reusable content definitions without redesigning the scenes' mechanics.

Scene logic selects one of the four migrated scenes and edits ordinary routes, readable pages,
actor names/dialogue and exit prompts. Displayed price is prompt metadata; actual charges are
command token actions and conditions in Gameplay. IDs and destinations remain protected. Gameplay
selects the matching command document; only Harbor includes the delivery circuit laboratory.
Test other scenes in Play, which consumes pending composition, scene and gameplay snapshots.

Play supports five scenes, with default starting fixtures for each. Older two-profile fixture
bundles remain valid: selecting a scene without a profile adds its default through shared history.
Native state overrides remain limited to Sandbox. Normal campaign scenes use a distinct private
frame mode; Harbor retains its restricted prototype controls. Shipping save keys are unchanged.

Focused checks:

```
pnpm --filter plaza-design-demo exec tsx scripts/scene-system/check-shop-gameplay.mts
pnpm --filter plaza-design-demo exec tsx scripts/scene-system/check-library-gameplay.mts
pnpm --filter plaza-design-demo exec tsx scripts/scene-system/check-laundromat-gameplay.mts
pnpm --filter plaza-design-demo exec tsx scripts/scene-system/check-scene-batch.mts
```

The batch check runs grouped source saves against disposable workspace copies. Production player
storage and repository source documents are not test targets. Specialized device rules, world
travel/access, actor appearance, geometry and the other scenes remain outside this migration.

## ENG-02/03 consolidation (2026-10-18)

Source extensions remain optional in the version-1 kernel document: `state` declarations and
`purchases`, state conditions/actions, explicit node `onEnter` and conditional redirects. The
Shop/Laundromat source contracts now require their purchase definitions: legacy literal-payment
source bundles are rejected atomically with a migration error. Existing player saves remain valid;
missing saved state defaults deterministically. The portable envelope remains version 1.

- `state.ts`: declarations have a qualified owner, boolean/number/enum type, bounds/default and
  save/session/interaction lifetime. Save values live in optional `Save.gameplay`, separate from
  native `Save.scenes` device snapshots. Session values live for a gameplay session; interaction
  values exist within one transaction and reset on the next read. Foreign persistent values survive.
- `commerce.ts`: a purchase owns base price, goods or rotation, optional stock and explicit modifiers.
  Quote and charge share one base; modifiers target both, quote only, or charge only. Invalid prices,
  insufficient funds, depleted stock or later command failure commit nothing. Stock and rotation
  require different numeric state keys. Shop has a saved bounded rotation rather than module state.
- `scene-conversations.ts`: simple actor talk compiles to the same conversation graph, entry commands
  and persistent cursors used by choices. Final-repeat is default; cycle is an explicit policy.
  Text is authored once in scene.json, not copied into a second editable dialogue catalog.
- `conversation.ts`: frames/close are pure. Choice commands, post-choice conditional redirects and
  explicit next-node entry commands commit together. Failed entry rolls back the choice and leaves
  the node unchanged. Redirect cycles are rejected; choice loops remain supported. One-time entry
  rewards use explicit guarded commands and entry routes, not rendering callbacks.
- Native Library catalog text now lives once in library/gameplay.json. `native-dialogue.ts` produces
  read-only compatibility data for native checks/inspection; Panels uses ConversationSession to run
  it. `native.reads` declares its read-only renewed flag from the native model; it is not a second saved
  source of truth. Unsupported legacy projection shapes are rejected during source validation.
- Actor painting retains talk metadata and the exact prepared actors/hint markers. Conversation IDs
  are runtime metadata, not an appearance change. The scene document validator checks generated
  conversation identities before accepting an import or source save.

Migrated corpus: 14 NPC paths in Shop/Library/Laundromat, Harbor supervisor/Mara, and Library catalog:
17 paths. `CONVERSATION-MIGRATION.json` explicitly lists 49 remaining legacy NPC/device paths plus
robot reactions. This is a unified foundation with a scoped migration, not a claim that all dialogue
content or every legacy evaluator has been removed. Weather/time chatter, free text and other device
node-entry effects remain listed adapters for later work.

### Test District

Open `/?demo` after building the homepage. It uses real Game with two source-defined role overrides:
the native Library and Shop examples with a compact native device area. Review shortcuts replace travel;
plain backgrounds retain only the required people and props. Purchase, price and permission controls work in place. The
19-scene campaign registry is unchanged; generic scene registration is still ENG-08. No renderer,
conversation evaluator or commerce implementation is copied for the demo.

Standalone demo autosave, manual slots and resume use distinct demo keys. Location, stock, rotation,
conversation progress and modifiers persist; MENU -> NEW GAME resets only the demo autosave, retaining
demo manual slots. Editor **Demo world** runs pending definitions in the existing opaque disposable
Play frame. Leaving/Stop destroys it; its progress is not the standalone demo save. The regular five
Play scenes remain available. District entry is constrained to the three demo content roles.

Demo coverage is in `demo/coverage.json` and is shown read-only in the workbench. Gameplay can edit the
shared demo purchase/state/choices; Scene logic edits both areas. The inspector includes resolved
state, purchase quote/charge/modifiers, current conversation and events. The two areas share one
registered gameplay document, so a pending price edit applies on either side of the door.

Focused evidence commands: check-persistent-commerce, check-unified-conversations,
check-demo-district, check-authored-actor-paint, check-scene-batch, and existing Harbor/gameplay,
composition, storage and protected-authoring checks under scripts/scene-system. See the engine
status ledger for exact runs and browser evidence. No campaign playthrough or performance claim.


## ENG-04: native device boundary

See [scope and gates](../../ENG-04-PLAN.md) and [execution evidence](../../ENG-04-STATUS.md).
`GameplayDefinition.native` declares native state aliases, ordered verb-to-command routes,
committed event/goal projections and authored initial wires. `nativeStatePort` projects native
values into typed command drafts and commits them back to the same SceneSave owner. It removes
these aliases from Save.gameplay; non-native shared values and unrelated native keys survive.
StatePort.write receives the transaction's committed event list so native goals are applied with
state/resources before notification or persistence. Painting and eligibility do not grant rewards.

`attachNativeGameplay` binds the existing SceneModel to a GameplaySession. Bound verbs bypass their
legacy native steps; unmigrated verbs retain them. The session's native authorization guard also
covers commands invoked by conversation or authored reactions. Manual lockouts/seals and signal
bypasses retain native semantics; watchdog freezing blocks both. Shared eligibility dry-runs the
same bounded transaction without writing state, events, timers or history. The live device inspector
shows manual/signal eligibility and native traces include the shared result.

Native event notifications use SceneModel.emit and its existing 150ms pausable delivery. Switches,
timers, fixed conduits, cuts, placed-part save/restore and cancellation remain native. Cutting a
wire after its signal was already dispatched retains the existing captured-delivery behavior;
reset/restore cancels old callbacks. This phase introduces no new clock domain or signal evaluator.
Runtime connect validates endpoints before replacing an existing cable. Native conditions that
remain in legacy action lists are not claimed converted or transactional.

The registered Market/Beach/demoWorkshop sources use protected validators. Native wire/route
controls use declared noun/event/verb choices, existing document history/bundles and grouped source
Save. Existing gameplay documents reject unregistered native bindings. Public packaging currently
contains 41 documents. In Events, Beach's active shared routes and pending authored wires point to
its gameplay JSON rather than legacy native steps; the Workshop uses live Demo world diagnostics.

Test District adds a Sandbox-based Workshop via the Desk entrance. The existing test-plan board
opens shared permission controls; the first benches demonstrate native manual/signal operations,
timer/switch chains and fixed-cable failures. The Workshop has its own gameplay source; ordinary
Sandbox/S13 stays separate. A demo-only switch module is supplied to older demo saves as well.
The Market fortune cursor is now saved and advances only on successful payment. Beach's meter and
mixer keep their exact native responses and behavior; rental billing and danger recovery stay native.

Focused command:

```
pnpm --filter plaza-design-demo exec tsx scripts/scene-system/check-eng04.mts
```

It covers the finite migration/security/rollback corpus, actual pausable scheduler, editor history,
portable import and protected source-save round trips using disposable files. Existing Beach/Market
appearance checks remain separate gates. No campaign playthrough or CI expansion is implied.


## Objectives, access and declared-scene pilot

The feedback-ready package adds one ordered objective selector used by authored Harbor guidance
and the existing seven-stage Downtown bridge. Text, target and urgency come from the same selected
row. Harbor's presentation and progression ordering remain unchanged.

Access requirements use shared pure conditions or an existing interaction command's eligibility
query, with authored refusal text and optional hidden-while-refused behavior. A requirement can be
checked by prompts, runtime invocation and the editor inspector without spending resources. Both
main and carried-item actions enforce the same gate; commands still own atomic mutation.
Native adapters cover current flag/key doors, quick-travel refusal priority and harbor transport.
Capabilities are a detached view over existing jump/module/program/key/control owners, not a second
saved ability registry. New unlock policies and broad world-access authoring remain design work.

Four further Market actors (cook/fish/repair/sleeper) use shared conversations and saved cursors.
This raises the scoped migrated paths from 17 to 21 and reduces the inventoried legacy paths from
49 to 45; generic bot reactions remain separate. The baseline page sequences and final repeats are
preserved. New saved cursors initialize lazily, retaining unrelated native state and resources.

The editor's declared-scene pilot resolves authored spawn/use bindings against composition instance
IDs and runs the same commands, objective selector and native artwork/render path. It occupies only
a private shop role; no campaign registration/map membership is added. See the
[binding inventory](./SCENE-BINDING-INVENTORY.md) for the supported contract and explicit exceptions.


## All-game conversation continuation (2026-10-19)

The earlier ENG-03 counts above describe historical snapshots. Every row currently recorded in
`CONVERSATION-MIGRATION.json` now uses shared conversation graphs, including all six device
dialogues. Procedural bot reactions now use the registered shared template source described below. The legacy panel dialogue evaluator
has been removed; projected native dialogue metadata is read-only compatibility/inspection data.
Panels resolve explicit or default conversation IDs through the same ConversationSession.

`native.reads` declares read-only truthiness bindings to live native state (or an explicitly
registered derived value). They are not copied into the save and cannot be assigned by commands.
`native.state` aliases writable state to its original SceneSave owner. Omitting `native.wires`
preserves another subsystem's cable source; an explicit empty list owns and removes defaults.

`handoffs` binds a committed shared event to an existing cinematic and/or delayed system commands.
The typed editor exposes the event, cinematic, delay and command references. GameplaySession
still owns all state/resource/flag actions; the handoff adapter only requests the existing
cutscene presenter and schedules commands on SceneModel's existing clock. Eligibility and failed
transactions never trigger handoffs. Session disposal, native reset and restore cancel delayed
work. The runtime bounds pending handoff work at 64 callbacks; this remains a small shared
controller facility, not full controller/world/editor acceptance.

Stacks Moth's ending uses this path: one guarded command sets the original talked state, three
story flags and the moth goal; its committed event requests ACT II and schedules the authored
ferry-depart command after 1500ms. Native end-effect code has been removed. Repeated entry resolves
to the same final line without replaying the transition. Verification: check-stacks-conversation
and check-gameplay-handoffs; these do not constitute a campaign playthrough or full G3/G9/G11.


Procedural robot voices are authored in `engine/gameplay/bot-reactions.json`. Artwork specs retain
only appearance/motion data. `withBotConversations` expands the registered voice templates through
`withSceneConversations`, so ConversationSession/GameplaySession are the only text progression and
state writers. Game caches each expanded scene definition; prompting does not construct or advance
a conversation. The current source has 21 voices and 17 procedural bindings in the registered
scenes. New saved cursors preserve the original cycling policy and initialize once for old saves.
The former REACTED and SAID maps and native panel dialogue evaluator are removed. Existing unnamed
actors are bound by their stable scene slot; generalized entity creation/reorder remains a G10 gate.

Communication continuation: device captions and pings in Game receive the status/help readable
clock. Identical replies do not extend their lifetime; pings deduplicate per source and remain
bounded while tracking screen-edge changes. Significant dialogue/status words archive to terminal
history with notification forwarding disabled. Source-specific empty-board, trace-lock and taxi
refusals have visible destinations. Focused checks are check-device-feedback-timing and
check-communication-history. Full message policy, sound, remote/busy-screen routing and browser
acceptance remain part of the active ENG-09/all-game goal.
