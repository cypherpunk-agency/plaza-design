# Scene and animation composer

Public editor: **https://cypherpunk.agency/editor/**. The same editor is packaged locally.
Public edits remain in the browser; download a bundle before closing. Importing a bundle is one
undoable operation. Public editing does not change the published game or write repository files.

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

- `contracts.ts` owns editor document, preview and extension contracts. Non-UI modules import these types directly.
- `composer-model.ts` owns prospective document validation, grouped changes and undo/redo. There is one model; UI modules never maintain another copy of edited source.
- `app.ts` mounts and coordinates the editor. `controls.ts` builds typed form fields; `temporal-inspector.ts` builds camera/keyframe controls using the existing command port; `timeline-view.ts` draws the editing grid.
- `viewport-input.ts` owns pointer/wheel/viewport-key listeners and transient gestures. Its disposer removes listeners and cancels transient state; a drag still commits one ComposerModel history transaction on release.
- `selection.ts` resolves hit bounds and the source document/instance identity. One selection record owns the source document, instance and optional timeline selection. Inspector identity and mount keys include the source document, including identical local IDs in different sources.
- `inspector.ts` owns regular inspector tabs and mounted section disposal. `temporal-inspector.ts` owns typed sequence/keyframe controls; both call the existing command port.
- `preview-integration.ts` serializes pending renders and coalesces overlapping requests on the existing editor frame loop. Its state contains derived paint results and workspace/crop measurements, not source or gameplay state. Edit/navigation requests invalidate in-flight results, measurements and errors immediately. Playback advances coalesce without starving accepted frames. Disposal prevents queued restarts. Native preview remains authoritative.
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
The artwork gallery separates **Structure** (Object or Composition), **Usability** (Reusable anywhere
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
artwork would go with it, a dialog lists it first, and gameplay-bound pieces refuse with the reason.
**＋ New scene** beside the scene picker creates a scene the same way as World › Scenes. Play on a
scene without a starting state adds the default one and starts. World › Districts creates, renames,
places and removes districts.

**World › Zones** (`zone-graph-authoring.ts`) edits `world/zone-graph.json`, the seams that join scenes
with no cut (docs/design/SEAMLESS-WORLD.md §2, §6.1). The left list shows each seam as From → To with a kind icon
(walk, stairs, door) and a tick or a problem count; the card on the right edits the selected one: kind, the From and
To scenes by name (with *open* links), the stair or door piece on each side (stairs and doors only), and where the To
scene starts (x, height, in the From scene's units). **Align to edge** puts a walk seam's To scene against the From
scene's edge. A diagram draws both scenes at their offsets with the seam marked. Each edit is one history step and is
checked for its shape. Problems against the zones (`worldProblems`: unknown scene or piece, an edge that does not meet,
a loop that disagrees) appear in plain words beside the field they concern, and protected Save refuses them.

In the Scene view, a scene joined by seams shows its neighbours one seam away, drawn live from their pending
sources by the shared frame renderer. **Show joined scenes** in the toolbar (on by default) turns them on or off;
**Fit joined** zooms out to frame the scene with them. Each neighbour is dimmed and tagged ("Tower annex · joined →")
because it is read-only here; the tag's **Go to …** button, or a double-click on it, opens that scene. Private Play
uses the pending graph.

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
editable content and open dialogs retain their own keys. **Alt+arrows** nudges artwork; Up/Down
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
