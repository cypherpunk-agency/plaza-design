# Using and extending the shared game engine

Current implementation guide,2026-10-20. Read [AGENTS.md](../../AGENTS.md) for working rules.
All19 existing scenes use shared source and typed editor support. Everything remains in design;
this guide describes implementation ownership, not immutable product decisions.
Tests exercise the current engine directly; completed migration evidence is not required.

## The execution model

A scene source binds artwork/entities to interactions, dialogue, objectives and exits. A user
interaction, conversation choice or authorized native event requests a command. GameplaySession
checks permission and conditions, stages actions and reactions atomically, commits once, then
publishes events. Presentation and simulation observe committed state. Eligibility and frame
inspection do not commit actions or advance dialogue.

| What you want to change | Authoritative source / implementation |
| --- | --- |
| Arrival, use/read/rest/exit, actors, objective, scene-time policy | scenes/<id>/scene.json; engine/gameplay/scene-document.ts and manifest-content-compiler.ts |
| Commands, conditions, state declarations, purchases, dialogue, reactions, native workflow bindings | scenes/<id>/gameplay.json; engine/gameplay/types.ts, validation.ts and session.ts |
| Device/noun/verb/event vocabulary, guards, cables and controller inputs | scenes/<id>/devices.json; SceneModel, native bindings and registered controllers |
| Appearance, placement, layers, attachments and animation | composition.json plus registered art kernels; runtime/render-scene.ts is shared by Game and editor |
| Places, routes, access, transport and narrative/timeline handoffs | Existing world/story source documents; authoring/source-documents.ts registers their ownership |
| Typed controls and pending source | authoring/source-documents.ts, ComposerModel and the appropriate typed authoring module |
| Player runtime state | Save.gameplay owner blocks, with SceneModel referencing the same block; engine snapshots keep goals/cables/locks/board metadata |

Existing scene factories adapt source and retained drawing/simulation; do not copy a factory's
old shape to create an ordinary scene. Use the authored-scene catalogue instead. Source documents
are authored definitions, never player saves. Current source validation is prospective across
companion documents: a pending scene must see its pending gameplay/device/world references.

## Recipe: an ordinary interaction or reward

1. Find the existing scene.json binding and its referenced gameplay.json command. Change source
   first; use the shared condition/action vocabulary before adding TypeScript.
2. Declare referenced state, flags, items and events. Bind the interaction route to a command;
   manifest bindings attach it to existing artwork. Use editor creation/rebinding helpers when
   adding an entity so source identity, geometry and dependencies remain coherent.
3. Put guards on the command as well as any presentation-only visibility. Reward and cost actions
   belong in one transaction; do not grant in a draw callback, a condition, or a conversation frame.
4. Prove success, refusal, repeat behavior and the relevant saved state through actual dispatch.

This complete small gameplay definition demonstrates a one-time parcel handover. It is a teaching
example, not a new registered scene; the caller must supply an inventory containing parcel.

```json
{
  "version": 1,
  "flags": ["courier.delivered"],
  "items": ["parcel"],
  "events": ["courier.delivery.completed"],
  "commands": {
    "courier.deliver": {
      "sources": ["interaction", "conversation"],
      "when": {"all": [{"item": "parcel", "atLeast": 1}, {"flag": "courier.delivered", "is": false}]},
      "actions": [
        {"item": "parcel", "add": -1},
        {"flag": "courier.delivered", "value": true},
        {"emit": "courier.delivery.completed"}
      ]
    }
  },
  "reactions": [],
  "conversations": {}
}
```

Validate with validateGameplay, execute through GameplaySession.dispatch, and inspect the result.
Do not call a system/conversation command from a player signal unless its declared permissions
actually allow that source. Physical native input origins have additional enforcement.
Use [Library's scene source](../../scenes/library/scene.json) for a small real interaction and
[Shop's gameplay](../../scenes/shop/gameplay.json) for real commerce rather than inventing another
purchase algorithm. Quote and charge share the purchase definition; deliberate divergence uses
its explicit modifier scope. Service purchases use service:true, not fake inventory items.

## Recipe: dialogue and saved state

Use authored conversations for choices and scene people definitions for simple chatter; the
compiler produces the same ConversationSession graphs. Supply explicit graph IDs for native talk.
Use entry commands for effects and onEnterFailure for refused entry. Repeated frame inspection
must stay pure and rewards must be idempotent. A choice uses the same command engine as a device.

Declare scalars with owner, type, default and lifetime. Save-lifetime values persist across browser
sessions; session/interaction values deliberately do not. State IDs split at the final dot into
owner/local key. Queries are derived reads, never another stored copy. Do not add a parallel cursor
map, synchronize two scalar stores, reset shop rotation on reload or restore missing optional
source fields from a compiled original. No historic save-format migration is required.

Examples: [Library dialogue source](../../scenes/library/scene.json),
[shared conversation compiler](../../engine/gameplay/scene-conversations.ts),
[common state owner](../../engine/gameplay/state.ts).

## Recipe: a timed or specialized mechanic

Prefer existing triggers, intervals, deadlines, inputs, commands and events. Triggers select the
existing beforeNative/afterNative live-tick phase or onPersist action boundary. Preserve the
original sampling/order semantics: moving an immediate persistence effect to the next tick is a
behavior change. Deadlines use the owned SceneTime; disposal, pause, reset and cancellation matter.
Wall-clock lockouts intentionally follow their own policy.

Only a genuinely new physical calculation or drawing algorithm warrants registered native code.
Expose typed source parameters, explicit reads/events and start/update/pause/dispose ownership.
Ordinary dialogue, access, rewards and timers still use the shared model. See
[Downtown persistence triggers](../../scenes/downtown/gameplay.json),
[shared trigger implementation](../../engine/gameplay/native-live-conditions.ts) and registered physical controller modules. Do not add a second scheduler.

## Recipe: a scene or editor feature

Create ordinary scenes through the editor catalogue, then edit Scene/Logic and connect routes
through World. engine/gameplay/scene-catalogue.ts and authoring/scene-catalogue-authoring.ts own
that flow; it does not require another per-scene TS entry. Use registered art and the common
composition schema, not an inline drawing in Game. Existing native factories only register new
physical/drawing implementations when needed.

A shared feature is complete when typed controls edit the same source that actual private Game
Play consumes, applicable history/bundle/protected Save/fresh imports work, a compact demo exposes
it, and the real gameplay scene uses it. A read-only source inspector or editor-only simulation
is insufficient. Never silently ignore an unsupported field or reconstitute deleted optional data.
Keep opaque-origin private Play and memory storage; the public editor downloads bundles while the
local loopback service alone writes validated source. See [composer workflow](../../authoring/README.md).

## Choose verification by what changed

Run from packages/plaza-design-demo:

```sh
pnpm test:game --list
pnpm test:game conversation
pnpm test:game scene-batch common-state-owner
pnpm test:game
```

The default runs all current contract checks, each in a fresh process. Selectors match check
filenames; several selectors form a union. `--list` only lists. Logs and scratch source copies
are disposable under repository-root `.game-test-output/`. Tests never need captured old source,
Git commit hashes, milestone acceptance reports or a prior test run. Source-save tests use
isolated copies, not the working game's files or your recovery journal.

| Change | Useful selectors |
| --- | --- |
| Ordinary content/source transactions | scene-batch interaction-crud |
| Conversations | conversation native-dialogue |
| Scalar ownership/current save | common-state all-game-persistence |
| Immediate persistence triggers | persist-source |
| New scenes/routes | scene-catalogue all-scene-world-routes |
| Appearance and rendering | all-scene-layers scene-layers drawing-boundaries art-light lighting-context |
| Communication | communication device-reply |
| Demo isolation | demo-district |
| Editor bundles and source service | public-editor-build authoring-save public-document-bundle |

Choose focused checks for routine work. Run the full suite for broad engine changes. Visual
snapshots describe the approved current renderer; compare pixels in the same browser/font/viewport
configuration. Updating expected pixels is an explicit acceptance action for an intentional visual
change. Render command comparisons test geometry/order, not browser rasterization.
Package TypeScript runs from this package; homepage/design builds run from repository root.

Before handoff: remove replaced execution paths, update current guidance, report what actually
ran and keep user appeal feedback separate. Do not reopen the completed consolidation, add old-save
support, invent performance infrastructure or launch a campaign playthrough as routine validation.
