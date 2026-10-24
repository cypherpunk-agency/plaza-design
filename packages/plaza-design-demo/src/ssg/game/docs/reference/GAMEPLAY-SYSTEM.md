# Shared gameplay: commands, events and conversations

Current contracts for the shared engine. See [ENGINE-HANDBOOK.md](./ENGINE-HANDBOOK.md) for recipes.

## Current scalar ownership (2026-10-19)

`gameplay.state` is the sole schema/default source for scene scalar values.
Public IDs split at their final dot into owner and local key. Runtime
`GameplayState.values` and persisted `Save.gameplay` contain owner blocks, for
example `{yard: {found: false, held: null}}`. SceneModel and shared commands
reference the same live scene block. `projectSceneState` supplies the local
schema/default view used by native rules and source validation; raw device
sources do not contain a duplicate `state` record.

`nativeGameplayPort` only overlays readonly observations and applies committed
native goal effects. It transfers no scalar values. `native.state` and
`nativeStatePort` have been removed. Engine `SceneSave` contains cables, goals,
trace, locks, board and other engine progress, not scene scalar copies. A model
diagnostic snapshot may include a settled scalar view; the runtime serializer
keeps that in the common owner block and removes it from the engine save.

The dated implementation/evidence sections below describe earlier snapshots
where explicitly identified; they do not add an old-format compatibility gate.

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
| `scenes/authored.json` (`harbor-shed`, `harbor-yard`, `harbor-checkout`) | Harbor commands, reactions and supervisor/Mara dialogue on shared `shift.*` state |
| `engine/gameplay/scene-document.ts` and `folder-scene.ts` | Validate scene source and compile its declared bindings against the composition; commands and invocation permissions belong to `gameplay.json`. |
| `runtime/game.ts` | Per-scene session state ports onto the current player save; existing save/HUD handling after interaction |
| `authoring/gameplay-pilot-session.ts` | Independent pilot state, bounded controlled clock and native device model |
| `authoring/gameplay-workbench.ts` | Editor Gameplay tab for dialogue choices, handover, cable operations, state and committed events |
| `authoring/gameplay-authoring.ts` | Typed dialogue, choice, condition, action and reaction editing using ComposerModel history |

New mechanics can later register typed operations rather than becoming executable code inside
documents. At the original pilot checkpoint, travel, access, network reach, cutscenes and the rest of the
campaign had not yet been integrated. Current ownership is described in the handbook. Device guards and permissions continue to be enforced by their
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


For real source examples, extension recipes and current checks, use [the engine handbook](./ENGINE-HANDBOOK.md).
