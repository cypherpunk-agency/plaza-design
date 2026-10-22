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
lockouts deliberately keep real time. A scene's open panel (toys, the camera) steps on that same tick
(`SceneHost.tick` calls `Panels.step`): a panel's `kit.frame((dt, t) => ...)` gets scene-time deltas, so
easing is scaled by `dt` (`FRAME_MS`), and a panel's delays are `kit.later` (the model's `later`, cancelled
on close). A panel never calls `requestAnimationFrame` or `setTimeout`. The hint lane takes its time from the
communication lane's readable clock (`notices.time`), never `performance.now`.

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
| A story timeline (the opening): phases, gates, cards, triggers, what a scene says in a phase | story/opening.json plus each scene.json `phases` and `wash`; story/story-rules.ts holds the pure rules |

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
State that belongs to no single scene (the harbor night shift across its zones) is declared once in
[world/state-owners.json](../../world/state-owners.json); a scene's gameplay lists the owner in
`sharedState` and then reads and writes its keys like its own. Never copy those declarations into a
scene, and use `stateReads` only to look at another scene's own state. Check: `shared-state-owner`.

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
previews it at rest or opened (environment `inside`). Touch has no input path of its own: the bar's ▲ ▼
(ui/touch-controls.ts) press ↑/↓ into the same key handlers (tap one press, hold climbs) and show only
while `levelArrows` says they act; ACT is E (`scripts/game-tests/check-touch-level-controls.mts`).

What the player sees is what the player can use: a flight or lift attached to a building's interior
handle works only from that building's floors. A building floor at street height is walked into from
either side (floor `entry: walk`, the default; `door` keeps a `level.door`); its facade fades with the
player's depth and inside the shell keeps only its `ghost` (none by default). Stairs: ↑/↓ steps on, ←/→
walk along it and letting go stops. An escalator takes whoever walks onto its boarding end. In a car,
↑/↓ choose a floor on its panel and E sends the car; `level.lift-button` pieces (their `lift` field)
light while it is called to their floor. A zone may watch only one `building`'s floors. Stair speed,
reach, door time and reveal speed are kit fields. What E acts on is `nearestPrompt` (a level prompt wins
over a device on the same spot). Check with `pnpm test:game levels level-styles tower-lift circuit-movers`;
the Tower lab (scenes/tower) is the example.

Every piece has a `style` field (the default is the original look). Stairs: concrete, timber, stone (straight
flights, walked with ←/→), ladder (a steep ladder-stair, leaning its run), switchback (two half-flights and a
landing; comes out above its foot), spiral, rusty-spiral and steel-ladder (straight up; `run` is the width).
Everything but a straight flight is climbed with ↑/↓ held (engine/level.ts `STAIR_SHAPES`); `rail` overrides the
handrail. Escalators: standard, glass. Lifts: goods, cage, passenger-old, glass, gold, service, and broken (an
OUT OF ORDER sign, never called). A flight lands on its own building's floor before the street at the same
height. A floor marked `indoor` (a tunnel, a cellar) is lit as indoors while the player stands on it.

Rooms (`level.room`, the interior kit's storey) can open a building one part at a time, for puzzles and for rooms
nobody has to furnish. Attach the room to its building's interior and the room's artwork to the room. `Opens`:
always (the default: with its building), on arrival (once the player is in it, or rises into it on a stair or in a
lift), or never (a room that is not part of the game). `Once seen`: remember (stays open; saved in
`Save.rooms` by scene) or close (shuts again behind the player). Shut, the room draws its cover (`dark`, `windows`
lit from outside, a hatched `section`, `earth`) and can show light under a door; pieces left outside the room (a
stair's mouth, a lift shaft) stay visible as the way on. Only the room the player is in is live: a remembered room
away from them shows how it looked, its wall darkened and its things faded, without its people and devices (pieces
in the people or devices pass, at any depth). The amounts are `LevelState.rooms` (open) and `LevelState.here`
(the player in it), eased in the level step and handed to each piece by `levelVisualState`, which is also how
lifts and buttons get theirs; every key must be one of the element's visual fields. The editor shows every room open,
or (environment "Rooms as the player sees them") the view after a path of floors, `floor` or `floor@x`, by the
same rule as play. Check with `pnpm test:game level-rooms level-visual-state`.

A barrier (`level.barrier`; `style` turnstile, gate or door; `width` its passage) stands across a floor in the world, not
at a scene exit: shut, `levelBounds` (given the player's x) stops the player on their side, on that floor only. E there
(`barrier:` prompt) goes through `levelPass`, which asks world/access.ts `barrierAccess`: the exits' own rule shapes, a
keyring chip carried (`key`, like an exit's `needs`), a flag set (`flag`, like `requires`) and an optional gameplay condition
(`when`, over flags, items, tokens, the player, time and weather: `validateBarrierCondition`), refusing with `refuse`. A story phase can
replace that rule with an exit's rule shape (scene.json `phases.<p>.barriers.<id>`; story-rules.ts `barrierPhaseRule`, run by `storyExit`: a
gate or acknowledgment opens it when its beat is over, a say or react only speaks); an unknown barrier id there is refused. Passing, it
opens and stays open: `LevelState.opened`, kept in `Save.barriers` by scene (`savedByScene`/`savedForLevel`, like seen rooms);
its picture's `open` is eased in the level step. `mergeLevels` namespaces barriers like every piece; a barrier key is
validated with the exits' keys. The Tower annex's turnstile is the example. The composer's Access tab (authoring/barrier-authoring.ts) edits the
rule with typed pickers, tries it over a fixture through `barrierAccess`, lists its phase rules and warns of a rule that can never pass.
Check with `pnpm test:game level-barriers barrier-authoring`.

The street door seen from inside is `level.entrance` (its `building`; `style` glass, shop, flat or service, each the
inside of the matching street front; a shop door's `sign` reads backwards from inside). It is drawn only while the
player is in that building.

What the player passes behind: a walk-in building's shell front with a `jamb` (units of wall at either side, default 0:
off; the Tower front has 20) and every stair with a handrail (`railInFront`, default on; rungs have none) have a near
part. While the player passes it (engine/level.ts `levelNear`: in a wall edge at a walk-in floor's height, on the flight
or at either end within its reach) the level sets the piece's visual state `near`; its artwork then draws without that
part and paints it in `Element.drawNear`, which the composition draws first in the over-player slot (the same slot as
playfield rows after the player row). So the player goes behind the wall edge and comes out inside, and walks behind a
stair's rail over its treads. The player's place comes in `LevelView.at` (`levelView(lv, m, player)`; a joined level hands
it only to the player's zone). At rest (the editor, parity views) nothing is near and everything draws whole. In hack
vision the over-player slot is drawn after the world is muted, so near parts show unmuted there, like any over-player row.
Check with `pnpm test:game entrance-occlusion`.

## Recipe: zones and seams (two scenes with no cut)

This is step 1 of [SEAMLESS-WORLD.md](../design/SEAMLESS-WORLD.md) as built. The rest of that document is
still a proposal.

Words. A **zone** is a scene: it keeps its id, folder, model, host and save block. A **seam** joins two zones
with no cut and fixes where one sits from the other (`dx`, `dh`). An **exit** is still the cut join (a fade,
the taxi). The zone the player stands in is the **active** zone. It is at (0, 0) and the zones around it are
placed from it (a **floating origin**). There are no world coordinates.

The seams are one source document, `world/zone-graph.json` (source document `zone-graph`, kind transport,
registered in authoring/source-documents.ts). A seam is `{id, kind, a: {zone, piece?}, b: {zone, piece?}, dx, dh}`:
`b`'s origin sits at (`dx`, `dh`) in `a`'s units, and `dh` < 0 is below. `kind` is `walk`, `stairs` or `door`.
`door` validates but nothing walks it yet. world/zone-graph.ts is pure: `validateZoneGraph` checks the shape,
`seamsOf` gives a zone's seams seen from it, `placeFrom(graph, active, hops = 1)` places zones from the active
one, `joined` says whether a zone has any seam, and `worldProblems` checks the graph against the scenes. A scene
with no seam runs exactly as before.

To join two scenes:

1. Both scenes need a level (a `level.floor` at least); a zone without one is not joined.
2. **Walk seam**, side by side: `{"kind": "walk", "a": {"zone": "left"}, "b": {"zone": "right"}, "dx": <left
   zone's width>, "dh": 0}`. Outdoor floors (no `building`) at the same height that meet at the edge walk on
   into each other. That edge no longer walks off (`seamAt` skips `walkOff`).
3. **Stairs seam**, one above the other: a `level.stairs` in one zone whose top (or foot) lands on a
   `level.floor` of the other once the offset is applied. Name both pieces (`a.piece` the stair, `b.piece` the
   floor). The pieces are only checked to exist; the join itself is geometric, so pick `dx`/`dh` so the stair's
   end is on the floor. The lab: `stairs-deck` at x 470, run 120, rise 100 in tower-annex ends at (590, 100);
   tower-deck sits at `dx` 0, `dh` 100, so its `floor-deck` at (590, 0) is at (590, 100) too.
4. Save in the composer. `worldProblems` refuses unknown zones, a walk seam whose `dx` is not the zone's width,
   a stairs or door seam without both pieces or with a missing piece, and loops that place a zone in two places.

How the game walks it (runtime/game.ts). On `enter`, `joinLevel` places the zones one seam away and, if any has
a level, builds one level with engine/level.ts `mergeLevels`. Each zone's pieces are moved by its placement,
and ids and buildings become `zone/id`, so zones never collide; `LevelSource.zones` records where each zone
lies. The level rules then work unchanged: `levelBounds` lets a floor run on into the next zone (`across`),
`levelStep` moves the player onto it, and a stair that lands on another zone's floor climbs into it. Lifts read
their own zone's movers (`Movers`, a function of the zone). `levelZone` names the zone under the player. When
it changes, `crossInto` makes it the active zone in the same frame: the player, camera, bubble and companion
shift by the offset, the level is joined again from the new zone, and the HUD, seen flag and first-visit intro
follow. Nothing closes and nobody is placed again. The camera (`camFollow`, `worldSpan`) clamps to the union of
the active zone and its neighbours; `onResize` fits that span. Rooms seen are kept on the save per zone
(`seenByZone`). The model's own `Zones` get the player in local units, with the building's own name.

How it draws (runtime/render-scene.ts). `renderWorldFrame` is the one renderer for game and editor. A frame
alone draws as before. With `joined`, each neighbour on screen is a `ZoneFrame` (`zoneFrame` in game.ts): its own
view (`cam - dx`, `gy - dh`), scene, host and light from its own facing. `drawJoined` draws it clipped to its
rect: city and street layers, artwork, puddles, casters, actors, shade and `drawFront`. The sky, weather in
front, grade, lights, prompts and bubbles are drawn once, by the active zone. Each zone draws its part of the
level view (`splitLevelView`), which `levelVisualState` hands to its pieces as before. In hack vision a
neighbour is muted whole.

Limits today:

- Only zones one seam away are joined and drawn. From the Tower lab you see the annex, not the deck above it.
- Neighbours are seen, not used: prompts, E and hack vision belong to the active zone.
- A neighbour's layered over-player and foreground pieces are flushed with the active zone's, outside its clip.
- Weather is the active zone's climate (set on `enter`, not on `crossInto`); neighbours share it.
- Residency (world/zone-graph.ts `residency`) decides each frame which joined zones are hosted. `followResidency`
  hosts a visible zone at once and a near one at most one per frame, and unloads a zone past the eviction distance
  (3 view widths): `SceneHost.dispose()` persists, then removes its nodes, window listeners, resize observers, save
  timer, acknowledgment and popup, and disposes the session bound to its model; the model's delayed actions are dropped,
  as on a page reload. The Game drops the cached session and the host, so `hostOf` rebuilds the zone from the save,
  as Continue does. The active zone is never unloaded, and a zone with a panel, popup, hack vision or acknowledgment
  open is held. Check with `pnpm test:game zone-unload residency`.
- Only joined zones (named in the zone graph) unload. A scene with no seams is still kept hosted after you leave it,
  as before; whether those unload too is a separate decision (Tommi). While the player is in an unjoined scene, joined
  hosts are not evaluated, so they stay until the player is back in a joined zone.
- The game imports the built zone graph, so editor Play does not take a pending one. The composer previews each
  zone alone, and there is no world canvas or seam tool yet.

Try it: `?play=tower`, walk right into the annex and take its stair up to the deck (README "Build and
preview"). Check with `pnpm test:game zone-graph level-visual-state`; check-zone-graph.mts is the small
example of a joined level.

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
supplies it every frame. Built in: `world.light`, `actor.<id>.pose` / `.clip`, `held.<instance>`,
`device.<id>.hover`, `value.<key>` (gameplay values and device observations), `artwork.<type>.spans` and
`scene.<name>` (the scene's own values, below). Anything else is `<provider>.<key>` from a registered provider.

**Actors** share one pose source for every scene: `actor.<id>.pose` is the prepared character moved to where its
artwork stands, `actor.<id>.clip` the window it is seen through. What differs between scenes is data in
scene.json `stage.actors` (editor: Scene › Stage & compile › Actor visibility, Held and hidden actors):
`clip` and `cull` (seen through / hidden with an artwork role), `held` (artwork of a type or id that paints its
actor, a stall's vendor or a booth's clerk: the actor's own artwork shows nothing and the holder binds
`held.<its id>`; rebinding the holder gives the actor back), `hide` (a presentation role hidden while a value
holds, e.g. the beach guests ashore until the beach is dangerous) and `stage.atrium` (two artwork roles; the
`far`, `gallery` and `riders` presentation actors are lifted to a storey, the slab or an escalator step,
engine/gameplay/scene-atrium.ts). Harbor, the terminal, Downtown, the stations and the train still pose their
people in their own providers because their positions come from a simulation or a ride.

**Scene values** (scene.json `stage.values`; engine/gameplay/scene-values.ts; editor: Scene › Stage & compile ›
Values; binding `scene.<name>`). A value is a literal or an object that says where it comes from: `flag` (a
presentation flag role) and `use` (an interaction is available) as booleans; `not`, `all`, `any`, `sum`, `list`
and `if/then/else` to combine them ("role A's position if the flag, else role B's"); `role` + `get` (x, h, width,
height, top, right or `prop:<name>` of an artwork role of manifest.artwork) and `rows` + `get` (x or h of every row
of an artwork type); `visible` (an artwork role is on screen, within a margin); `actor` (x, h or "bare" of a
presentation actor); `picture` (a field of the picture the scene's controller prepares,
engine/gameplay/controller-pictures.ts: moth, beach, capsule, laundromat and sandbox register theirs); `engine`
(hover), `signal` (a cosmetic cue stamp: the scene's cues may target it), `world` (the ticker, the dusk palette),
`shared` (a picture a mechanism keeps, e.g. the yard claw) and `live` (only while an engine frame paints,
otherwise the artwork's own default stands). The value `carry` is also what the scene hands the game as the carried
item. Everything is a pure function of the frame; nothing here keeps state or advances anything. A value naming
an interaction, an atrium role or a picture field the scene lacks is refused when the scene is checked
and on the composer's save. Add a controller's picture by registering one function in controller-pictures.ts;
do not add a provider for a scene.

**A binding provider** works out what a picture needs once per frame from the scene as it stands
(`ctx.engine`, `roles`, `presentation`, `shared`, `world`). It is for what cannot be stated as scene values: a
simulation's frame (the metro platform timetable, the train's picture over its movers, Downtown's machines, the harbor's cranes, the terminal's gantry).
Add engine/gameplay/binding-providers/<name>.ts exporting `provide(keys, (ctx)=>Record<string,Value>)`
(binding-keys.ts), add one line to `BINDING_PROVIDERS` in that folder's index.ts, and name `<name>.<key>` in the
composition's bindings. Current set: `scene` (the generic one), `station`, `train`, `downtown`, `harbor`,
`terminal`. A provider that drives cues declares `signals` (name and starting stamp); the scene's presentation
cues may then target them. Nothing else registers it: validation and the editor read the same table. `keys` lists
what the provider offers: exact keys and patterns with one typed hole (`front.<instance:downtown.front>.metrics`,
`pose.<actor>`, `<value>` for a value the scene declares); `keysOf<T>()` makes a snapshot's key list complete
at compile time. A composition binding the provider does not offer, or whose hole names nothing that
exists, is refused when the scene is checked (also on the composer's save). check-binding-keys.mts
runs every folder scene and fails when a provider returns a key it does not declare; check-scene-values.mts
proves the editor controls for values, the atrium and the held/hide actor rules drive the pictures and save.

**A mechanism** is what a scene takes from the engine beyond its documents: SceneDef fields, `rules`
and `panels` (several are merged, `mergeRules`; a name defined twice is refused), `anchors` for engine
targets, picture-side state and a world binding (`world: true` rebuilds the scene with
the city and line system). Add engine/gameplay/mechanisms/<name>.ts exporting a `SceneMechanism`
(`label`, `requires` artwork roles, `world`, `apply`, optionally `rulesShape`, `check`, `anchors`), add one line to `SCENE_MECHANISMS` in engine/gameplay/scene-mechanisms.ts, and list
the name in `stage.mechanisms`. The editor checkbox appears from the registry. Current set: transitPlatform,
citySkyline, lineRide, gantryLift, devicePulse, targetReset, sandboxBay, yardCrane,
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

State a mechanism keeps for the picture (a simulation, a prepared frame) has one
home: `ctx.shared`, the per-built-scene map `apply` receives; binding providers read it as
`ctx.shared` under the mechanism's exported key. Anything that moves is not picture state: it is a
Circuit mover in the model (the gantry's trolley, the van, the claw's hook, the metro car and its doors) and the picture reads it. If
such state changes per frame, `apply` also returns `presentation: {prepare, capture?, restore?}`; the scene runs every mechanism's `prepare`
in order before painting and saves/restores the `capture`s as one record keyed by mechanism name
(beside `signals` when the scene has presentation signals), see `composePresentations`.

**Parity.** When a scene's compiled shape or picture should not change (a migration, a refactor of a
provider or mechanism), record its fingerprint first: `npx tsx scripts/scene-parity-record.mts <id>`
(no id records every scene; goldens in scripts/game-tests/parity/). After the change
`pnpm test:game scene-parity` proves every recorded scene compiles and paints as before. Re-record only
when the change is meant to alter the scene, and say so. The Tower lab is the smallest example.

## Recipe: something that moves, or a place that notices

Give a device an `act` part with a `mover` (stops, speed or ms, axis, ease, paths of legs) or a `sense` part
with a `zone` (from, to, watch); GAME-DATA.md "Movers" and "Zones". No code: the engine adds the verbs
(`go <stop>`, `return`, `arm`, `disarm`) and events (`started`, `arrived`, a leg's `event`, `enters`,
`leaves`), so pre-wired cables, hack vision and the editor treat them like any part. A level elevator
rides a mover named in its `device` field. Use a path for a trip of several legs (a crane's lift: over,
down, up, across, down), a `choice` in it for a branch that reads the scene's state, `follow` for a part
that chases a state key, `load` for what rides along (the picture reads `movers.load`), and a `milestone` on
the part to report a leg's end or a crossing to the scene's code (a physical `input` of its `rules`). A
stop's place may name the scene's artwork (`SceneRules.places`, which a mechanism measures from its roles) or
a device's spot. The one thing code does is send the mover along a path (`SceneModel.runPath` in an effect, or `brake` for its emergency stop); the
picture reads `movers.place`, `position`, `load`, `lastRun`, `legInfo`, `halted`, never a copy. A route that goes round (the metro) is a path that
ends with `run`; a loop line is a `ring`; what a leg needs from the scene's state is `@key`; a part that moves another (a train's doors) is
`drives`; see GAME-DATA.md "Movers" and TRAIN-LINE-RIDE.md. Scene time moves it: drive checks with
`model.tick(ms)`. Check with `pnpm test:game circuit-movers mover-authoring motion-controller`; the Tower lab's lift and lobby sensor, the Downtown van
(`dlv9.chassis`, `gate.beam`), the stacks' gantry (`sts2.trolley`, `port.beam`), the yard's hook (`crane.hook`) and the metro car
(`train.car`, `train.doors`: `pnpm test:game train-ride`) are the examples. Words: docs/design/CIRCUIT-VOCABULARY.md.

## Recipe: a story timeline (phases, gates, cards, triggers)

The opening is data, not a controller. There is no story runtime: `story/story-rules.ts` holds source types and pure functions; the one
game loop (`runtime/game.ts` `stepLoop` -> `updateStory`, `pinStory`, `update`, `drawBeat`/`drawSleep`) applies them, and the few numbers they read
(the frame clock, the loop's `counters`, the player's stillness) are the loop's own. Nothing schedules; scene time still moves only on the
model's tick. A second timeline (shift -> commute -> home) is authored in the same files, with no new loop code.

| Wanted | Where |
| --- | --- |
| Which phase the story is in, what each phase locks, pins and resumes at, who you are in it (`persona`) | story/opening.json `PHASES`, `PHASE_RULES` (ordered flag rules, last row the fallback) |
| What one scene says and does in one phase: goal line, clock time, arrival words, the scripted ride, who answers, exits that act differently, everyday popup actions, story targets, the attention ping | scenes/<id>/scene.json `phases.<phase>` (editor: Scene › Story phases, or Game opening › Scene phases) |
| The room's light cue | scene.json `wash` rules (`washTone`) |
| A timed checkpoint (turnstile), an acknowledging device (concierge) | an exit rule `gate` / `acknowledge` in a phase's `exits` (`gateFrame`) |
| A level barrier that acts differently in a phase | the same exit rule shapes in a phase's `barriers` (`barrierPhaseRule`, `barrierRuleOpens`) |
| Sleep / wait: fade, a card with two clock readings, fade | opening.json `CARDS` (`cardFrame`); a story target with `card` starts one; "wait until..." builds the same card |
| A workflow that fires when counters, elapsed frames and quiet say so (the morning's message, jacking in) | opening.json `TRIGGERS` (`triggerFires`, `triggerStarts`) |
| Counters (tries, last, due, at) | named by the source: a chip or react-exit `cues: [{counter}]`, a trigger's tests; the loop's `counters` record |
| The clock pin and release | a phase's `time` in each scene; `PHASES.<p>.pinned`; `CLOCK.release` (`clockPin`) |
| The attention (idle) ping | `ATTENTION.after` and a phase's `ping` (`attentionDue`, `attentionAim`) |
| The scripted ride | a phase's `ride: {mover, path}`: the Train mover's `home` path (`train.car`), run on the model's tick when the scene is entered |
| A goal hint (a program still missing) | `GOAL_HINTS` (`goalHint`) |
| Contacts and the inbox's words | data/contacts.json (World › Game opening › Contacts) |
| The END card's words | story/end-card.json (World › Game opening › End card); opened by a handoff `presentation: "end"` |

**Cues** are the finite things a gate, an acknowledgment, a card or a trigger makes happen, run in order: `milestone` (a system command of
`WORKFLOWS`; a refused one ends the list), `say` (spoken in chain after the other cues), `print` (deck lines), `sound`, `stage` (bring the
player to a scene's spawn, reset it, companion home), `counter` (add / stamp / reset a group) and `advance` (the city clock jumps). A new kind of
effect is one more cue in `story-rules.ts` and one case in `runCues`; the editor offers it from the same list (authoring/story-fields.ts).

To add a phase: add it to `PHASES` and a `PHASE_RULES` row, then give each scene its `phases.<id>` (only the scenes that differ). The source set
is validated as one graph: a scene's names (exits, devices, nouns, states, readables, mover paths), a phase, a card, a milestone or a stage scene
that does not exist is refused whole (check-opening-from-data.mts). Check: `pnpm test:game story-rules opening-from-data story-authoring`.

The opening can also be played from a script: `scripts/opening-playthrough/` (README there) drives a NEW GAME through it in headless Chrome
against `dist-homepage` and records a trace per beat; `?probe` in the URL exposes the read-only `window.__game.probe()` it reads. That is
a tool for comparing a refactor with a recording, not a regression suite.

## Recipe: a way of playing (play profiles)

The loop never branches on "harbor shift" or "Test District". `runtime/play-profiles.json` (editor: World ›
Play profiles) declares each way of playing; runtime/play-profile.ts picks the active one from the URL
(`?demo`, `?play=harborShift`, else the default) or the editor Play frame, and the existing game loop, save and
slot code read it: `can('map'|'mapKey'|'deck'|'jump'|'hack'|'sudo'|'review')`, `playProfile().start/routes/
player/guidance/clock/chrome/seed`, `saveKey()`, `resumeKey()`, `slotPrefix()`. A profile is data plus pure
helpers; it has no state or tick of its own, and `runtime/game.ts` stays the one loop. The profile decides whether
an ability exists (`Game.hackLocked()` is `!can('hack')` or the opening's own lock); the story still decides when it
is locked. To add or change a way of playing, edit the document; to add an ability, add it to `ABILITIES` in
play-profiles.ts (validated, editor checkbox appears), read it with `can()` where the loop needs it and set it in
every profile. A new player body is one entry in `AVATAR_PAINTERS` (runtime/avatars.ts) and `AVATARS`. Private Play
installs the pending document before it builds the game (`installPlayProfiles`). Check:
`pnpm test:game play-profiles`.

## Recipe: a character, a lock or a review shortcut (game rules documents)

The loop never names a scene, a person or a conversation. What used to be a literal in `runtime/game.ts` is a
source document the loop reads (private Play passes the pending one through `GameRuntimeSources`):

| Document (editor: World ›) | Holds | Loop reads it as |
| --- | --- | --- |
| `engine/gameplay/companion.json` (Companion) | the companion's id, name, painter `look` (`COMPANION_LOOKS`), `speaker`, saved `unlockFlag`, scene `modes`, `avoidPopups`, arrival `greeting`, `follow` tuning, default `pet` recipe | `companionDoc`, `companionHere()` (companion-source.ts); scenes keep `scene.json` `companion` (mode, perches, pet graphs) |
| `engine/gameplay/critter-reactions.json` (Critter dialogue) | per critter `look`, speaker `name`, `prompt`, cycling `talk` replies | `critterReaction()`; the cat and pigeon target and reply |
| `demo/review-stations.json` (Review stations) | review bookmarks (anchored on a use, device or person, with conversation conditions), navigator buttons, the remote-device example, the hint | `reviewStations()`, `reviewActions()`; the navigator only draws what it is given |
| `world/city.json` `LOCKS` (City & travel) | destination locks: `unlockedBy` world flag role, `destinations` (districts, stations, taxi stands), `reason` | `city.transportPermission/transportAccess/lockOpen`; taxi, map and `placeBlocked` |
| `world/transport/metro.json` `locked` (City & travel › station lock) | station → lock id: LINE 0 does not stop there until the lock opens | `metro.syncLocks(world, flags)` each travel tick |

Scene-level flags live in `scene.json`: `stage.resettable {label, confirm, done}` makes `reset <scene id> --yes` start
that scene over in the deck (generic command; its manual line and completion list the declared scenes),
`stage.sudoOnly` keeps a scene out of resume and its reset out of the deck without sudo, and a person's
`promptH` (scene people, editor: People) sets the height of their `[E] TALK` prompt. The jack cable is drawn
for whichever scene's schematic is open and stood at. Controllers dispatch on `controller.kind` (never the scene
id), including camera binding roles. To change any of these, edit the document; to add another critter, painter or
review station, add an entry. Checks: `pnpm test:game companion-source critter-reactions review-stations
scene-reset-flags city-locks loop-scene-ids`. `scene-parity` tolerates the two additive stage fields
(`resettable`, `sudoOnly`) on recorded scenes; every other scene field still must match its golden.

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
| Pieces the player passes behind (wall edges, stair rails) | entrance-occlusion |
| Zones and seams (joined scenes) | zone-graph level-visual-state residency zone-unload |
| Demo isolation | demo-district |
| Play profiles (ways of playing) | play-profiles demo-district play-storage |
| Companion, critters, locks, review stations, reset flags | companion-source critter-reactions review-stations city-locks scene-reset-flags loop-scene-ids |
| Editor bundles and source service | public-editor-build authoring-save public-document-bundle |
| The story timeline (opening) | story-rules opening-from-data story-authoring opening-workflows opening-source-save scene-parity |

Choose focused checks for routine work. Run the full suite for broad engine changes. Visual
snapshots describe the approved current renderer; compare pixels in the same browser/font/viewport
configuration. Updating expected pixels is an explicit acceptance action for an intentional visual
change. Render command comparisons test geometry/order, not browser rasterization.
Package TypeScript runs from this package; homepage/design builds run from repository root.

Before handoff: remove replaced execution paths, update current guidance, report what actually
ran and keep user appeal feedback separate. Do not reopen the completed consolidation, add old-save
support, invent performance infrastructure or launch a campaign playthrough as routine validation.
