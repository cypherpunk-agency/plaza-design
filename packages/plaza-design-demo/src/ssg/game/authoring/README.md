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

## Available authoring

All 20 existing scenes have composition, ordinary content, device/controller sources and native
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
building kit. **Storyboard** edits the Storyboard document (`authoring/storyboard.json`, validated by
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
contracts cover all 20 scenes plus selected environment/hack states; see
[the test guide](../../../../scripts/game-tests/README.md).

The agent checks mechanics, permissions, persistence and disposal. User feedback should address
clarity, appeal, pacing and authoring comfort. See [review routes](../docs/reference/REVIEW-GUIDE.md).
For engine ownership and extension recipes read [ENGINE-HANDBOOK.md](../docs/reference/ENGINE-HANDBOOK.md).
