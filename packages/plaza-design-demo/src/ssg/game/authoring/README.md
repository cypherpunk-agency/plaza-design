# World and animation composer

For the current feedback queue, direct local links and task instructions, use
[Pending user review](../docs/design/USER-REVIEW-GUIDE.md). It distinguishes user experience
decisions from mechanics already verified and known work that is not ready for acceptance.

Editor layout, colour, type and control rules: [Editor UI](../docs/reference/EDITOR-UI.md).
The editor is moving to docked task workspaces in a neutral grey look; the
[redesign plan](../docs/design/EDITOR-REDESIGN-PLAN.md) lists the phases. Until a phase lands,
this guide describes the current screens.

The header browser opens **Compositions** (named chunk arrangements) or individual chunk sources.
For example, `/editor/#composition=boundary-example` opens all members of the Boundary example
in one workspace. The outline shows each source; **Focus** frames a member without leaving that
workspace. Source edits still use ComposerModel history and the protected source Save/bundle path.
Composition membership is an authoring fact, separately from the loading status reported by Play.

Switching sequence context retains the Workspace view, zoom and ambient animation clock. Timeline
panels reveal or hide canvas area without recentering existing content. Each sequence remembers its
playhead; base editing disables its animated values without restarting clouds or traffic. Workspace
parallax uses a fixed navigation reference, while Camera preview follows the authored game camera.
Sequence-controlled lighting, weather and object properties can still differ from their base values.

Rendering settings use **Inherit / On / Off**, with the effective value and its source displayed
below each control. **Edit source** follows the typed reference to the supplying context.
The available contexts are:

- **Sequence:** the timeline's **Rendering** button opens a staged inspector. The empty target
  means the whole picture; choose a chunk for a member-specific override. Apply changes source;
  Cancel changes nothing. A sequence otherwise inherits its world settings.
- **Composition:** **Composition rendering** under Chunks and groups opens a staged inspector.
- **Member/group:** select its outline row or border label, then use **Member rendering** or
  **Shared group rendering**. These override membership without changing the chunk source.
- **Chunk:** its Scene → Environment → Chunk rendering controls edit base source values. Composition
  and sequence overrides can still supersede these during preview or play.
- **District:** World data → City map → Districts → the district → Rendering or Climate.
  Place controls bind an optional separate climate, such as Beach, and expose that definition.

Climate weights, fixed weather, report text and forecast seed salt are saved authoring data.
The seed salts preserve existing forecasts independently of climate registry ordering. A roof
report is reporting text; use the chunk's ambient/weather geometry to control precipitation.
Toolbar weather remains a temporary preview override. The clock, weather sampling, daylight
and grading algorithms are shared engine behavior.

Grading is applied inside the game camera picture, without washing over the surrounding
workspace. Joined chunk windows resolve overlapping post-effects once in scenery order.
Travelling light additions use their current projected region rather than being clipped to
their spawning chunk. **Actor overlay** controls the native player/actor overlay; a character
embedded in an asset is edited through that asset's visibility. Asset-only cutscenes and the
vehicle gallery explain unavailable world passes instead of offering switches without inputs.

Hover and click share one hit target. A highlighted object's selectable rectangle, including gaps
inside a people-flow group or an editor handle, selects that source. Masks and clipping still limit
the target; smaller targets take priority, with paint order breaking equal-size ties. Drawing-derived
rectangles are shared by hover, click and outlines; small-target padding is invisible. Proposal/style frames
retain their own authoring source when borrowing native scene behavior.
Workspace zoom and framing share the1%–800% range, so wide configured generator routes can be
framed with both endpoint handles visible. This navigation never changes authored camera data.
Artwork drags check world connections before updating the preview. A connected floor or other
anchor stays in place when moving it would separate endpoints; edit the connection first.
Procedural motion also blocks direct dragging. A rejected drop immediately restores the committed view.

Numeric values throughout the editor support horizontal scrubbing: drag right to increase or left
to decrease, Shift for 10× increments, Alt for 0.1× increments. Click without dragging to type an
exact value; Enter applies it. Escape cancels an active drag. Whole-number fields stay whole and
field ranges are enforced. Continuous asset quantities use schema steps as scrub increments, while typed source validation owns validity; between-step animation/unit-converted values remain valid. Count/index/seed inputs retain discrete steps. Artwork drags use the existing transient preview with composition/schema checks during movement;
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

The context line states the checkpoint's authored start separately from the sequence/time being
edited and the current viewing mode. The Direction picker does not rewrite a checkpoint.
It replaces the obsolete, unused Opening sequence preview-setting picker. During sequence editing,
camera properties live on its Camera inspector; inactive base-camera overrides are hidden.
Each sequence remembers its last playhead when closed; checkpoint/storyboard links with an
explicit time still open that time. Reloading the editor's own base-editing URL stays in base
editing rather than silently reactivating the checkpoint's sequence.

Workspace uses a canvas sized to the available editing area, with a stable on-screen world position
and scale. Opening/closing/resizing the timeline reveals or hides area at the edges; navigation
compensates for the canvas centre changing so existing content stays put.
The game-camera layout keeps its separate logical dimensions. Camera preview looks through
that frame; changing its sequence/time deliberately changes that picture. Returning to Workspace
retains its independent navigation. Ordinary game-camera properties and selection never navigate
the workspace. Locate camera, Focus and Fit are explicit navigation actions.

Checkpoints extend `world/checkpoints.json`; there is no second starting-state source. Choose one from
the workspace's checkpoint selector. In Play's existing starting-state form, configure its player
chunk/X, world flags, inventory, scalar inputs, clock/weather, optional composition membership and
optional sequence/time. Membership overrides belong to that checkpoint, not the source arrangement.

Choose **Play from current preview** to start the selected sequence at its visible playhead, or
base editing without a sequence. Choose **Play from checkpoint start** to use that checkpoint's
authored sequence/time instead. Both use checkpoint world-state inputs; this is reconstruction,
not a capture or reverse simulation of arbitrary campaign progress. Editing navigation does not
become player placement. The button names its operation: Play preview or Play checkpoint.

In-place Play uses the preview's logical dimensions and render scale through the existing
GameHost viewport contract. Its isolated realm does not independently choose a responsive pixel
scale or reserve hidden header/footer space. Resizing the display fits that same game-camera
picture; the native camera and sequence remain the sole playback owners. Editing timeline,
labels and outlines are hidden while playing; Play settings, startup errors and live diagnostics
use the existing right inspector. Stop restores the paused editing picture, sequence/playhead and
workspace framing. Choosing another checkpoint in Play's settings uses that checkpoint's direction
context when returning to editing; a checkpoint without a sequence clears the timeline.
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

In Workspace, **Follow camera** beside **Locate camera** keeps the authored camera centred
with a margin while playing or scrubbing. Objects remain editable. Toggle it off to hold the
current workspace view; pan, wheel/keyboard zoom, Fit or Focus also stop following. The preference
is remembered with the workspace view. **Camera preview** still shows only the game picture.

**More preview settings → Pixelated scaling** switches between crisp pixel scaling (default)
and smooth canvas scaling. It applies to the editing and comparison previews and is remembered
with the workspace view. It does not change authored pixel shapes, canvas resolution or game rendering.

Coast ground, coast walls, street surfaces and the harbor work floor expose **Depth below ground**
in their asset properties. Their lower edges and floor patterns use world dimensions, so zooming
out or enlarging the workspace reveals their finite extent rather than stretching them to the screen edge.
The two Ring through-block buildings expose **Building height**; their roof, facade rows and
footing have fixed world dimensions rather than following the preview's top or bottom edge.

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

Ordinary artwork is selected through rectangles captured from its actual current drawing commands,
including transforms, native text metrics and clipping. The drawing runs once; there is no pixel-probe
replay or per-frame bitmap readback. Cached character sprites supply their occupied pixel extent,
not their transparent canvas margins; cast shadows are excluded from body outlines. Separate parts
combine into one object box, and non-drawing assemblies enclose their visible descendants. Curved
paths retain conservative rectangular extents. Small-target padding affects clicking only, not outlines.
Dynamic generators use stable **Configured generator region** bounds instead: cloud fields, sky/road
traffic, flocks, people flows, rain and water surfaces. The box describes the configured route,
spawn area or surface, including empty intervals between emissions; it does not follow individual
particles or currently visible members. Changing its configuration/placement changes the region.
The inspector's always-visible **Visibility** section explains missing drawing separately from
selection. **Show visibility boundary** reveals the authored drawing window; click a labelled
boundary to focus its existing Appearance field. These handles use the asset's registered
drawing-window geometry, not editor-specific clipping calculations.

Far Shore also retains its configured skyline area when its world-X drawing window hides it.
Resolved rendering reports current drawing bounds separately and explains that restriction,
so outline selection and double-click framing still work without changing the game picture.
A drifting blimp contributes its authored spawn position, not an ever-growing travel box. Individual
vehicles and characters still use their drawn body. Camera-relative sky/water surfaces follow their
view dimensions; spatial fields keep their authored extents when viewport culling changes.
Selecting an outline row preserves the outline scroll position. Double-click an asset row or
its artwork to smoothly frame it in Workspace; this changes only editor navigation, never the
authored game camera or playhead. Pan/zoom cancels the move; reduced motion frames immediately.
Neighboring visible chunks remain selectable through source-qualified IDs. The camera frame edges and label select Camera. Skies (atmosphere, sun and moon)
are ordinary `environment.sky` groups in scene/backdrop sources; they paint once in the shared sky
pass. Backdrop sky settings are no longer duplicated in a separate metadata form.
Workspace clears to a neutral dark blue-grey; Camera preview and native Play retain the game background.
Moving the Sky asset translates its camera picture without stretching it. The sunset's thin clouds
are now a separate **Cloud layer** asset in the distance layer: From X / To X, Altitude, Height variation,
Spacing, Drift, Parallax and Seed define a finite world field. The opening's layer is in the shared
`glide-coast` backdrop. Pan/zoom changes which clouds are visible, not their positions or sizes.
**Flight lanes** on the Air Lanes asset use typed inspector rows with route start/end, density ramps,
spacing and craft choice. Patrols, drone streams, blimps and scheduled flights use the same list controls.
The simpler **Sky traffic** fleet has a fixed Route start / Route length; it no longer wraps at viewport width.
Cloud placement and traffic wrapping intentionally change with this spatial model; sun/moon projection
and the authored game camera remain unchanged.

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

**Home / Pos1** seeks to the sequence start; **End** seeks to its end and pauses. These retain
normal text-field behavior while typing and do nothing in base editing without a sequence.
The Direction picker remembers each sequence's last playhead, including when switching to base
editing and reloading. An explicit checkpoint or storyboard time still opens its authored time.

The outline includes a selectable **Camera** in both sequence and base editing. In base editing
its preview X/Y and game-camera zoom controls are explicitly local camera settings, not new source entities or
keyframes; the sky uses this same frame. The guide can be located, selected and previewed even
without a sequence. During a sequence, its inspector exposes game-camera X,
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
can be inspected directly. Fit restores the initial workspace view; Locate camera explicitly
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


## Adding assets consistently

Use the existing registered asset/source workflow and the
[direct-manipulation and naming proposal](../docs/design/ASSET-DIRECT-MANIPULATION.md).
The agreed inspector groups are Transform, Shape / Area, Generation, Appearance, Motion,
Depth, and Visibility & Drawing. Name fields by their actual meaning; specify units/ranges
accurately and reuse existing typed structured controls. Placement, generated dimensions,
routes and drawing restrictions remain distinct. Assets should declare meaningful spatial
controls or explain why edge resizing does not apply; do not infer handles from field names.
Authored fields require the implemented semantic contract in `art/core/fields.ts`. The production
registry validates metadata, defaults and `validateProperties`. Reuse `distance`, `count` and the
semantic decorators; do not infer units from labels. `AssetDefinition.spatial` uses pure controls
from `art/core/spatial.ts`: rectangle edges/corners, range bands, routes, signed endpoints and
chunk drawing-window boundaries. A handle returns only changed properties plus an optional local
origin offset, preserving the opposite edge. Native capture supplies projection, parent transforms
and facing; the existing viewport owns snapping, validation, cancel and history. Derived layout
values belong in `derived()`, never writable duplicate properties.

Building height and floorHeight use `art/buildings/layout.ts`: ground/roof reservations, complete
floors and remainder share one layout. Traffic lanes, patrols and streams are individual assets.
To reuse an arrangement, select its ordinary group and save a preset in the inspector. The preset
stores reusable children without live bindings or external attachments. Add asset → Assembly →
City air traffic inserts seven independently editable children; one Undo removes that insertion.

Keep source/default/preset/sequence-target/key-value/binding conversions atomic when changing a
property name or unit. Seconds/degrees/spatial distances are distinct; native drawing kernels can
retain explicit internal frame/radian parameters. Do not add current-source compatibility aliases.
The asset-contract acceptance ledger records completed coverage and real limits;use the current
authoring contract rather than retired A1 proposal snapshots.

Asset migration and geometry details:

- Scope a conversion to the actual asset definition and its native call sites. A module can contain
  several assets with a property called phase whose meanings differ. Update source uses, presets,
  tracks and any field-pruning lists together. Test native pixels as well as registered defaults.
- `SpatialContract.handles(props, context)` can use the captured native context. Ordinary handles
  use local source units; chunk drawing windows declare chunk space. Camera-space primitives may
  explicitly declare screen space. Do not reconstruct a camera from its X value.
- `verticalRangeControls` edits two authored elevations; `rectangleControls` edits a dimension.
  An elevation called height does not thereby become a resizable height. `repeatedWidthControls`
  edits cell width through the complete arrangement edge while keeping count and seed fixed.
  `viewportElevationControls` places elevation controls in the captured native viewport for
  full-width surfaces. `repetitionExtentControl` edits a chunk-space repeat limit, such as gap
  warnings or girder rivets; it does not resize the viewport-filling slab. Describe that distinction
  in the field label/group, and validate related elevations through the asset's normal validator.
- `environment.sky-traffic` is one selectable camera-space generator with typed craft settings.
  Its particles remain internal; they do not need individual scene instances. `street.traffic`
  is one independently configured road lane. Ordinary groups/presets combine independent lanes,
  patrols and streams; keep each generator's particle configuration with that generator.



Shared artwork dimensions use existing source bindings. The inspector shows the effective value and
an **Edit shared Width/Height** button when another asset supplies a dimension. Selecting that source
keeps the workspace view. A linked dimension has no ineffective numeric input, resize handle or
property track. Add an independent copy to use its own dimensions. Native frame preparation resolves
world-space linked dimensions into the asset's local units once, including parent scale; the source
JSON retains the authored fallback and binding names, never a copied live value.

For native artwork anchored to a screen-top inset, use `screenBaselineControls` with the existing
rectangle control and declare the inset as a screen position. It converts vertical origin adjustments
into that inset so opposite edges stay fixed; ground placement Y is not a substitute. An independent
`screenInsetControl` moves the authored inset. Keep this handle clear of body resize handles. Pure
artwork factories that only close over input values need no serialized-dimension cache; avoid caches
that retain every intermediate width/height from an editor drag.

Radial sources use `radiusControl`: this edits the named radius/reach from its centre, rather than
pretending it is a rectangular body width. Lighting sources painted by the shared illumination pass
use the existing `selection: 'region'` contract so a silent local draw does not erase their controls.
Window-light regions include the source window plus glow; only show window-size controls in window
mode with explicit dimensions. Describe fixed device interaction regions as such: changing a spot's
width/height does not regenerate the device skin. Font measurements use `fontSize`, not physical width.

Linked spatial fields normally use positive values, with zero selecting their local fallback. A genuine zero elevation declares stateOverride.allowZero and uses a distinct unset sentinel (the train ceiling uses -1). Declare the binding's actual space: a local
ceiling/fascia/landing parameter remains local when its object scales; a prepared world dimension
normalizes once through resolved scale. Neither needs a paint/anchor/bounds fallback calculation.
Keep non-body inputs explicit: Mall stock uses `drawingWidth` for culling, and its reflection uses
`shopWidth` as a layout reference. These are distinct from a room's physical width. Native factories
which build structured/seeded geometry may retain an existing bounded cache; keep its lifecycle in
one helper rather than repeating allocation/invalidation paths for every piece.

`circleControls` edits a generated circle's radius while preserving its fixed border, opposite edge
and perpendicular centre; its source origin is the lower-left corner. Use `radiusControl` for a
centred radius/reach parameter instead. `worldElevationControl` represents an absolute elevation
such as a pendant's ceiling attachment; `axisControl` represents a local elevation or displacement.
Rectangle and repeated-width controls accept a pure derived-baseline callback. Keep culling based
on all configurable children: moving a terminal chair away from its desk must not hide that chair.

Explicit framing works for an offscreen world member without moving the authored camera: project its
canonical origin through the captured native view/worldZones, navigate there, then use its normal
captured artwork bounds. Do not fabricate a second offscreen renderer or guess asset positions from
camera X. Awaited editor preview requests finish on an accepted frame after coalescing; callers may
then read captured geometry. Continuous playback does not have to stop or become idle for that wait.

Beach pier controls edit deck width and railing length independently. Beach light sources use
`width`/`height` for window dimensions and `radius` for glow reach; the shared lighting pass
paints them. Their selectable region includes both aperture and glow. Non-window modes expose
only the radius handle. Source dimensions and opposite-edge edits use normal attachment,
projection and Undo paths.

For source depth below a fixed baseline, use depthControl; its lower handle changes the source
extent without moving the top. Viewport-wide sea/sky elevation controls use the captured View,
not guessed object width. Absolute world-elevation inputs (such as the reflection kernel) use
worldElevationControl and declare space world; they do not add placement Y. Repetition-only
limits belong in Visibility & Drawing: dockwork.ground drawingWidth changes its lane dashes,
while the slab fills the viewport. Sign chain/rod handles edit only mount lengths; text-fitted
blade signs expose typography instead of independent body dimensions. axisControl's optional
fixed offset locates a source endpoint above a body without saving another property.

Downtown interior fittings qualify subpart dimensions: windowWidth/deskWidth/barrierWidth,
conduitLength/loomLength/poleHeight; mailbox bottomY and glassTopY are positions. Fixed-count
repetition handles change cell width while retaining count/seed. Conditional controls must hide
inputs ignored by the chosen mount/part. axisControl options can specify a source-derived
endpoint offset and direction (-1 for westward extents); values remain ordinary positive source
lengths. Alarm reachScale is a factor for light/beam extent, not a physical housing dimension.

Palms author height/lean in world units. The existing pixel kernel receives their ART conversion;
use the single two-axis trunk-tip handle so height and lean do not overlap as separate controls.
Generated subpart regions can declare a source-derived rectangle offset (the hose puddle's
spray/flow centre). Keep configured extents stable instead of measuring current particles.
Footbridge deckY is a position and roof height is clearance above it; landing pads conditionally
expose visiting hoverHeight or parked powerPostX. Boats use an explicit world waterLevel and
stable configured hull bounds. Character flows edit routes/boarding through the existing typed
flow editor; riderLift is a riding offset and is not an independently resizable flow envelope.

Train ceiling light/camera/pole heights bind to the ordinary scene.trainCeiling stage value,
whose source is the ceiling marker placement H. Window frames, seats and staff doors do not
accept unused prepared train frames. Linked heights display read-only; Edit shared selects the
ceiling source while preserving workspace navigation. Binding provenance for stage x/h reads
uses placement.x/placement.h; property reads continue to use their authored property names.

For an existing kernel with internal depth, atDepthControls projects through captured View.sx;
choose native pixel-sized geometry or world endpoints to match the kernel. It uses the existing
scale/mirror pivot and pointer projection. Never reconstruct editor-camera corrections from
View.cam. Bounds use the same View through screenBounds. Artwork parallax means the kernel's
internal depth; placement parallax remains its composition anchor depth. New single-depth
assets should normally use placement parallax rather than adding another independent input.
Building-row handles edit configured distribution limits, not the current generated silhouette.
Cloud-sea horizonY is an elevation; depthBelowDeck and maxTowerHeight are lengths. Keep its
selection region configured/stable rather than following each animated billow.

Transit cabin controls distinguish ceilingHeight, roofHeight and maxDoorHeight. The inspector
shows the effective capped door height. Full train length includes every car and intervening
gangway; dragging its outer edge changes the repeated car length while keeping the opposite
edge, car count and gangway length fixed. Prepared train movement offsets controls in the same
captured frame and is never baked into authored placement. Station minStreetY and stair
maxCeilingHeight are source limits; derived values show the effective native elevations.
Selected resize handles take precedence over camera/chunk border hit targets.

Below-ground assets use positive depthBelowStreet and coneDepth lengths; their controls move
in negative Y. The metro entrance's stair-foot handle changes run/depth together, while its
hall-end handle changes hallWidth. A Harbor forklift route endpoint changes travel distance,
not body dimensions. Crane cargo width handles follow the captured crane pose and are absent
when it carries no load. The Downtown alley uses its authored doorOffset directly, without a
self-bound visual copy.

Harbor Shift uses explicit maxTowerHeight/minTowerHeight, trolleyX/dropLength, edgeY/depthBelowGround,
columnGap, wheelOffsetX and roofHeight/roofReach. Controls follow native caps, mirrored shelter
sides, captured trolley motion and visibility. Generated limits/spacing remain distinct from
particle selection or physical body size. Outdoor platform/portal edges edit length/width;
single-flight controls edit the starting point while velocity and timing remain independent.

Every registered production asset explicitly supplies spatial controls or fixedGeometry(reason).
Fieldless assets are included; registry admission no longer supplies an automatic exclusion.
Through-block buildings use physical height above bottomY, fixed floorHeight and derived upper
floor count/remainder. Ring/viaduct endpoints use startX/endX; drawing windows use drawingMinX/
drawingMaxX, distinct from generated extent. pendingRegistryInputs is the shared dependency rule
for semantic validation and immutable preview-registry reuse. Never cache mutable source maps or
skip a changed real scene/world/gameplay input to make edits appear faster.

Structured list/array controls select, reorder, add and remove internal settings through ordinary
ComposerModel edits. Their transient row keys follow those operations and the model's retained
Undo/Redo history; they are not scene identities or a second property store. Changing the selected
asset releases that UI cache. Structured fields use grouped forms rather than a label that targets
the first nested button. Nested configuration is not independently keyframeable; registry admission
rejects that unsupported declaration. Authored units live solely in Field.semantics.unit; reuse
semantic constructors and colorField instead of redundant display-unit hints or local constructors.
Compass angles use bearing (degrees), distinct from placement facing (−1/+1). Native scene-stage
orientation sources explicitly reference bearing; SceneDef.facing is the existing scene output.
Letter sizing uses fontSize, distinct from physical width/height, pixelSize and transform scale.
Resize handles open and highlight their registered inspector fields. During dragging,a compact
viewport readout shows validated values/units; canvas focus preserves Escape cancellation.
Release focuses the matching field for exact entry. The readout reads captured/pending values;
it must never create an independently writable property copy or trigger full panel refreshes
on each pointer movement.
Use role-qualified colors:paintColor for painted surfaces,lightColor for emitted light,textColor
for lettering and fillColor for silhouettes; paletteIndex is a discrete palette selection.
Palm trunkHeight/leanX describe its actual shaping inputs. Spire and reflection generatorScale
are factors,distinct from placement scale. Flock wrapAfterParallax is boolean; native screenWrap
is a compiler option. Swimmer waterDepthFraction places it across the water's perspective band.
