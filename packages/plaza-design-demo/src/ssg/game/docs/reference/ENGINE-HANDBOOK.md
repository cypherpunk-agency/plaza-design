# Using and extending the shared game engine

Current implementation guide,2026-10-20. Read [AGENTS.md](../../AGENTS.md) for working rules.
All 20 existing scenes use shared source and typed editor support. Everything remains in design;
this guide describes implementation ownership, not immutable product decisions.
Tests exercise the current engine directly; completed migration evidence is not required.

## The execution model

There is one runtime: the game loop (runtime/game.ts) and each scene's model (SceneModel). Every frame
the loop ticks every hosted scene (`SceneHost.tick`); the model's tick moves its scene time (engine/time.ts
`SceneTime.advance`), and delayed signals, deadlines, movers, zones, clocks and watchdogs follow that time.
No browser timer or second loop drives the game; pausing the engine holds scene time still. Wall-clock
lockouts deliberately keep real time.

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

## Recipe: floors, stairs, lifts and buildings (levels)

Place the level kit in the composition (ART-GUIDE §12, "Levels"); no code. Declared scenes compile it
with engine/level.ts `compileLevel` into `SceneDef.level` (data). There is no level runtime: the game
loop keeps the player's place in the level (`LevelState`: floor, a walk on a flight or a ride in a car,
each building's openness) beside the player and steps it with the pure functions in engine/level.ts
(`levelStep`, `levelUp`/`levelDown`, `levelInteract`, `levelHints`, `levelView`). A lift car is only
its Circuit mover in the scene's model (the elevator's `device`, required); the level reads where it
is, asks it to go, and derives its doors from the mover's trip. A scene without floors keeps one street
line and its jump ledges. Arrival uses the spawn's or the exit marker's height (`spawnH`,
`SceneExit.arriveH`). The renderer receives `View.level` (reveal, lift cars, call buttons); the editor
previews it at rest or opened (environment `inside`).

What the player sees is what the player can use: a flight or lift attached to a building's interior
handle works only from that building's floors. A building floor at street height is walked into from
either side (floor `entry: walk`, the default; `door` keeps a `level.door`); its facade fades with the
player's depth and inside the shell keeps only its `ghost` (none by default). Stairs: ↑/↓ steps on, ←/→
walk along it and letting go stops. An escalator takes whoever walks onto its boarding end. In a car,
↑/↓ choose a floor on its panel and E sends the car; `level.lift-button` pieces (their `lift` field)
light while it is called to their floor. A zone may watch only one `building`'s floors. Stair speed,
reach, door time and reveal speed are kit fields. What E acts on is `nearestPrompt` (a level prompt wins
over a device on the same spot). Check with `pnpm test:game levels tower-lift circuit-movers`; the Tower
lab (scenes/tower) is the example.

## Recipe: make or change any scene (folder scenes)

Every scene is a folder scene: `scenes/<id>/` holds `composition.json`, `scene.json`, `gameplay.json`,
`devices.json` and a README, and no TypeScript. A new scene is listed in scenes/folder-scenes.ts
(`FOLDER_SOURCES`, `FOLDER_DIRS`); scenes/index.ts `NATIVE_SCENES` is that list.
engine/gameplay/folder-scene.ts builds it on the declared path (declared-scene.ts) and the editor
registers it generically. Ordinary changes are edits to those four files, through the editor.

| Wanted | Where |
| --- | --- |
| Placement, layers, animation, what the picture asks for | composition.json (its `bindings`) |
| Arrival, uses, people, exits, objective, `manifest.compile`, `stage` | scene.json |
| Commands, conditions, dialogue, rewards | gameplay.json |
| Devices, verbs, events, cables | devices.json |
| A value the picture needs that the model decides | a binding source |
| Rules, panels, SceneDef fields that need code | a mechanism |

**Stage & compile** (editor: Scene › Stage & compile; authoring/scene-stage-authoring.ts). `scene.json`
`stage` takes from the artwork what scenes used to hard-code (engine/gameplay/scene-stage.ts): `facing`
and `horizon` (an artwork role's property), `shade` front/back, `lights` (`element`, `lamp`, `marker`),
`casters`, `actors` (`clip`, `cull`), `targetAnchors` and `mechanisms`. Each entry names a role
(`manifest.artwork`) or an artwork type, so moving the artwork moves the light with it.
`manifest.compile` (manifest-contract.ts) holds what scenes passed in code: binding `groups`, `groundExits`,
`groundSpawn`, `transformedExits`, `elevatedResponses`, `omitGroundRestHeight`.

**Binding sources** (engine/gameplay/binding-sources.ts). A composition names a source and the engine
supplies it every frame. Built in: `world.light`, `actor.<id>.pose` / `.clip`, `device.<id>.hover`,
`value.<key>` (gameplay values and device observations) and `artwork.<type>.spans`. Anything else is
`<provider>.<key>` from a registered provider.

**A binding provider** works out what a picture needs once per frame from the scene as it stands
(`ctx.engine`, `roles`, `presentation`, `shared`, `world`). Add engine/gameplay/binding-providers/<name>.ts
exporting `provide(keys, (ctx)=>Record<string,Value>)` (binding-keys.ts), add one line to `BINDING_PROVIDERS` in that folder's
index.ts, and name `<name>.<key>` in the composition's bindings. A provider that drives cues declares
`signals` (name and starting stamp); the scene's presentation cues may then target them. Nothing else
registers it: validation and the editor read the same table. `keys` lists what the provider offers:
exact keys and patterns with one typed hole (`front.<instance:downtown.front>.metrics`, `pose.<actor>`,
`<role>` for a presentation flag role, `<use>`); `keysOf<T>()` makes a snapshot's key list complete at
compile time. A composition binding the provider does not offer, or whose hole names nothing that
exists, is refused when the scene is checked (also on the composer's save). check-binding-keys.mts
runs every folder scene and fails when a provider returns a key it does not declare.

**A mechanism** is what a scene takes from the engine beyond its documents: SceneDef fields, `rules`
and `panels` (several are merged, `mergeRules`; a name defined twice is refused), `anchors` for engine
targets, picture-side state and a world binding (`world: true` rebuilds the scene with
the city and line system). Add engine/gameplay/mechanisms/<name>.ts exporting a `SceneMechanism`
(`label`, `requires` artwork roles, `world`, `apply`, optionally `rulesShape`, `check`, `anchors`), add one line to `SCENE_MECHANISMS` in engine/gameplay/scene-mechanisms.ts, and list
the name in `stage.mechanisms`. The editor checkbox appears from the registry. Current set: transitPlatform,
citySkyline, lineRide, gantryLift, dockworkerCarry, devicePulse, targetReset, sandboxBay, yardCrane,
thermal, streetLayers, vehicleRun, streetCamera. Add one only for a new physical calculation; a
fixed value, a light or a shade line is stage data, not a mechanism. Give it a `face`
(`{function, controller?}`): in Logic › Devices and Wiring the scene's mechanisms appear as devices
(`mechanism-<name>`), their parts derived from `rulesShape()` (engine/gameplay/mechanism-parts.ts,
mechanism-face.ts), and the numbers in the `controller` block of that kind (plus the tuning it names)
are editable. Cables work on them: the scene's mechanisms are Circuit devices carried by the scene's
rules (`SceneRules.mechanisms`, a non-enumerable tag so a scene's recorded fingerprint is unchanged;
the build check, `nativeVocabulary(data, mechanisms)`, `validateNativeBindings`, the model and the
editor all read it there; the device document holds no copy). A physical milestone (`inputs`) is a signal of the part `milestones`, raised when
the mechanism emits it (`SceneModel.input`); a derived value is a part whose signal `changed` is raised
when the value differs between ticks (only while a cable listens); each effect is an action of the part
`effects` and runs exactly as an `effect` action would. Panels are listed but not wireable, and a
derived value's `read` is not an action. These devices live in `SceneModel.mechanisms`, not `devices`:
no world presence, board node or hack-vision part, no state of their own. Cables are saved like any
other (`devices.json` `cables`, or `native.wires` for scenes whose shared gameplay owns them), listed
in the Wiring panel and checked by data/check.ts and validateNativeBindings.

State a mechanism keeps for the picture (a hook that eases, a simulation, a prepared frame) has one
home: `ctx.shared`, the per-built-scene map `apply` receives; binding providers read it as
`ctx.shared` under the mechanism's exported key. If that state changes per frame, `apply` also
returns `presentation: {prepare, capture?, restore?}`; the scene runs every mechanism's `prepare`
in order before painting and saves/restores the `capture`s as one record keyed by mechanism name
(beside `signals` when the scene has presentation signals), see `composePresentations`.

**Parity.** When a scene's compiled shape or picture should not change (a migration, a refactor of a
provider or mechanism), record its fingerprint first: `npx tsx scripts/scene-parity-record.mts <id>`
(no id records every scene; goldens in scripts/game-tests/parity/). After the change
`pnpm test:game scene-parity` proves every recorded scene compiles and paints as before. Re-record only
when the change is meant to alter the scene, and say so. The Tower lab is the smallest example.

## Recipe: something that moves, or a place that notices

Give a device an `act` part with a `mover` (stops, speed, axis) or a `sense` part with a `zone`
(from, to, watch); GAME-DATA.md "Movers" and "Zones". No code: the engine adds the verbs
(`go <stop>`, `return`, `arm`, `disarm`) and events (`started`, `arrived`, `enters`, `leaves`), so
pre-wired cables, hack vision and the editor treat them like any part. A level elevator rides a
mover named in its `device` field. Check with `pnpm test:game circuit-movers`; the Tower lab's lift
and lobby sensor are the example. Words: docs/design/CIRCUIT-VOCABULARY.md.

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
