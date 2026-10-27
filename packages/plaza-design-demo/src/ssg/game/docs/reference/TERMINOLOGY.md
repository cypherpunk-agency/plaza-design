# Game and editor terminology

W1 terminology agreed with the user, 2026-10-25. Terms below describe the intended model, not
a claim that all corresponding features are implemented. There is no separate variant concept:
replacement uses ordinary compositions/chunk groups. Source schemas, editor labels and TypeScript
identifiers change only in their scoped implementation work. ROADMAP.md owns work status.

## World and content

| Term | Meaning | Example |
| --- | --- | --- |
| World | The game's spatial content, live entities and authoritative state. Chunk loading is an implementation detail within it. | The city in its current story state, including the player and train. |
| Composition | A named arrangement of one or more chunks and chunk groups. The editor opens this arrangement in its world workspace; it is not another simulation. | The opening coast, a connected district, or a standalone interior accessed as a single-chunk composition. |
| Chunk | A technical unit of spatial content authored, stored and loaded separately. Its edge does not inherently imply an arrival or story event. | One section of the quay. |
| Chunk group | A named collection of chunks with defined relative placement, addressed together by composition operations. It does not imply a narrative location or an indivisible loading unit. | The chunks that form the station building and its surroundings. |
| Place | A meaningful named location used by the game, map and story, independently of chunk boundaries. | Harbor Station, potentially spanning several chunks. |
| District | A larger geographical/story grouping of places. | Downtown. |
| Entity | A live game object with stable identity and authoritative state. It can move between chunks while retaining that identity. | A person, a train, an interactive device. |
| Asset definition | A registered visual building block with typed properties and drawing, bounds and inspection behavior. It can depict an entity or be decorative. | A building facade, sign or train carriage definition. |
| Asset instance | One placed use of an asset definition, identified within its chunk source. Drawing alone does not imply gameplay state. | A particular sign attached to a building. |
| Chunk asset document | A chunk's placed asset instances and optional sequence controls, represented by `ChunkDocument`. This is source content, not a composition of chunks. | Harbor's visual source. |

An editor **object** is a convenient generic selection label, not another ownership category:
the selected thing may be artwork, an entity, a group, a camera or a trigger region. The inspector
must identify what it actually is. An entity may reference several artwork pieces; a chunk can
contain both decorative artwork and the authored definitions that initially place entities.
The source of a definition is not necessarily the current location of its spawned instance.
There is one world state. Chunk objects access it through state bindings: automatic addresses
from stable chunk/object IDs or explicit named keys. Alternative chunk sources can bind to the
same keys. Authors/agents configure copied content's bindings; no special copy-mode UI is needed.
"State owner" is not an authoring concept. "Entity" remains shorthand for a live game object or
spawned instance, not another ownership layer or a mandatory reference field.

**Composition** replaces the earlier synonym "arrangement" in new user-facing design.
It is the named layout being used, not a second World instance or renderer. A standalone cutscene
may author separate contents; whether those contents need world chunks or only assets depends
on the cutscene. Do not force a card, schematic or illustration into physical geography.

Local chunk coordinates, source IDs and floating-origin arithmetic remain valid implementation
details. Place, group and chunk membership are different relationships, not a mandatory hierarchy
of nested containers. This glossary does not settle which districts or chunks the opening shows.

## Time and behavior

| Term | Meaning | Example |
| --- | --- | --- |
| Sequence | Authored direction over time: camera/art tracks and discrete actions, using the existing engine. It may direct the live world or standalone contents. | The opening camera glide. |
| Timeline | The time-based editing/inspection view of a sequence. It is not another saved sequence model. | The bottom time grid with tracks, playhead and action markers. |
| Checkpoint | An authored, isolated preview starting situation. It extends a Play fixture and is not captured campaign history or reverse gameplay scrubbing. | Start at Harbor arrival with an explicitly configured state. |
| Storyboard beat | A navigation/planning entry linking a composition, checkpoint or sequence, alongside story and teaching notes. Actual transitions remain authored gameplay commands and triggers. | Open the first night-shift task for editing or private Play. |
| Keyframe | A property's authored value at a particular sequence time. | Camera height at second 12. |
| Cutscene | A use of a sequence for cinematic presentation, potentially with restricted player control. It does not specify a separate renderer or require the live gameplay world. | A standalone story interlude. |
| Event | A discrete occurrence that can be observed. | Doors opened; a command completed. |
| Condition | A pure test of current state/context. | Player is inside a region and has a pass. |
| Trigger | An authored activation rule using conditions/events and an explicit repetition/history policy to invoke a command. | Start an arrival command when its condition becomes true, once. |
| Trigger region | Authored spatial bounds used by a condition or crossing detector. The region itself does not execute actions. | The station entrance area, editable in the viewport. |
| Command | A named, permission-checked operation with conditions and ordered actions, executed by the existing gameplay system. | Begin the harbor arrival. |
| Action | One operation performed by a command. | Set a flag, request a group replacement, start a sequence. |

Do not equate a keyframe with a command marker. Keyframes describe sampled values; action markers
request discrete command execution. Sampling or scrubbing a timeline cannot repeatedly execute
gameplay commands. Save restoration is not trigger activation and cannot replay completed actions.
An event can be an explicit trigger input; this does not require manufacturing a persistent boolean
for every occurrence. Maintained conditions are not implicit per-frame reward/command loops.

## Membership, loading and changes

- **Mounted:** included in the active world composition, whether its content is currently loaded or not.
- **Loaded:** the engine currently retains the necessary runtime representation.
- **Visible:** its artwork contributes to a camera's picture.
- **Simulated:** its applicable behavior advances under the current simulation policy.
- **Mount/unmount:** change authored/runtime composition membership through explicit operations.
- **Load/unload:** manage technical residency; do not implicitly change composition membership.
- **Replace:** author shorthand for coherent unmount/mount composition edits on a chunk or group;
  not another engine object, variant or state-copy operation.

These are independent facts, not mutually exclusive modes. Editor-only visibility controls are
also distinct from changing the world's membership. Unmounting can enable unloading; active
dependencies may require internal retention or deferral. Engine-blocker diagnostics belong to
editor/private Play, never the player UI. Shared state/entity identity continues without migration.

## Existing names and migration boundary

| Current name | Current use | Vocabulary to use in new explanations |
| --- | --- | --- |
| SceneDef, scenes/, scene.json | Bundled compiled content includes geometry, artwork, gameplay and story metadata. | Name the actual role: chunk source, place rules, artwork composition, etc. A SceneDef is not necessarily one meaningful place. |
| ZoneGraph / zone-graph.json | Connected placements/residency for technical chunks. | Chunk connections/placement graph. Keep identifiers until their actual consumers are deliberately migrated. |
| Circuit zone / zone noun | A spatial sensor watching the player or a mover. | Spatial sensor or trigger region as appropriate; not a world chunk. |
| level / level.floor / LevelSource | Physical floors, links, vehicles and related geometry/physics. | Physical level geometry; not automatically a district, place, chunk or narrative act. |
| ChunkDocument.scene | Existing source/document identity field, retained in source JSON. | Chunk source identity, not proof that the contents constitute a place or cutscene. |

**Scene** is currently overloaded. Do not introduce a new architectural "Scene" above chunks,
or rename standalone sequences to scenes. Prefer the explicit terms above. Existing file/type
names remain until a scoped implementation replaces their responsibility. The E1 contract pass
renames the old asset types to `ChunkDocument`, `AssetDefinition` and `AssetInstance`, without
changing stored IDs, JSON shapes or drawing. Narrative "scene" in ordinary prose is acceptable
when it clearly means a story moment rather than an engine container.

## Concrete example

Harbor is a district containing places such as the station and quay. Their physical content is
partitioned into chunks. A chunk group lets us address a building's content together. The active
world composition can replace the intact building group with a damaged building group. A train is an entity moving through that space;
its carriage artwork draws it. A trigger region can contribute to a condition that invokes an
arrival command. That command can start a sequence. The timeline edits the sequence. Presenting
it cinematically makes it a cutscene; it does not create another renderer.

The grouping in this example illustrates vocabulary, not an approved reclassification of the
current city data or a decision about opening geography.
