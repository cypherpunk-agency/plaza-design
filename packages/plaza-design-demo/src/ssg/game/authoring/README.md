# World and animation composer

For the current feedback queue, direct local links and task instructions, use
[Pending user review](../docs/design/USER-REVIEW-GUIDE.md). It distinguishes user experience
decisions from mechanics already verified and known work that is not ready for acceptance.

The header browser opens **Compositions** (named chunk arrangements) or individual chunk sources.
For example, `/editor/#composition=boundary-example` opens all members of the Boundary example
in one workspace. The outline shows each source; **Focus** frames a member without leaving that
workspace. Source edits still use ComposerModel history and the protected source Save/bundle path.
Composition membership is an authoring fact, separately from the loading status reported by Play.
Hover and click share one hit target. A highlighted object's selectable rectangle, including gaps
inside a people-flow group or an editor handle, selects that source. Masks and clipping still limit
the target; smaller targets take priority, with paint order breaking equal-size ties. The native
pixel query is only a fallback for paint outside conservative rectangles. Proposal/style frames
retain their own authoring source when borrowing native scene behavior.
Artwork drags check world connections before updating the preview. A connected floor or other
anchor stays in place when moving it would separate endpoints; edit the connection first.
Procedural motion also blocks direct dragging. A rejected drop immediately restores the committed view.

Numeric values throughout the editor support horizontal scrubbing: drag right to increase or left
to decrease, Shift for 10× increments, Alt for 0.1× increments. Click without dragging to type an
exact value; Enter applies it. Escape cancels an active drag. Whole-number fields stay whole and
field ranges are enforced. Artwork drags use the existing transient preview with composition/schema checks during movement;
full prospective game validation runs once on release and rejects the entire edit atomically if
needed. Other numeric source edits retain their registered validation. Scrubbing pauses editor
animation at the playhead and creates one Undo command on release. Numeric fields inside an
Apply/Cancel form still change only that draft; use Apply to change source. Touch keeps native
numeric entry and scrolling. Spinner buttons are hidden; keyboard number entry remains available.

Character dialogue lives in named gameplay conversation graphs. Select the character and use
**Behaviour → Edit conversation definition**, or **Library → Conversations** to browse definitions
and their source-scoped usages. Character name/prompt and conversation binding remain contextual;
pages, choices, conditional entries and progress commands use the common graph controls. Newly
created actors save their graph alongside their source/artwork in one history operation. Disabling
a character's conversation leaves the definition intact; re-enabling retains its edits and state key.
Interaction outcomes that name a conversation also offer **Edit conversation definition**. For
Harbor's supervisor, select **use-boss → Behaviour** for the interaction, or **boss → Behaviour**
for its separately authored actor. Catalogue chunks use the same prospective source assembler,
with their actual composition, devices and shared declarations.
Duplicating an actor-specific conversation creates a graph for the copy with independent saved
progress; a deliberately shared conversation reference stays shared. Named graph references are
the only persisted dialogue format for people and the only talkability marker used by the game.
Native character chatter uses a world bubble; choices/text input use the normal conversation panel.
For a robot using a default voice, Behaviour exposes **Shared robot voice**: its name, prompt and
conversation reference. **Edit robot conversation definition** opens **Robot conversations** in
the same library. **Show usages** lists its shared voice binding and actual consuming chunks.
Each robot keeps independent saved progress. State/command/query IDs under the reusable graph's
ID are specialized into that actor's stable namespace; explicit world-state bindings stay canonical.
Unprefixed dependencies remain shared, and conflicting declarations reject before publication.
Animals use the same contextual binding controls and **Animal conversations** library. An animal
without a shared interaction offers **Enable shared animal interaction**, creating its ordinary
graph and binding together. Removing that interaction retains the reusable graph. Shipped cat and
pigeon replies share `critter.visits`, declared with session lifetime: it survives movement between
chunks during a run, resets with the run, and is omitted from saved files. Speaker names edit the
graph itself; there is no second reply list or speaker-name source in the metadata.

Select a chunk, open **Companion**, then expand **Shared companion definition** for its global
appearance, follow tuning and default interaction. Changes there affect every chunk inheriting
those defaults. The chunk controls its mode and resting places. Following uses a normal condition:
by default, the `pixel` flag. **Override shared follow availability** enables a local condition;
choosing Always explicitly permits following there. Home residence is independent of following.
Local and shared pet references offer **Edit … definition** links to the same conversation library.

Select a door or other native target asset and open **Behaviour** for its prompt, visibility and
outcomes. The link comes from the engine's compiled layout anchor, including mechanism-derived
anchors. Select the chunk's **Logic → Interactions & story → Triggers** to bind conditions to
ordinary system commands. New rules start false and use rising activation; give the trigger an
ID, select a command and author its condition. Device sensors/zones remain on the selected device.
Save restoration establishes the trigger baseline rather than replaying it.

**Developer tools** holds **Test configurations**, **Review shortcuts**, private test beds and
experimental labs. These configure testing and storage isolation; they do not mount world chunks.

**World data → Game settings** groups Launch, Player, Guidance & time, Contacts and Ending.
These edit the default campaign configuration and the original story/contacts/ending sources.
Player exposes abilities, body/name and person-kit appearance. Launch selects a **Starting
checkpoint**; **Edit starting checkpoint** opens its **Starting state** inspector. That is the
single home for starting handle, inventory, flags, scalar values and entry placement. The same
form is used in private Play. Checkpoint entrances/X apply once on fresh arrival; Continue uses
current progress. Fixed/running/story time is a runtime policy, not an editor-only override.
A checkpoint referenced by a run configuration cannot be deleted until the reference is rebound.
New Game also consumes the checkpoint's environment, metro starting state and optional sequence
and time. A start without direction enters play immediately. The shipped Full game and Harbor
checkpoints explicitly reference `glide` at 0 seconds. Source-based reconstruction and private
Play share `world/checkpoint-state.ts` and `runtime/sequence-state.ts`; receipts prevent commands
before the starting playhead from repeating. Continue keeps the current save.
Inside private Play, **Run configuration** chooses campaign capabilities/body/guidance independently
of the selected checkpoint. The default follows the existing frame policy; choose Full game when
reviewing edits to Game settings. Test District offers only its own world configuration. Switching
configuration stops the old isolated run; Play creates a new realm from pending sources.
Test run overrides remain in Developer tools; the default campaign is not offered again in that picker.
**Library → Story logic** edits global system-command milestones, phase policies, cards and
story triggers. Triggers use the same typed conditions as commands: compare registered story
observations (phase, chunk, viewed device, bubble/popup, elapsed timestamp) or declared values.
An optional watch condition starts a presentation timestamp once. Cues handle presentation and
invoke ordinary system-command milestones; attempts and readiness are ordinary session state.
To change a chunk's goals, arrival, exits, barriers or room light in a phase,
select that chunk and use **Story phases**. There is no separate global chunk-phase picker.

**World data → World variables** browses authored scalar declarations across chunk sources and
shared libraries. Filter by declaration, storage key or source, then select a variable. Its type,
default, lifetime, bounds and optional storage binding use the same schema controls as gameplay.
**New world variable** creates a shared declaration; chunks access its prefix through their
ordinary state-declaration controls. Usages list typed conditions/actions/templates and explicit
checkpoint overrides, with Open context buttons where available. Equal local IDs in different
sources remain distinct. A default or checkpoint value is not a readout of the live campaign save.

**World data → City map** uses the game's map renderer with a source inspector beside it. Click a
place or use its picker. **Place** edits its name, physical arrival, district membership, map point
and discovery rule; **Districts** edits district geography; **Travel** edits fares, stations, taxi
routes, locks and references to physical entry rules. **Map layout & discovery** contains broader
topology and place creation/merge controls. These replace the separate Districts and City & travel
screens. Station routes are drafts until Apply; Discard changes no source. Drafts and expanded
sections survive switching map inspector sections. **Preview conditions** is separate from saved
source: simulating discovery, carried keys or flags there never changes the campaign save.

Select a chunk or group under **Chunks and groups**, or click its viewport border label. The
inspector edits its X/Y membership placement, shared group definition, exported endpoints and
connections. Drag a border label to move; Shift-drag moves connected members together. A rejected
move explains the connection constraint and changes no source/history; the last valid preview stays visible.
Moving the origin chunk or its group keeps the editor view and unrelated chunks stationary. Chunk borders can be hidden.

**Mount chunk / group** opens a source picker in the right inspector before changing anything. Apply creates one validated edit;
Cancel creates none. Sources already mounted elsewhere are excluded because a live chunk has one
placement. **New composition** can mount a first chunk or reusable group in the same operation.
**Unmount** retains the source and explicitly confirms affected connections; exported group
endpoints must be reassigned first. An empty composition remains navigable and offers mounting
instead of displaying an unmounted source as though it were still present. **New chunk** creates
source; **More → Remove chunk source** deliberately deletes an authored source and its default
checkpoints, separately from unmounting it. References must remain valid.

Connections open in the right inspector from their viewport label or member controls. Their two
chunks are highlighted; From/To anchors, traversal and optional alignment remain beside the world.
Group endpoints, new compositions/chunks, mounting and removal confirmations use the same inspector
with Apply/Cancel. Cancel and invalid Apply change no source/history; invalid drafts stay visible.
A blocked placement has a persistent wrapping warning above the inspector, with Select connection,
Select containing group where applicable, Shift-drag guidance and expandable technical details.
The header only summarizes the error; it does not carry the full explanation.

**Sequence context** is optional within a composition. Choose **No sequence · base editing** to
hide the timeline and edit base content, or choose a linked sequence for its bottom timeline.
Links, checkpoints, reload and the sequence chooser establish the same explicit, paused direction
context. Switching to base editing also exits camera preview and executes no completion/cancellation
command; pan/zoom
remain editor preferences. Standalone sequences still open directly. `ChunkDocument` is the visual
source type, `AssetInstance` its placed content and `AssetDefinition` its registered definition;
stored `kind: composition`, `scene` and `instances` fields retain their source identities.

Checkpoints extend `world/checkpoints.json`; there is no second starting-state source. Choose one from
the workspace's checkpoint selector. In Play's existing starting-state form, configure its player
chunk/X, world flags, inventory, scalar inputs, clock/weather, optional composition membership and
optional sequence/time. Membership overrides belong to that checkpoint, not the source arrangement.
`checkpointSeed` is the shared lowering to current world state. `sequenceInspection` reconstructs
earlier sequence commands and real mover paths without native triggers/storage/reward observers;
private Play restores those inputs and receipts through the existing playback controllers.
Explicit scalar bindings write their canonical world-state key, never a local alias copy.

Library › Storyboard retains story/status/teaching notes and can link a composition, checkpoint and
sequence. A beat with a checkpoint is a playable starting situation; other beats remain planning or
editor navigation. Branches only navigate. Gameplay transition links reference existing compiled
commands/triggers and identify their source chunk; Logic edits the real rule. Storyboard never runs
conditions or commands. Broken references reject together with other pending source edits.

Reload restores the last composition or chunk and its workspace view in this browser: zoom/pan, playhead and
sequence, timeline layout/scroll/folds, selection, preview settings and outline mode. Each workspace
remembers its own view; explicit composition/checkpoint/chunk links take precedence. Playback resumes paused. These
preferences do not save source edits or game progress. The outline defaults to Order, and both
the layer name and its arrow toggle the layer's contents.

Chunk badges live in the left outline. Click one to inspect its status in the right inspector.
Editing previews say **Prepared for editing**, which is not a claim about gameplay residency.
The viewport's **Chunk status** toggle adds that annotation beside **Chunk borders**; the camera
label identifies the authored camera, not a loaded chunk. During native Scene Play, the outline
shows actual hosted/retained models, lifecycle reasons and mobile entities with their current
chunk. Stop restores the editing outline. These diagnostics consume Game's detached inspection;
they never load chunks or run a second residency calculation in the editor.

Public editor: **https://cypherpunk.agency/editor/**. The same editor is packaged locally.
Public edits remain in the browser; download a bundle before closing. Importing a bundle is one
undoable operation. Public editing does not change the published game or write repository files.

Composition/member editing uses the same source, history, bundle and protected Save as assets;
there are no separate Compositions, Zones or Scenes screens. External chunk connections are
available from the selected chunk inspector's **Connections** section. Draft traversal/endpoints
and offsets together, then Apply; constraints reject atomically. Runtime mount/unmount actions live in shared
system commands; inspect pending/applied state in private Play. A state declaration's optional
**State binding** is a world key: empty uses its qualified declaration ID; an explicit key lets
alternate presentations access the same value. No values are copied.

Select a world sequence's settings object in the outline. **World direction** chooses a world
composition or explicit zones and an origin chunk. Composition mode follows current membership,
without another member list. The bottom timeline edits keyframes and typed command markers,
skip policy and completion/cancellation lists. Event handoffs can select the sequence. Scrub uses
isolated state; private Play runs the full engine. See the [compact example and acceptance](../docs/design/WORLD-FIRST-RUNTIME.md).

Inspector animation uses inline diamonds and previous/next key arrows. A muted hollow diamond
means no animation; a colored hollow diamond means an animated property between keys; a filled
diamond means a key at the playhead. Click to add/remove a key. Animated value edits add/update
that playhead's key; unanimated artwork fields edit their base value. Camera and transient visual
state values create keys. Procedural tracks show their formula and disable direct value/key edits.
Targets in referenced chunks/backdrops can also be keyed: the target stores its source scene ID,
so equal object IDs in different chunks remain distinct. These keys belong to the directing sequence;
they do not rewrite the shared source's base values. Dragging keyed X/Y updates the current keys
in one undoable edit. Numeric fields retain validation without spinner arrows. Position labels are
X and Y; positive Y is upward, using the engine's existing height convention.

Standalone artwork's scalar fields are animatable by default (including color and discrete choices).
Explicit `animatable:false`, structured lists and source/configuration fields remain fixed unless
explicitly opted in. The registry exposes this same eligibility to the evaluator, inspector and grid.
Outside a sequence, muted disabled diamonds explain that a sequence is required to author keys.

Visible artwork is click-picked by replaying captured paint commands with the same primitive painter
on a one-pixel probe. No separate drawing implementation is involved. This respects native masks,
visibility, camera transforms and paint order, including grouped items beyond conservative bounds.
Hover outlines still use inexpensive bounds. Neighboring visible chunks remain selectable through
source-qualified IDs. The camera frame edges and label select Camera. Skies (sun, moon, clouds)
are ordinary `environment.sky` groups in scene/backdrop sources; they paint once in the shared sky
pass. Backdrop sky settings are no longer duplicated in a separate metadata form.

Performance: validators and editor reads share immutable inspection snapshots. Mutable get/list
reads remain detached. Unchanged source subtrees retain identity, while edits/history/save replace
versions and invalidate derived data. Graph and native key metadata cache only identical immutable
inputs; all prospective validation still runs. Drag motion previews skip full document validation and
commit one fully validated transaction on release. Transient movement does not reconstruct the
sequence's isolated simulation on every pointer move. Use `?perf` for local CPU recordings.


## Local workflow

From repository root:

```sh
pnpm --filter plaza-design-demo compose-scenes
```

Open `http://127.0.0.1:4192`. The separate loopback source service uses port 4193. Use `--port`
and `--api-port` to choose others. Ctrl+C stops both. Restart after renderer or schema changes.

1. Select a scene. Layout, logic and private Play refer to the same pending source documents.
2. Change the appropriate typed controls. Edit artwork placement/layers in the composition;
   interactions, actors, objectives, dialogue and access in scene/gameplay source; devices,
   cables and registered controller inputs in their own source.
3. Use Undo/Redo and private Play to inspect pending changes. Play consumes the real game engine,
   including pending companion documents. Stop destroys its isolated realm; Reset uses its selected
   starting fixture. Private progress does not read or write campaign saves.
4. Download edits for transfer or recovery. Import edits into either editor as a validated bundle.
5. In the local composer, use Save to source to commit validated companion changes together.
   Conflicts and invalid references reject atomically. The local recovery journal supports source
   Undo; it is separate from player saves and disposable test output.
6. Rebuild the homepage to use saved edits. Publishing remains a separate action.

The editor uses one shared frame: navigator, stage and inspector. Scene and animation screens,
viewers and world tools retain that common structure.


## Implementation boundaries

- Read `authoring.snapshot()` for an immutable current document view when deriving shared inspector data. Reuse `validationSnapshot` and the prospective registry; do not deep-copy every document or reassemble an already-validated scene for each field/section. Source edits still use the normal validated command/history operations.

- `contracts.ts` owns editor document, preview and extension contracts. Non-UI modules import these types directly.
- `composer-model.ts` owns prospective document validation, grouped changes and undo/redo. There is one model; UI modules never maintain another copy of edited source.
- `app.ts` mounts and coordinates the editor. `controls.ts` builds typed form fields; `temporal-inspector.ts` builds camera/keyframe controls using the existing command port; `timeline-view.ts` draws the editing grid.
- `viewport-input.ts` owns pointer/wheel/viewport-key listeners and transient gestures. Its disposer removes listeners and cancels transient state; a drag still commits one ComposerModel history transaction on release.
- `selection.ts` resolves hit bounds and the source document/instance identity. One selection record owns the source document, instance and optional timeline selection. Inspector identity and mount keys include the source document, including identical local IDs in different sources.
- `inspector.ts` owns regular inspector tabs and mounted section disposal. `temporal-inspector.ts` owns typed sequence/keyframe controls; both call the existing command port.
- `preview-integration.ts` serializes pending renders and coalesces overlapping requests on the existing editor frame loop. Its state contains derived paint results and workspace measurements, not source or gameplay state. Edit/navigation requests invalidate in-flight results, measurements and errors immediately. Playback advances coalesce without starving accepted frames. Disposal prevents queued restarts. Native preview remains authoritative.
- `art/core/geometry.ts` supplies the same projection and canvas/bounds math used by runtime input/cameras and native preview.
- `viewport-navigation.ts` contains stateless pan/zoom calculations. Workspace navigation is local editor state, not authored camera data.
- `runtime/frame.ts` defines common frame inputs and the pure timeline-to-director conversion. Preparation and painting import those contracts; neither imports the other for a conversion helper.
- For screen-relative sky artwork, `View.cameraFrame` provides authored camera layout and its translation into the workspace. Editor zoom must magnify the picture, never change sun size, sky layout or the scene's facing. Parallax follows the game camera; editor pan only translates its result. Weather passes use that same camera layout. Ordinary game frames have no inspection camera.

## Available authoring

All 19 current folder scenes have composition, ordinary content, device/controller sources and native
Play. Ordinary actors, interactions, readables, rest points and exits can be created, removed and
rebound. Existing physical calculations and drawing algorithms remain code primitives with typed
inputs; the editor changes their declared parameters rather than editing arbitrary TypeScript.

Ordinary scenes can be created through the catalogue and connected through world source, without
adding a per-scene TypeScript registry entry. World/story definitions cover places, routes, access,
transport and narrative handoffs. Saved state declarations own their defaults, types and lifetimes.

Native devices are restricted by actual source/controller dependencies, not by whether a device
existed in the original game. Remove or rebind dependent references together. Explicit bindings to
missing artwork, conversations, commands or endpoints must reject. Deleting optional source fields
must not restore hard-coded defaults from an older definition.

Animated compositions use the same registered artwork as the game: attachments, layers, appearance,
clips, camera tracks, text, fades and handoffs. Scrubbing is inspection; it must not grant rewards or
commit a scene transition. A runtime sequence commits its handoff once on completion or valid skip.
Environmental animation uses prepared time, weather and lighting, preserving deterministic seeds.

Asset, character, vehicle and signage viewers show the registered library and supported states.

`Add to scene` uses the artwork's declared placement contract, not its source-folder name.
Reviewed Warehouse/Library/Market/Moth/Capsule/Laundromat and landmark pieces can be added independently;
whole-frame paintings, parent-relative cable geometry and prepared actor/layout snapshots retain
source context. A source role used by gameplay is still protected even when its drawing type is
reusable. Use Open instance to edit a context piece together with its actual bindings.

Sky traffic is `environment.sky-traffic`, with a typed fleet list. It belongs in distance and
paints in the shared frame's sky phase, including isolated asset and world backdrop previews.
Ships use their existing seeded default configuration; removing the source instance removes the
fleet. There is no automatic game/editor fleet fallback. Camera sequences exclude a fleet unless
its explicit `Also draw in camera sequences` field is enabled.
The asset gallery separates **Structure** (Object or Assembly), **Usability** (Reusable anywhere
or Requires source context), **Kind**, District and Source. All filter sections collapse independently.
It opens on reusable artwork. Invisible markers, light/shadow sources, the player layer and the empty
grouping tool live in the separate **Scene helpers** section. Cutscene origin belongs under Source,
not Structure. There are no reusable prefab compositions in the current registered catalogue; the
empty group is a helper, not a finished composition to place.

Artwork explicitly declares `Element.libraryUse: 'reusable'` only when it can be placed using its
own authored properties and shared environment inputs, without source-scene bindings or controller
snapshots. Current reusable entries cover buildings/attachments, authored characters/flocks, stools,
signs and vehicles. A working gallery example, local coordinates or a shared folder is not evidence
of that contract. Other entries remain source-context artwork until extracted and verified. Add
buttons offer reusable entries only. Existing source-context
instances remain editable through their scenes. The gallery fits standalone bounds, uses prepared
context for other previews and skips black opening frames in cinematic thumbnails.
The gallery uses display examples from `asset-examples.ts`: it shows conditional props in their
visible state, removes character window clipping and represents invisible helpers with labeled
diagrams. Unused artwork receives a temporary example in its source scene. These are disposable
preview inputs, never source edits or gameplay commands. Native scene inspection retains actual
state. Off-screen cinematic parts are reframed in a cloned composition for the gallery.
Their catalogues live under `authoring/catalogues/`; they are current configuration, not milestone
acceptance records. Event/source inspection describes hooks and references without executing them.
Captured runtime observations must match the declared scene/expression before being shown as live.

Library holds the artwork explorer and the kit viewers. **Characters** edits the People document
(`art/characters/people.json`: default colour style and seated pose, and each district's people mix of
named looks, actions and robots with weights and tech/robot shares) above a lineup, an Archetypes sheet
and a district mix sample; its preview selects switch styles without saving. **Style frames** pairs each
district's card with its scenes on the stage, including the `downtown-next` proposal built from the
building kit. A proposal (style frame, `authoring/proposal-scenes.ts`) borrows its base scene in one of two ways, set
by its composition's **Base scene use** piece (`scene.base`, logic layer, from ＋ Add artwork › scene): *play* (no
piece, or `use: play`) runs the base's whole definition, so the frame must carry every device, person and exit the
base's manifest names, and Play runs it as the base scene (`downtown-next`, `dt-sweep`); *look* takes only the base's
look (its district climate, so weather and time; its environment's sky, weather, facing and indoor/outdoor; its stage
lamps and casters) and none of its gameplay, with the piece's width as the frame width and the player row as spawn.
A look frame is previewed, not played (`dt-diner` on base `downtown`). The build and Save compile every proposal the
way the stage previews it (`validateProposal`, against the base's saved documents), so a frame the stage refuses fails `pnpm build:homepage`. A
spawn may stand on any level floor (manifest-geometry.ts `onLevelFloor`; the game arrives there through `spawnH`). **Storyboard** edits the Storyboard document (`authoring/storyboard.json`, validated by
`storyboard.ts`): the acts as strips of beats in order, each a place with its district, status (exists,
rework, new), what happens, what it teaches and the scene or style-frame proposal that shows it; picking a
beat puts its scene on the stage. The game does not read it. **Buildings**, **Vehicles** (ground, air, water and rail classes) and **Signs & light**
show the building, vehicle and sign kits. Kit pieces are placed from **＋ Add artwork** on the Scene
stage like any other artwork (ART-GUIDE §2 and §12); it opens the same artwork browser as the Library,
with the same filters, and adds a piece with its Add button or a double-click. The level kit's floors, doors and building
handles are placed the same way; the stage draws them as a diagram (dashed floors with their names,
doors, flight ends, lift stops), and **Inside buildings** (I) previews every building opened. Kits list first, each
followed by its **presets**: named, saved settings of a kit piece (`art/presets/kit-presets.json`,
validated by `kit-presets.ts`), marked Preset. A placed kit piece's **Preset** section in the inspector
saves its settings as a new preset, or updates, renames or deletes one of its kit's presets. A preset is
only settings: what it places is an ordinary kit piece.

On the Scene stage a left press on artwork selects it and drags it once the pointer moves; a left press
on empty space deselects. Middle or right drag pans (right also covers a pen's barrel button), one
finger pans on touch and two fingers zoom. Delete or Backspace deletes the selection; when attached
artwork would go with it, the inspector lists it for confirmation first, and gameplay-bound pieces refuse with the reason.
**＋ New chunk** in the workspace browser creates a source chunk. Choose a checkpoint for its
starting situation; Play consumes pending edits in an isolated frame. **World data → City map**
edits district geography, places, discovery and travel alongside the native map preview.

**Chunk inspector → Connections** (`chunk-connections.ts`) edits the existing
`world/zone-graph.json` links to other arrangements. The selected chunk lists its connections;
Add/Edit opens a complete draft with From/To chunks, traversal, crossing pieces and X/Y offsets.
Align To at left/right edge sets a walk placement. Apply validates the pending native world;
a conflicting loop, missing piece or invalid crossing leaves source and history unchanged.
Internal composition connections use `world-workspace-controls.ts` with registered asset anchors
and group exports. Both compilation and editor alignment call `worldEndpointPosition`; the editor
never reconstructs endpoint placement with a second formula.

In a standalone chunk workspace, **Show neighbours** reveals connected chunks from their pending
sources through the shared renderer; **Fit visible chunks** frames their actual prepared regions.
Named compositions show their mounted members. Neighbour assets are selectable and editable through
source-qualified identities in the same workspace. **Focus** frames a member; **Open source scene**
in the inspector explicitly leaves the composition to open the standalone source. There is no second
read-only neighbour mode or automatic double-click cutover. Private Play uses the pending graph.

A selected **barrier** (`level.barrier`, marked with a padlock in the outline) opens its **Access** tab first
(`barrier-authoring.ts`): the rule as a sentence in large type ("Opens when you carry UPLINK.SO · Refuses with: …"),
then **What it needs**: *Needs key chip* (the pending keyring), *Needs flag* (the declared flags), *Only while* (the
shared gameplay condition picker) and the refusal; each is one history step of the composition. **Test the rule**
switches on the chips, flags and items the rule names (and a story phase) and shows what E would do (*Opens* or
*Refuses: …*), through the same `barrierAccess`, without Play. Phase rules (`phases.<p>.barriers.<id>`) are edited in
Scene › Story phases (Barriers that act differently) and listed here. **Checks** warns of a rule that can never pass
(an unknown chip, a flag nothing declares or sets); warnings do not block Save.

## Isolation and source safety

Private Play uses an opaque-origin frame and memory storage. The static public bundle contains no
source-write service or credentials. The local service accepts allowlisted documents, validates the
prospective whole graph and protects revisions. A source panel or preview alone does not establish
that edits work: verify actual private Play and the relevant Save/fresh reload/bundle/Undo paths.

## Testing and feedback

For local edit profiling, open the composer with `#profile-editor`, then select the scene and
expand **Performance · local CPU recording**. Start, make a few edits, Stop, and download JSON.
The existing recorder measures command/validation, document copies, header/options, outline,
inspector and timeline CPU work alongside the shared render spans. It is inactive by default.
Local recordings may report source identity as unavailable; record the current commit/dirty state
with the file. Timings are CPU work, not GPU completion or end-to-end presentation latency.

View refreshes reuse one detached document snapshot synchronously, then discard it. Validation
derivations are scoped to a prospective pass. `validationInputs` declares the complete immutable
inputs read by semantic validators; a successful semantic result may be reused only while all
those identities remain unchanged. Composition/timeline checks always run. Proposal artwork is
excluded from gameplay dependencies because proposals borrow their base scene's gameplay; native
scene sources and authored catalogue owners remain dependencies. Do not exclude a source that a
validator actually reads. Protected Save still validates the complete prospective source graph.

Use `?demo` for compact Purchases, Conversations and Devices & wiring examples. Review shortcuts
jump directly to the example. The Demo world lab uses real pending definitions with disposable
progress. The isolated manifest example demonstrates ordinary declared content without adding a
campaign location.

Run `pnpm test:game --list` from packages/plaza-design-demo. Select relevant names, for example
`pnpm test:game conversation source-removal`. The default runs all current checks. Test output is
`.game-test-output/` at repository root; old migration captures are unnecessary. Browser visual
contracts cover the current scene set plus selected environment/hack states; see
[the test guide](../../../../scripts/game-tests/README.md).

The agent checks mechanics, permissions, persistence and disposal. User feedback should address
clarity, appeal, pacing and authoring comfort. See [review routes](../docs/reference/REVIEW-GUIDE.md).
For engine ownership and extension recipes read [ENGINE-HANDBOOK.md](../docs/reference/ENGINE-HANDBOOK.md).

## Shared world backdrops and camera sequences

World backdrop compositions live in `world/backdrops/` and are ordinary editable artwork documents.
Open `backdrop-glide-coast` to edit the shared coast; use its Sky inspector for the horizon, style,
world width and atmosphere regions. Scene environment controls reference the backdrop and give the
zone's world x/h origin. Origins must agree with every shared seam; grouped Save rejects a mismatch.
Distance rows stay in the backdrop; walkable ground stays in the scene composition. Set/playfield
artwork may overhang a zone, while distance/backdrop rows clip at its window.

`sequence-opening` owns framing and timeline inputs, not duplicate scene artwork. Edit its camera,
clock, rain and arrival-train tracks there. Click buildings, people or props directly in the
sequence preview to edit the corresponding `authored.glide-*`, harbor or backdrop source without
leaving the sequence. The inspector names the source being edited; Open source scene is optional.
The picker exposes Title, Opening glide, Act I cinematic, Act II cinematic and Taxi flight.
Each is one composition with embedded `sequence` controls; the timeline below edits those fields. Both sequence preview and private Play consume the
pending scene, graph and backdrop documents through the game's shared frame.

### Walkable vehicle pilot

Open `authored.vehicle-lab` and select the `shuttle` frame. Its **Vehicle** tab edits
existing cars and doors, gangways, route points and berths; **Logic → Devices** edits
the same frame/door movers and service timing. Pending edits reach native scene Play and
Demo world. History, bundles and protected Save use the ordinary composition document.
The `cab-panel` sign is bound to the shuttle device and attached to its frame. Moving the panel
in Appearance moves the actual native interaction target too. Manifest geometry validates at
compile time; live displacement is a pure projection of the existing mover through those same
anchors. It does not rewrite authored positions or create another saved vehicle position.
The same manifest projection supports attached uses, readables and rests. Vehicle-lab's
`cab-speaker` and `route-map` are ordinary source interactions; move their artwork in Appearance
and their native E targets follow. Runtime standing floors come from the existing car deck,
independently of the height of the prompt/answer text. No extra position is saved.
Seat benches have typed position/height controls and native sitting; their usable places follow the registered furniture anchors. Existing consists support one/two/three-car presets and Add/Remove car (up to eight). The source edit includes doors, benches, gangways and shell references. Route controls show segment lengths and support split/remove/extend; invalid discontinuities reject atomically. New scene → Preset creates a working shuttle or a shell-only curve/drop cart as ordinary source. Cross-zone route legs select the actual zone; berths name that zone’s floor. Prospective source validation rejects discontinuous routes.


Select a live `character.flow` to open **Passengers**: vehicle, boarding/alighting berths, seed,
spawn interval, walking speed, approach/exit waypoints and queue spacing. Native Play uses actual
vehicle doors and the same identities throughout. Painting only reads prepared people.
For a quick real commute, open Harbor Station → Play fixture **harbor-commute**; it starts at an
open door after checkout. The fixture stores declared shared `shift.*` values in their actual
owner block. It does not create a second copy under the scene.

### Temporary artwork previews

In Library → Artwork, select a reusable piece and keep **Default isolated piece** selected.
Open **Preview settings** to try its registered Properties or Visual state (for example, a pulled
brake or a printed wage slip). The controls are the same typed fields as the scene inspector and
use the same art renderer. Invalid values keep the last valid preview. **Reset preview settings**
restores defaults. These settings are temporary: Add artwork and saved scenes use their own data.
Selecting an existing usage shows that scene's prepared state and hides these overrides.

## Visual keyframe timeline

Sequences use the existing scene editor with a resizable, collapsible timeline docked below the
preview. Expand object/property rows, scrub the ruler, select diamonds or drag them to retime keys
with 60 fps snapping. A drag commits one ComposerModel command; duplicate-time keys reject without
changing source. The right inspector edits the selected key's exact time, value and easing.
Click an object's row to select its actual artwork; selecting tracked artwork in the preview
highlights its rows. Camera and environment tracks select controls rather than a physical prop.
Shots, text cards and fades have selectable duration bars; beats have markers. Their typed time
and content controls appear in the same inspector. Timeline Settings retains advanced sequence
source controls, duration, handoff and loop range. Zoom changes the temporal grid only.

Animation shortcuts work throughout the scene editor and the visible character, vehicle,
building and signage viewers: **Space** play/pause, **comma** previous frame, **period** next frame,
**Left/Right** back/forward one second, **Shift+Left/Right** five seconds. Text fields, selects,
editable fields retain their own keys. **Alt+arrows** nudges artwork; Up/Down
also retain vertical nudging when the scene canvas is focused. Private native Play owns its own
inputs inside its isolated frame.

The sequence outline includes a selectable **Camera**. Its inspector exposes game-camera X,
height and zoom at the playhead, links to their tracks and the active shot; changing a value
sets a keyframe through the same history/save path. The camera-frame label also selects it.
These controls are separate from workspace navigation.

Selecting a property row opens its typed value at the playhead (including Camera height / H).
Set the value and choose **Add / update keyframe**; this creates a key or updates the existing
one at that time, preserving its easing. Scrubbing refreshes the sampled value. The inspector's
key list opens individual time, value and easing controls without editing JSON.
Editing base appearance does not automatically insert a key. Use Add keyframe or Key at playhead.
Striped procedural tracks use their registered motion formula; ordinary key values do not replace
that formula. The timeline is UI over composition.sequence, not a new renderer or saved model.

The sequence outline consistently lists its own controls, referenced scene compositions and shared
backdrops. Selecting a person or prop expands and highlights its source row; deselecting clears
selection without replacing the list. One filter searches all those sources. Outline identities
include both document and instance, so repeated local names in different scenes remain distinct.

Outline source/kind groups start collapsed. Their expansion choices are saved as local editor
preferences; selecting an object reveals its source and kind. The active scene is labelled in the
preview and outline, independently of the inspected object. Scene borders can be toggled.

Sequence editing defaults to Workspace: its independent editor camera stays fixed while the
authored camera frame animates through the world. Wheel zooms, Shift+wheel pans horizontally, and
middle/right drag pans both axes. Zoom range is 5–800%; referenced world scenery outside the shot
can be inspected directly. Fit restores the initial workspace view; Frame camera explicitly
centres and fits the current shot. The Sequence view selector switches to Camera preview for the
finished player picture, including camera movement, framing, fades and cards. Changing modes or
workspace navigation never writes camera tracks or progression. The closing playFit/height blend
changes only the authored camera guide in Workspace. Editing initial camera keys does not reset the
workspace anchor. Timeline rows scroll vertically; Shift+wheel scrolls
time horizontally; Ctrl/Cmd+wheel zooms time around the pointer. These controls do not dirty source.

Playback offers 0.25×, 0.5×, 1×, 1.5×, 2× and 4× speed in the timeline and viewers. The preview
readout shows completed editor renders per second and last CPU render-submission duration, not
GPU/presented FPS. Paused previews are labelled as paused. It is hidden during private native Play.

Discard all changes restores the last loaded/saved baseline across all source owners without a
repository write. Undo can recover that discard as one transaction. Downloading edits does not
change the baseline. Full grouped validation still runs for commits, Save and native reload.

Transient dragging keeps the validated world registry cached by immutable source identity and
rebuilds the affected scene only. Source projections remain coherent; pending edits are rendered
using the same factory and frame renderer. Pointer moves coalesce onto the existing RAF loop.
The focused source-selection check compares transient cached paint operations against full pending
compilation before testing history, protected Save and fresh native reload.

Object outlines stays beside Scene borders in the lower-right viewport toolbar. It draws the
registered visible-object bounds, separately from the animated camera frame and scene boundaries.
Its on/off state is remembered locally across reloads; it never changes source or game artwork.

Chunk boundaries and travelling artwork use the same native frame. Appearance → Visibility at
chunk boundaries offers default/no clip/source chunk/rectangle, with numeric rectangle fields and
an orange selected-clip overlay. Foreground artwork acts as a visible occluder across chunks.
Appearance → People offers numeric spawn timing/speed and typed waypoint actions, chunk coordinates
and explicit Leave sinks. Unqualified waypoints are relative to the flow placement; named chunk
coordinates are local to that chunk. Private Play's Live mobile locations table reads the actual
SceneModels and reports source, current chunk and whether source scenery is hosted. Sources may
unload while their existing mobile models continue; no editor-only simulation is used.


Selected artwork has a **Resolved rendering** disclosure in the inspector. It reports the native
frame's visibility reason, authored/resolved placement, opacity, depth, layer and paint order,
clipping, screen bounds and travelling ownership. These values are read-only and follow playback
and edits. Use Appearance for base values and the existing timeline controls for keyframe overrides.


Native scene assembly uses `sceneSourceDefinition` for folder and catalogue bundles. Resolve
companion IDs through `deviceSourceIdentity`; private Play registrations take a named
`SceneBuildRequest`, never a positional-signature cast. Pending network/shared declarations must
reach the same compiler. The protected Test District scenarios retain their identity/permission
checks. No editor-only gameplay evaluator or extra scene factory is required for a new catalogue scene.

Mall local fittings expose their own dimensions; native bindings optionally link room dimensions.
Harbor stalls accept their own width and an optional prepared vendor. Moth monitor supports and
rig-shelf cables, and Capsule plug cables, are explicit options. Add unbound bodies in another
scene through the ordinary library, then attach/bind only the context that scene actually provides.
The exact supported/retained contracts are in `docs/reference/ARTWORK-ROLE-AUTHORING.md`.

## Opening review and membership changes

The current `harbor-world` composition references the original ten chunk sources. `opening-coast`,
`harbor-arrival` and `harbor-work` are reusable chunk groups, not separate runtimes. The source
arrangement contains all three. Named endpoints may add an X/Y landing offset to a floor anchor;
this describes the actual stair landing without moving either chunk. External rail seams remain
in the ordinary zone graph; placement inside a composition has only one source of truth.

Open these links under your running editor origin (locally, currently `http://127.0.0.1:64422`):

| Checkpoint | Editor path | What to inspect |
| --- | --- | --- |
| Launch coast | `/editor/#checkpoint=review-launch` | Title sequence, directed coast and launch camera. Private Play shows the actual launch menu. |
| City glide | `/editor/#checkpoint=review-glide` | Glide at second 19; scrub the existing bottom timeline, select a source asset, edit base values or its keys. |
| Harbor arrival | `/editor/#checkpoint=review-arrival` | Final frame at second 68; private Play executes the authored completion and releases the real train. |
| First task | `/editor/#checkpoint=review-first-task` | Player beside the supervisor, without walking through the harbor. Use E to advance the arrival line and talk. |
| Regular world | `/editor/#checkpoint=review-world` | Completed shift, morning platform; arrival/work mounted, coast absent. |

Library → Storyboard links these starting points to the original prologue beats. Links with
`&panel=storyboard` keep the storyboard beside the stage. The URL also carries the selected sequence
and playhead. Editor reload restores paused, preserving the workspace framing. Checkpoint selection
frames its player chunk; Focus changes framing without leaving the composition. Stop private Play
returns to the same editing context. Opening another checkpoint disposes the old private session.

The real opening's `intro.hold` command unmounts work during direction; `intro.release` mounts work
before `intro.retire-coast` requests coast removal. Completion and Escape share these commands and
saved receipts. Independent commands may reconcile safe pure additions before a later retirement;
a single atomic edit is never split. Retirement uses existing lifecycle dependencies and may remain
pending while the coast is visible or supplies live movers. Harbor is retained, not rebuilt.
Launch/resume milestones in the opening source mount the launch coast and restore regular membership
when continuing a run. Ordinary pause menus stay above the current scene.

Use **ensure mounted/unmounted** only for explicitly idempotent lifecycle commands. It tolerates an
already absent member or an identical already mounted member; it rejects a conflicting member and
never silently replaces it. Checkpoints with a sequence whose origin is unmounted reject before Play.
Final opening geography, landmarks and pacing remain a designer decision; these review checkpoints
exercise the current content rather than fixing those choices.

The verified prologue/editor tasks and exact review steps are listed in
[Prologue and authoring acceptance](../docs/design/PROLOGUE-AUTHORING-ACCEPTANCE.md).
The Harbor shuttle remains after checkout and through the commute; the ordinary line takes over
once the player enters home (`opening:flat`), away from the platform camera. Phase arrival speech
and goals apply on seamless crossings as well as ordinary entrances.
