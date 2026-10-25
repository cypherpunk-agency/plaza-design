# W1: world composition contract

2026-10-25. Contract/design deliverable, using the [agreed terminology](../reference/TERMINOLOGY.md).
Implemented by the world-first technical goal. See [acceptance and evidence](./WORLD-FIRST-RUNTIME.md)
for verified runtime/editor behavior. Opening geography still awaits the designer.

## Ownership and supported scope

| Fact | Authoritative source/owner |
| --- | --- |
| Chunk content | Existing folder/catalogue source: artwork, physical geometry and declared gameplay |
| Relative layout inside a chunk group | The group's member placements |
| Placement and membership in a world composition | The composition's placed members and its declared membership state |
| Place/district meaning | Existing city/place source and explicit spatial/conditional triggers |
| Live entities, movers, people and scalar state | Existing Game/SceneModel/GameplaySession owners, with stable entity/state identities independent of their chunk presentations |
| Camera/player positions | Existing runtime state, independently expressed against the composition's coordinates |
| Residency and simulation participation | Existing lifecycle modules; derived from camera/player/active dependencies |
| Sequence direction | Existing composition sequence data and runtime-owned playback direction |

Register one companion world source, proposed file `world/compositions.json`, through the existing
source-document registry/store. Use `groups` for named chunk-group definitions and `compositions`
for world compositions. These are definitions and references, never copied scene factories or
another runtime. The editor and runtime must compile the same pending document through the
existing source/geometry pipeline. Validation and source registration are implemented.

A group contains placed chunks. A world composition can place chunks directly and/or groups.
Member IDs are stable local IDs, not display labels. W1 requires only translation (`x`, `h`,
height up), with no chunk scaling, rotation or recursive group nesting. Ordinary artwork retains
its existing transforms. More general grouping is not needed to prove this contract.

A group's membership and technical chunk loading are independent: mounting a group does not
force every member to stay loaded. Unloading a chunk does not remove it from the composition.
An empty composition is valid for explicitly graphic-only contents, not an invisible fallback world.

## Concrete source-backed example

This example uses existing chunks and registered anchors. Each chunk is 320 world units wide.
`platform.origin` and `platform.end` are real anchors of the existing `level.floor` artwork.
The internal connection supplies the existing 320-unit boundary crossing; its former raw seam is removed.

```json
{
  "version": 1,
  "groups": {
    "boundary-street": {
      "name": "Boundary street",
      "members": [
        {"id": "west", "chunk": "boundary-west", "placement": {"x": 0, "h": 0}},
        {"id": "east", "chunk": "boundary-east", "placement": {"x": 320, "h": 0}}
      ],
      "connections": [
        {"id": "walk", "kind": "walk", "a": {"member": "west", "instance": "platform", "anchor": "end"}, "b": {"member": "east", "instance": "platform", "anchor": "origin"}}
      ],
      "exports": {
        "west": {"member": "west", "instance": "platform", "anchor": "origin"},
        "east": {"member": "east", "instance": "platform", "anchor": "end"}
      }
    }
  },
  "compositions": {
    "boundary-example": {
      "name": "Boundary example",
      "members": [
        {"id": "street", "group": "boundary-street", "placement": {"x": 0, "h": 0}}
      ],
      "connections": []
    }
  }
}
```

The layout is `west [0..320] -> east [320..640]`, at height 0. The current cart and walker
retain their source definitions and use the connected positions. Nothing in this example
changes the player's checkpoint, marks a place visited, or invokes an arrival command.

Each member has exactly one of `chunk` or `group` (groups themselves accept chunk members only).
`connections` connect authored anchors; they do not independently store another `dx`/`dh`.
For cross-group connections, an endpoint uses `{member, export}` instead of
`{member, instance, anchor}`. Export names refer to ordinary registered anchors, not new physics
objects. IDs, references and numeric fields validate before the prospective source is accepted.

### One spatial calculation

A compiler resolves member translations, registered anchor positions and connection constraints
into the existing graph/placement contract. It does not introduce another projection. For the
example, the derived existing seam offset is `dx=320, dh=0`. Walk/stair/door rules and route
validation still apply; registered stair/door endpoints retain their physical semantics.

A component has one placement authority: either its existing authored graph
or its new composition, never independently editable offsets in both. Imported group placements
come from the existing graph; migrated internal offsets cease to be independently authored there.
References outside a migrated group attach to its exports. Legacy components remain on the
existing graph until deliberately migrated; there is no silently synthesized fallback geography.

Bounds, culling, drawing, picking, routes and collision consume the same resolved placements.
Deliberate artwork overlaps are allowed. Conflicting physical connections or ambiguous identities
are validation errors; generic overlap does not imply a collision or a reason to reject artwork.
Group movement translates the whole group, but does not change which place it means or reset it.

## One world state and state bindings

There is one authoritative world state. Chunks and their objects access it through bindings;
there is no state-owner concept in the authoring model and no mandatory entity-reference selector.
Existing internal declaration groups are implementation details to simplify as consumers migrate,
not another architectural requirement or another state store.

By default an object's state address is generated deterministically from stable chunk/object IDs.
An explicit binding selects a named world-state address independent of that chunk. Display names,
array indexes and current loading/visibility never determine state keys. If independent placements
of the same stateful source are supported, their generated addresses must also distinguish the
stable placement instance; otherwise reject the ambiguity explicitly.

Copying a chunk needs no special engine construct or copy-mode UI. An author or agent assigns
explicit bindings to the existing keys where continuity is intended and leaves/generated distinct
keys where independent state is intended. This is ordinary source editing, not state copying.

For example, a door in two alternative chunk sources can bind their open field to `shopDoor.open`; its state
then lives once. Facts such as `dwarf.met` and `dwarf.conversationStage` can likewise be accessed
from either source. The current shared scalar declaration/read/write system already provides the
single-root mechanism. Bindings now apply across commands, queries, native fields, text, commerce
and checkpoint settlement; a scalar link does not redirect a mover's runtime checkpoint.

A moving character is a spawned instance with a stable runtime identity. Its source chunk supplies
initial placement and bindings; it does not own the character's continued existence. Crossing a
chunk boundary neither destroys the instance nor spawns a new one. No ECS or complete-character
reference system is introduced merely to make two chunks access the same state.

Placement references still identify artwork and editing sources, e.g. composition/member path plus
local artwork ID. They are not storage addresses. Retain the distinction internally without
requiring authors to configure three independent ownership/reference concepts for every object.

Required proof: alternate chunks A/B bind a door or character's persisted facts to the same keys;
composition change and save/reload preserve those values without transfer, reset or duplicated
physical simulation. The editor exposes an ordinary State binding field (automatic or explicit).

## Composition edits (no special replacement construct)

Mount/unmount are composition membership edits. What authors call replacement is one command or
ordered batch that unmounts content and mounts other ordinary content at the same or a different
position. Support single chunks as well as chunk groups. There is no replacement object, variant
class, inheritance system, automatic override layer or state-transfer mechanism.

Proposed composition-edit payload (not an implemented command opcode):

```json
{
  "composition": "boundary-example",
  "remove": ["street"],
  "add": [
    {"id": "street", "group": "boundary-street-rebuilt", "placement": {"x": 0, "h": 0}}
  ]
}
```

`boundary-street-rebuilt` is an author-created second group used illustratively here, not an
existing source. Its membership, external connection anchors and entity/state bindings must be
valid in the prospective composition. Using the same placed-member ID does not automatically
copy state or establish entity identity. A direct chunk uses `chunk` instead of `group`.

Application contract, accepted in the discussion:

1. Validate the whole proposed composition edit immediately. Bad references/identities/connections
   reject as authoring errors, not indefinite pending operations.
2. Determine active physical/interaction/sequence dependencies before removing occupied content.
   World design should normally trigger these changes while the player/camera are comfortably away.
3. Stage related edits and commit membership coherently; no rendered or simulated intermediate
   frame may contain half of a remove/add batch. Composition membership is the authority.
4. Reconcile residency from the new membership. Unmounting can make content eligible to unload;
   do not require it to be unloaded first if membership is itself what holds it resident.
5. Retain internal resources as necessary until safe disposal. If the physical edit itself is
   unsafe, defer it internally without deleting occupants or teleporting the player. Invisible
   does not always mean unused; a small residency margin avoids churn at the camera edge.
6. Pending/blocking details are editor/private Play diagnostics only. They never become player
   notices, HUD tasks, loading messages or requests for the player to resolve an engine condition.

Membership is part of the one saved world state: `Save.worldMembership` records applied members,
and `Save.worldEdit` records one validated pending command batch until physical dependencies clear. Any deferred
edit has one runtime owner and a defined cancellation/save policy; do not add a general queue
framework or three copied membership models. Its exact persistence encoding is an implementation
detail to prove in W2, not a separate replacement subsystem.

No automatic geometry rollback is required. Mounting/removing/restoring content happens through
explicit authored actions. No entity-state migration is required: the same bound value
continues; a different entity has its own initial state. Story-specific changes are explicit
commands. Historic-save compatibility and heuristic chunk-to-chunk state copying are excluded.

Sequence completion is an authored point plus an ordinary command/list of commands that establishes
normal play. Required actions already committed cannot fire twice when skipping; required remaining
state changes cannot be omitted. Sampling skipped frames is not execution. W4 must define and
verify completion, skip and cancellation through the existing command/event/model owners.

## Editor walkthrough and W2 integration

This is the specified authoring flow, not a screenshot or claim of implemented controls:

1. In the existing World area, choose Compositions and open `boundary-example`.
2. The outline shows `street -> west / east`; selecting a member shows its source, placement,
   connections and exported anchors in the existing typed inspector. No JSON entry is required.
3. Use source pickers to add a chunk or group. The viewport uses the real frame renderer and
   resolved placements; moving `street` moves both chunk placements. Chunk borders and trigger
   regions are optional inspection overlays; they do not become painted world artwork.
4. Open a chunk to edit its ordinary artwork/gameplay with existing tools. Group content is a
   reference to that source, not an editor-only snapshot. Undo/redo and grouped Save are atomic.
5. Add composition-edit actions to a command: unmount `street`, then mount the chosen group at
   the authored position. The engine validates and applies the related edit coherently. A spatial,
   event or condition trigger invokes that command through the shared gameplay system.
6. In private Play, distinguish Mounted, Loaded, Visible and Simulated. An editor-only diagnostic
   might read `Edit deferred: cart still depends on street/west`. No equivalent player message is
   introduced, and this is not permission to teleport the cart.
7. This two-chunk composition intentionally demonstrates a deferred edit: the player/cart
   cannot simply walk out of a group that contains the whole example. W2 must prove successful
   application using a replaceable subgroup with an external holding area (or an explicit authored
   departure), and settle affected routes before applying. Do not promise that moving just the
   camera or waiting for a looping cart will clear every dependency. A safe composition edit applies once;
   reloading does not retrigger the original trigger.
8. Separately move the camera away from a parked player and return. Neither that navigation nor
   inspector selection counts as player arrival or discovery.

Editor bindings add typed State binding controls (automatic or an explicit world-state key). Agents/authors configure
these bindings when copying chunks; no copy-mode wizard, state-owner picker or mandatory separate
entity-reference control is required. Existing typed state/command forms remain the way to edit
values and rules; do not copy stored values between alternative chunks.

W2 implementation touchpoints: world source/validation and existing graph compiler;
authoring/source-documents.ts plus the existing source store/bundle; authoring/entry.ts World
workbench, ordinary outline/inspector/navigation and native preview; runtime state/lifecycle and
existing model/command execution. W3 owns generalized trigger UI; W4 owns command markers and
sequence direction. Do not introduce renderer adapters or a preview-only composition evaluator.

## Validation and completion checklist for the implementation

- Resolve the current boundary example to its existing 0/320 positions and actual floor anchors.
- Reject missing sources, unknown fields, nonfinite placement, duplicate member IDs, cyclic/unsupported
  groups and broken exports/connections before committing source.
- Editing/removing referenced content is a prospective grouped operation; invalid edits roll back.
- Artwork placement and world entity/state identities remain distinct; explicit shared bindings
  survive alternate chunk presentations and cannot fall back to a local-name search.
- Group membership survives source bundle/protected Save/native reload when implemented.
- Composition membership edits commit coherently; any required deferred-edit persistence survives
  reload without replaying actions or exposing pending/blocking messages to players.
- Camera/player loading needs are independent; pinning is based on actual dependencies.
- Ordinary source edits and runtime operations remain separate. Opening design remains open.

This contract defines the source model; the technical goal records runtime/editor verification.
The schema/compiler, typed controls, native preview and runtime operations now implement it.
