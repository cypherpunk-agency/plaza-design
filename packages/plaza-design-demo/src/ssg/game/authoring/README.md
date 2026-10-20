# Scene and animation composer

Public editor address: **https://cypherpunk.agency/editor/**. This checkout contains the
scene/timeline editor, native device/connection authoring, asset viewers and event/source inspector.
Local goal changes require separate publication before they appear on the public site.
Edits stay in your browser session; **Download edits** saves a portable JSON bundle and
**Import edits** restores it in either the public or local composer, as one undoable operation.
**Export JSON** still downloads the selected individual source document. Download before
closing the page. The public editor does not change the published game or repository files.

To apply a downloaded bundle to the repository, open the local composer, use **Import edits**,
review the changes and use **Save to source**. Its existing validation and conflict protections
still apply. Publishing the resulting game remains a separate action.

Run from the repository root:

```
pnpm --filter plaza-design-demo compose-scenes
```

Open `http://127.0.0.1:4192`. The launcher starts a separate loopback save service at
port 4193. `--port` and `--api-port` select other ports. Ctrl+C stops both services.
The homepage build packages a separate static `/editor/` entry with validated documents and
allowlisted read-only source text. The game page does not import it, and the public browser
bundle never includes the local write service, credentials or a filesystem endpoint.

The selector includes all 19 scene compositions, four sequence compositions, two timeline
documents. Tool panels also use per-scene device sources, city/metro/bot sources, reusable Play
fixtures and registered scene/gameplay documents. Current packaging: 98 source documents / 129 source references. Scene-content registration
covers Harbor Shift, Shop, Library, Laundromat, Warehouse, Mall, Market, Stacks, Metro, Galleria Station,
Harbor Station, Train, Capsule, Yard, Moth, Sandbox, Beach, Harbor and Downtown. All 19 now have source registrations;
Their ordinary content, existing controller parameters and world/story links use shared source. Engine targets expose visibility, labels,
responses, native action fields and exit routing in Logic. Touch-specific arrival pages are editable.
Actor and ordinary-content creation/deletion/rebinding, controller forms and world editing are
implemented, with separate evidence for content, controllers and world links. All19 scenes have
native Play; pending edits, Undo/private snapshot isolation and Reset are checked. Whole-goal
editor, preservation and cleanup acceptance remains separate. See
[the active execution ledger](../ENGINE-CONSOLIDATION-STATUS.md).

Native device editing now checks actual controller/source dependencies rather than protecting
every original device or noun. Native targets and presentation cues support collection editing
within their registered capabilities. The actor inspector also exposes reaction and appearance
overrides; deleting optional source settings keeps them deleted. World access policies bind map
admission and gate visuals to actual scene-exit permissions. These changes have focused source
Save/native runtime evidence; final editor integration and removal acceptance remains separate.

Historical S0–S13 evidence remains in [the scene-system ledger](../SCENE-SYSTEM-STATUS.md) and
[stretch evidence](../docs/reference/SCENE-SYSTEM-STRETCH-EVIDENCE.md).

All19 native scenes now expose ordinary source bindings and actor collections in Logic. There are
287 original source actor bodies; empty Capsule,Yard and Moth collections support actor creation too.
Actor removal previews bound content removal and decorative attachment detachment; spawn,width,
follower and controller dependencies must remain valid. Logic → Environment edits fixed atmosphere
settings; geometry-derived facing,horizon,shade and weather covers remain in their named Layout
artwork. Existing controller/network contracts and world/story authoring have separate accepted
evidence; see the execution ledger for final editor and preservation status.

The editor is organised around scenes. The top bar has the **scene picker** (places, then
sequences and timelines; ● marks unsaved edits in a scene's composition or its scene/gameplay
documents), one Undo/Redo, Download edits or Save to source, and a **More** menu for
import/export/reset. Export/Import JSON act on the document the open panel edits. Every edit,
in any panel, joins the same history and is saved by the same button.

The tab row has Scene and Logic, plus Library, World and Labs. Play runs on the Scene stage:

- **Scene** is the editor: an outline on the left, the preview with its toolbar in the middle, and
  an inspector on the right. Select artwork to edit it; with nothing selected the inspector shows the
  scene's own settings (arrival, environment, companion, actors, content bindings, goals and time).
- **Logic** lists all of the scene's logic at once: *Interactions & story* (the scene document),
  *Commands & dialogue* (the gameplay document), *Devices* (native parameters, nouns and seals), then
  the wiring panels *Starting cables* and the read-only *Events* inspector. Its supported scenes follow
  the registered content list above; Commands also covers the native Beach device slice.
- **Play** is not a tab: ▶ Play scene in the Scene toolbar runs the scene from one of its starting states
  on the Scene stage, in place of the canvas, and ■ Stop returns to editing. The **Compare** select shows
  another version (a proposal and its base) beside the scene with the same camera, zoom, time and weather.
- The Scene toolbar's **State** select picks the scene's saved world state: Play's starting states in
  `play-fixtures.json` (day, minute, weather, seed, story flags). The stage shows the scene in that state and
  ▶ Play starts from it. With a state chosen, the time and weather controls edit it (saved, undoable);
  "preview only" changes nothing saved. A proposal scene uses its base scene's states.
- **Library** holds the artwork explorer and the Characters/Style frames/Vehicles/Signs viewers.
  Artwork has a district bar on the left: a piece belongs to every district whose scenes use it
  ("Elsewhere" is unused or sequence-only artwork). Characters has a **Crowd** view that samples a
  district's crowd mix (`art/characters/crowds.ts`: plain vs kitted people, wardrobe, acts, robots)
  across the back, play and near rows. **Style frames** pairs each district's card (`style-frames.ts`:
  proposed palette, light, materials, signage, landmark, crowd) with its scenes rendered at a chosen
  time, weather and camera. All three are read-only previews of the 2026-10-20 art direction.
- **Proposal scenes** (`proposal-scenes.ts`) are editor-only redraws of an existing scene with their own
  composition file under `art/proposals/`. Each borrows its base scene's native definition (sky, weather,
  lighting, devices, people), so it renders exactly as the base would with different artwork. Style frames
  shows a scene and its proposal one above the other. They are not registered with the game, the city or Play.
  `downtown-next` is the first: today's Downtown made taller and denser (extra storeys, AC units, stacked
  plates, blade signs, ad screens, cameras, Market tenements in the midground, a street crowd).
- **World** holds what is shared between scenes: the **City map** (opening a place switches the
  editor to that scene), Game opening, Companion dialogue, Networks, Scenes, City & travel and
  Bot dialogue.
- **Labs** holds developer test beds outside the scene workflow: Demo world and the manifest pilot.

A view the selected scene cannot use yet shows why, with links to the scenes it supports;
it never switches scenes on its own. Long typed forms start with their sections collapsed; a
section's open state is kept while the panel stays mounted.

**Inspector.** For selected artwork the inspector has tabs. *Appearance* edits position, look
fields, attachment and shows read-only gameplay bindings. *Behaviour* shows only the scene-logic
entries that point at that artwork: actors (by `actors[].instance` or an `actor.<id>.*` binding),
the people entry of the same id, manifest-bound interactions, readables, exits and rests, and
presentation cues that target it. Artwork bound to a device (`device.<id>.*`) also gets *Device*
(that device's nouns, verbs and parameters) and *Wiring* (starting cables to and from it). These
are the same typed editors as in Logic, mounted in a focused mode
(`mountSceneAuthoring` `focus`, `mountDeviceAuthoring` `focused`), so every edit goes through the
same validators and history. Manifest artwork bindings and existing artwork state bindings both
resolve to these tabs. Multiple devices attached to one object get a Device/Wiring pair for each.
The mapping lives in `entry.ts` (`inspectorSections`); the composer only knows `ComposerConfig.inspector`.
Procedural drawing and continuous simulation remain registered code with typed inputs.

Starting cables expose their endpoints, verb and **fixed** policy to authors. Fixed prevents
player rewiring; it does not make source immutable. Talk actions always select an explicit
conversation graph, so deleting a referenced graph is rejected until its users are rebound.

**Toolbar.** *＋ Add artwork* (or A) opens a searchable picture grid of every registered piece,
with pieces already in the scene first. The new piece is measured off-screen once and placed at the
centre of the view on the floor, then selected. *▶ Animate* (or Space) runs the scene's ambient
animation clock without playing the game; ⟲ returns to the first frame. *Preview* sets time of day
(Morning/Noon/Evening/Night), weather and hack vision; everything else (city day and minute, weather
seed, story flags, device state, presentation controller, reduced motion, camera fields) sits under
*More preview settings*. *Grid* sets the drag and nudge snap. *▶ Play scene* opens Play and starts
it. With a starting state selected, time/weather edits belong to that state; other preview-only
options stay outside source.

The preview is cropped to the artwork's height (**Crop**), zooms with Ctrl/⌘+wheel, pinch or the
−/+ buttons (**Fit** resets), and pans by dragging or with Shift+wheel. Zoom renders natively
rather than scaling pixels. Horizontal panning moves the native camera; vertical framing uses the
cropped canvas and scrolling, because scene backdrops anchor to the floor. Clicking selects the
smallest artwork under the pointer, with a minimum target size, and hovering names it; hovering a
row in the outline outlines the same artwork. Clicking empty space, in the scene or in the dark
area around it, deselects. Only the selected artwork can be dragged; pressing anything else selects
it on release and pans while moving. Arrow keys nudge the selection (Shift for 10, otherwise the
grid step); Delete removes it; Escape clears it; +, − and 0 zoom; F fits. None of this framing is saved.

Every row shows its broad kind on the right: Player, Human, Animal, Robot, Vehicle, Furniture,
Machine, Light, Sign, Prop, Building, Scenery, Effect, Marker or Group. **Kind** groups top-level
artwork by it, with nested artwork under its parent. The filter matches id, type or label. Kinds
come from `layer-roles.ts`: characters from their actor look (body, bot or critter), everything else
from type name and label, with the registered category as a fallback. They are not written to
compositions. The artwork library and the Add artwork picker filter by the same kinds; the old
per-artwork category ("family") is still searchable as a tag.

**Order** shows how the scene is drawn. For a layered scene (Library so far) it is the layer stack,
front at the top: Foreground, Playfield, Set, Backdrop, Distance, with the engine's own layers
(sky/city/street, shade, light and grade, prompts) as greyed dividers and the Logic layer (markers)
listed separately. The **Player** in the Playfield is drawn in the preview: its place in the stack
is where the player and engine-drawn walkers are drawn (rows above it draw over them), and its
position is where the player arrives (Library's manifest spawn points at it). Drag rows within or
between layers, or use **Layer**, **Bring forward** and **Send backward** in the inspector. The stack
is in `layer-stack.ts`.

Each layer folds with its arrow (or a double-click on its heading). The eye at the right of each row and layer hides it in the editor preview (also for selection); Alt-click
shows only that row or layer, and **Show all** clears it. Hiding is view state: never saved, never
applied in Play.

Drag the inner edge of the outline or the inspector to resize it; double-click the edge to reset. The
widths are remembered per browser. Scenes not yet migrated still show document order and the older Drawing
pass/Draw order fields.

Under 760px the editor becomes one column with a sticky preview, the zoom bar below it, and an
Outline/Inspector switch; the Add picker covers the screen.

In editor Play the game's *Review shortcuts* panel starts collapsed so it does not cover the scene;
`/?demo` keeps it open.

The S8 read-only asset browser is **Library › Artwork**: a grid of thumbnails drawn by the
same isolated preview (world-coordinate pieces use their first scene usage). Search by type,
name or tag, filter families, inspect embedded library components, and choose a real source
usage for its isolated prepared preview. Preview zoom does not edit the asset. **Open instance**
selects its exact source placement in the ordinary composer; **Add to …** places the piece in
the open scene. Metadata distinguishes defaults
from resolved transforms/visibility/anchors. Cinematic-only pieces open their native sequence
context; conditional or non-painting pieces report invisible snapshots. See the
[stretch evidence ledger](../docs/reference/SCENE-SYSTEM-STRETCH-EVIDENCE.md).

Characters and Vehicles open on a **Lineup**: up to eight variants (or every placeable road
vehicle) side by side at true scale next to the player, on a metre ruler, with a **Depth** band
switch (Far, Back, Play, Near; see ART-GUIDE §2 and `art/core/depth.ts`). Clicking one opens it in
**Single** view. Actors in Logic use the same **Depth** choice instead of separate pixel size,
parallax and dimming ("custom" shows those numbers), and their action list offers the actions their
body really animates (`KIT_ACTS` in `runtime/characters.ts`; a value a scene already uses stays
selectable). **Road vehicle** (`vehicle.road`) places a car, cab, van, bus, truck, yard tractor or
forklift in any scene: parked (optionally with the driver's door open) or driving along a lane,
with turning wheels and exhaust, at a depth band.

Open one workbench panel at a time. Characters offers the supported humans, animals and robots,
appearance controls and actual native animation inputs. Vehicles offers ground, flying, rail
and water families, supported cargo/passenger inputs, and explicitly labeled inspection routes.
Signs, lighting and architecture offers native kernels plus real scene usages; composed mode
retains scene overlap, lighting and weather, while isolated mode shows the selected registered
parts. Unsupported controls are disabled or explained. These panels are viewers: their controls
do not save changes to artwork or advance the game. Playback, frame stepping, seeking and
reduced motion affect only the open preview; closing a panel disposes its clock.

**Gameplay** edits `gameplay: harbor-shift-gameplay` through typed controls for supervisor/Mara
dialogue, choices, entry conditions, command conditions/actions and event reactions. IDs and
invocation permissions are protected for this pilot. Each accepted pending edit resets the
isolated laboratory against that document; Undo/Redo and import use the same history.
Talk to the supervisor, accept or decline, collect a parcel, then hand it over normally or
deliver it through an actual native signal cable. Advance the private clock to observe the
150 ms delivery, cut/reconnect, reset, and inspect committed events. The lab does not read/write
player storage. Download/import edits work publicly; the header's **Save to source** uses the local
protected service. Laboratory state and committed events sit in a collapsed debug section. Rebuild the homepage after saving to use the changed gameplay in the game.
The **Play** mode runs the actual Harbor Shift, Sandbox, Shop, Library, Laundromat, Market or Beach game using pending source.
It plays the scene chosen in the header. Choose one of that scene's reusable fixtures (or create
one if it has none), then Play, Stop or Reset play; leaving the tab stops its
sandboxed realm. Keyboard and existing landscape touch controls are shared with the game.
**Starting state** exposes typed flags, inventory, tokens, modules, programs, keyring, native
scene state, city day/minute/seed, weather and optional spawn. Story clock follows scene
milestones; fixed/running clocks use the fixture's city time. Duplicate/delete profiles,
Undo/Redo, download/import and local Save apply to `play-fixtures` like other source documents.
Selected profiles and the starting-state disclosure survive edits. Restart Play for source changes.

The live inspector, in a collapsed debug section under the game, includes player/save, objectives, speech, pause/popup and committed events;
select a native device for nouns/verbs, state/goals, cables, clock beats, pending signals and
callbacks, lockouts, trace/watchdog state, recent evaluated actions and failed conditions.
Play keeps its save slots and reloads private in memory; Stop destroys the runtime, including
world clocks, delayed callbacks, input and audio. Runtime wiring never writes authoring source.
Harbor uses pending composition/gameplay/scene data; Sandbox uses pending composition and its
validated general device document (its historical ID remains sandbox-behavior). The regular Harbor conversation adapter retains automatic
acceptance; explicit dialogue choices remain available in the Gameplay lab.

**Logic › Interactions & story** lists the scene's parts (arrival, story clock, objectives,
interactions, people, readables, exits) on the left and edits one at a time on the right. Field
names keep their full accessible names (for example "Objective 2 text"); the visible label drops
the shared prefix. It edits Harbor Shift's `harbor-shift-scene`: arrival text, ordered objectives,
attention targets/urgency, story times, interaction availability, command/conversation routes,
success/failure text and carried-item interactions. IDs/geometry/art stay within the existing
Harbor composition contract. Conditions, references and command invocation permissions are
validated against `harbor-shift-gameplay`; arbitrary scripting is unavailable. Shop, Library and Laundromat also expose typed interaction routes, readable pages, existing actor
dialogue and plain exit prompts through the scene selector. Their native device controllers,
geometry and actor appearance remain code-owned. Other scenes and world construction remain future work.
ENG-04 adds Market, Beach and demoWorkshop to **Gameplay**, and Market/Beach to native **Play**.
**Native device bindings** edits ordered conditions, command routes and response text. **Native wiring**
edits initial event/target/verb connections using native endpoint choices. Fixed conduits, native
state ownership and command permissions stay protected. These source edits restart with Play;
rewiring during play changes only private player progress. **Events** resolves Beach's migrated verbs
and pending initial wires to their shared source rather than presenting legacy steps as active.
**Demo world** uses compact plain review areas with direct shortcuts, in-place permission controls and an optional guidance task at the counter. Its Sandbox-based device example has its own gameplay source; ordinary Sandbox
uses the same Devices/Starting cables authoring as the other native scenes. The former S13
subset is retained only as regression fixtures under scripts/scene-system/legacy-s13.
See [the gameplay system](../docs/reference/GAMEPLAY-SYSTEM.md) and [ENG-04 scope](../ENG-04-PLAN.md)
for contracts and focused checks.

The event inspector reads actual declarations and source references. Search scenes, nouns,
triggers, conditions, actions and connections; select a node to inspect its data, open its scene
or placement, or read the whitelisted literal source. Opaque controller code is labeled explicitly.
Conditions without a matching captured runtime context remain unbound rather than being guessed.

Native device authoring uses SceneData and the existing engine checker for all ten device scenes.
The old five-noun Sandbox lab is retired; its historical ID/kind still imports through the general
source path. Logic -> Devices creates STORE/SENSE/ACT/DAEMON/CLOCK/LINK/LOG/password GUARD and four
toy GUARD variants, plus key/guard/sequence/condition sectors with ordinary content. Original
controller-bound IDs/kinds remain protected. All fields, new nouns/seals and authored starting
cables use normal history, bundles, protected Save and native preview/Play. General entity/scene
creation, network authoring and broader controller hooks remain unfinished; see the execution ledger.

Compositions and timelines currently use schema version 1, the initial document format.
There is no earlier serialized format to migrate. Imports reject unsupported versions rather
than guessing or silently rewriting them. A future version must add an explicit migration with
round-trip/reference checks before changing source documents; ordinary player-save compatibility
is a separate runtime concern.

Select artwork in the hierarchy or preview. Edit its transform and typed appearance properties,
place catalog elements, attach them to named anchors, or duplicate/delete decorative artwork.
Gameplay-bound artwork retains its identity and bindings. Scene factories derive interaction
positions from the same document used to draw it. Platform train stops and Metro's verification
anchor can move horizontally with their interaction markers. Unsupported physical transforms
remain constrained by the scene validator.

Preview time can freeze, step or play. Environment controls set the camera, city clock, weather,
flags and device-state fixtures. Flags and device state use JSON objects; unknown state keys and
incorrect value types are rejected. The preview uses the native frame renderer and an isolated
in-memory model. It never constructs Game, reads/writes player storage or executes gameplay effects.

Select a timeline document to edit its sequences, shots, camera/property/state tracks, keyframes,
text, fades, beats and handoff destination. Scrubbing previews frames without committing a handoff.
The registered exact motion formulas preserve the existing nonlinear animation; their names in
documents are typed references, not arbitrary scripts. The opening, intro, Act II and taxi use
their shipping renderers in this editor. Their compositions expose independently selectable
pieces and nested assemblies; supported fields and bounds come from the same artwork registry.

Edits remain in memory until **Save to source**. Save validates the entire prospective document
set and writes only allowlisted source JSON. The game imports those exact files on its next build.
Undo remains available after Save; undoing a saved change makes the document dirty, and saving
again writes the reverted version. Import/export are additional ways to transfer document JSON.

If a source changes outside the editor, Save refuses to overwrite it. Export pending edits, then
reload source and reconcile them. Invalid documents or failed writes do not count as saved.
The write service retains a local `.authoring-history/` journal for rollback/recovery; this is
ignored by Git and is separate from player saves.

Use the read-only world/map panel above the hierarchy to inspect districts, places, their scenes
and transport connections. Select a place, then choose **Open scene** to edit its composition.
Preview discovery, gate/harbor access, map layers and time without traveling or changing player
progress. The map is adapted from the shipping world registry and current composition/timeline
documents; it cannot edit geography, membership, transport links or access rules. The generated
`world/composition-index.json` is an inspection snapshot; refresh it with
`pnpm --filter plaza-design-demo exec tsx scripts/scene-system/snapshot-world.mts` after registry
or sequence-reference changes. The panel derives its index live rather than relying on a stale snapshot.

Restart the launcher after changing renderer TypeScript, element registrations or source schemas.
An old process intentionally rejects documents containing types it does not know; it cannot
silently validate newly added code. Ordinary JSON edits can be reloaded through **Reload source**.

Lighting and shadow collectors are explicit frame inputs. Native-scene timelines also render
evaluated text cards and fades through the shared frame renderer. Previewing never dispatches
named beats or handoffs into player progress. Source-save and full editor-operation acceptance
are tracked separately from artwork pixel comparisons.
Follow the execution ledger for verified behavior and outstanding goal gates.

Interactions & story and Commands & dialogue follow the header's scene picker; scene and
gameplay documents are no longer listed in it.
Shop rotates successful purchases using the existing transient cursor. Its displayed price is
prompt metadata; edit actual token actions/conditions under Gameplay. NPC dialogue retains native
sequential/final-repeat behavior. Only Harbor has the special delivery laboratory; test other
scenes through Play. The extra Play defaults start with five tokens and use a fixed city clock.
Older two-profile fixture bundles remain importable; missing defaults can be added by selecting
the scene. No player save reset or publication is implied by source edits.

## Test District and shared commerce/conversations

After `pnpm build:homepage`, `/?demo` opens the separate persistent Test District. Its Desk and
Counter share one authored gameplay definition; walk through the doors between them. The desk
provides scenario choices: normal/discount/hidden fee, test credit, conversation purchase, stock
refill and empty stock. MENU -> NEW GAME resets only this demo autosave; its slots stay separate.

**Demo world** is the disposable editor preview of those same pending documents. It has a link to
the persistent standalone version, a read-only mechanics/scenario catalogue and the existing private
Play controls. Neither preview writes player progress or source. Choose demoCounter/demoDesk in
Scene logic; their Gameplay choices share demo-counter-gameplay. There are three additional source
documents, not duplicate copies of the economic rules. The native artwork/composition documents
remain Shop and Library. This does not implement generic scene registration.

Gameplay now exposes typed state defaults, purchase base prices/goods/stock/rotation and modifiers,
node-entry commands and conditional redirects. Scene logic exposes actor final-repeat/cycle behavior.
Purchase prompts derive their prices from the shared definition; intentional quote/charge divergence
is explicit. Inspector snapshots show resolved values and current purchase quotes/charges.

Shop rotation and migrated NPC conversation progress persist in the game. Existing player saves
need no reset; missing cursors initialize from declared defaults. Older Shop/Laundromat source edits
with literal payment actions must be migrated: imports reject them atomically rather than applying
only part of the bundle. Existing composition-only bundles and earlier two-profile fixtures remain
supported. The added demo profile can be created when opening Demo world if absent.

The Library catalog uses the shared conversation runner and one shared text source. Its native
panel remains its presenter. The finite migration corpus and remaining legacy adapters are listed
in docs/reference/CONVERSATION-MIGRATION.json; not all game dialogue is claimed migrated.


## Feedback-ready package

Scene logic exposes authored access requirements alongside objectives: shared conditions, an optional
interaction-command eligibility reference, refusal text and visibility while refused. A command
reference reuses its pure eligibility query; it does not copy its resource/permission logic. Private
Play state includes capability lookup and exit/interaction eligibility results.

Market Gameplay now includes cook, fishmonger, repair vendor and sleeper conversations. Their source
text lives in shared conversation nodes; ordinary Market Play uses those pending nodes. Review
shortcuts jump to each actor. The all-game continuation below supersedes the earlier adapter counts.

**Manifest pilot** uses `demo-manifest` composition with its scene and gameplay documents.
Select it in the scene selector: Layout adds existing artwork, Logic → Interactions & story →
Content & bindings adds/removes ordinary interactions, people, readables, resting places and exits,
and Play runs that pending snapshot in the existing isolated Shop role. The Labs shortcut remains.
A person binds to an “Authored person, animal or robot” artwork instance. Body kind, seeded appearance,
activity, pixel size and brightness use the existing character renderer; dialogue uses the shared
persistent conversation compiler. Exits select a registered scene and optional arrival anchor.
Every content entry has one composition binding. Removal keeps its artwork; Layout can remove artwork
after content is rebound or removed. Dangling bindings, mismatched body artwork and missing exit
scenes/arrivals fail before edits or Save commit. Actor bindings currently require unit scale,
normal depth and right-facing placement; decorative artwork remains transformable.
The same factory supports the scene catalogue below. Full actor appearance/scheduling, specialized
controllers and native entity migrations remain open for the existing 19 scenes.

**World → Scenes** creates a new ordinary scene without a TypeScript registration. Choose an ID,
name and existing city place. Creation adds its scene, composition, gameplay, starting fixture and
place membership as one undoable transaction; the new scene opens in Scene. Logic uses the same
Content & bindings and Commands & dialogue editors. Play uses its own scene ID and a complete pending
scene registry, so routes can reach other edited rooms. The map inspector lists the room within its
chosen place. Scene removal also removes its starting fixtures and membership atomically; incoming
routes, a selected city start or a place entrance must be reassigned first.

`scenes/authored.json` owns the collection. Logical `authored.ID`, `authored.ID-scene` and
`authored.ID-gameplay` documents are projections, not extra files or content copies. History and
bundles store the owner; grouped local Save also includes fixture/city edits. The local file service
retains its fixed allowlist. Native IDs cannot be shadowed, unknown routes fail before writes, and
private Play registries never mutate shipping globals. New scenes currently use the existing review-room
interior by default; full environment/controller authoring and original native migrations remain open.
The shipping catalogue is empty, preserving all original 19 scene defaults.

**Native Corner Shop bindings** now use the same manifest compiler as catalogue scenes. In
Logic → Content & bindings, add/remove/rebind ordinary uses, readables, resting places and exits.
Bindings select an artwork instance, optional registered anchor, offsets and text heights. Width
follows the wall artwork's width property. The vending readable uses its size-derived “use” anchor.
Layout can remove old ordinary props after their bindings are removed or reassigned; incoming scene
routes still need valid arrival anchors. Actor and structural dependencies remain protected.

Old Shop scene bundles without a manifest inherit the canonical bindings. Existing purchase IDs,
permissions, saved rotation and goods remain compatible. New shared flags/events/state/commands and
conversations can be added; the original purchase keeps its single charge/goods owner. Explicit
content prompt/response heights override a binding's text-height defaults. Preview, fixture bounds,
private Play and Save all compile the same complete pending documents. Native actor appearance and
schedule definitions remain a separate migration; this is not full Shop or all-scene completion.

Scene schema version 1 gains optional access/manifest fields; old documents remain valid. Manifest
fields require the explicitly registered declared-scene adapter. Older demo/Market gameplay bundles
with the previous protected vocabulary reject atomically with reload/reapply guidance. Existing
player saves and compatible composition-only bundles do not require a reset.

For CPU diagnostics, append `?perf` to the editor URL; private Play then offers the same opt-in
local recorder. See [performance recording](../docs/reference/PERFORMANCE-RECORDING.md). Normal editor
and game sessions do not mount those controls.

Scene content can bind a cosmetic presentation cue to a committed gameplay event. Beach’s gull
uses this to stamp its original artwork frame clock; refused/previewed commands do not animate
it. Explicit response templates read `{tokens}`, `{item:ID}` and `{state:ID}` from shared state.
Companion scene/gameplay source documents validate together when saving, reading and recovering
an interrupted transaction, so a new command and its route can be authored atomically.


## Shared bot dialogue (all-game continuation)

Assets -> Bot dialogue edits the source `engine/gameplay/bot-reactions.json` using typed names,
interaction prompts and reply/page lists. It is a registered `conversations` document, rather than
an artwork definition or a game-scene document. Header history, portable bundles, local protected
Save and public download use the same document paths as other authoring work.

Speak next reply runs the production ConversationSession in isolated preview state; refreshing the
form never advances it. Reset preview progress affects only that preview. Private Play receives
pending bot source too. The game compiles these templates with the same persistent cycling compiler
as NPC chatter, retaining original names/serials/prompts/text. Named actors use their explicit ID;
unnamed existing actors use their scene's stable legacy slot identity. New entity authoring still
needs the remaining stable-ID/creation work before reorder/add/delete acceptance can close G10.

Focused checks: check-bot-conversations and check-bot-source-save. Registered campaign actors no
longer use the old character-local counters or the separate device-dialogue evaluator. This does
not claim that Downtown story scripts, controllers or the full editor migration are complete.


### City source authoring (partial world integration)

`world/city.json` is the canonical city registry source. Assets -> City & travel edits fares,
quick-travel duration, initial scene, district/place/stand names and place arrival anchors through
normal pending history, bundles and protected grouped Save. Arrivals validate against prospective
scene documents. The map navigator and private Play consume independent pending world instances.
`world/document.ts` remains a derived cross-reference index; do not edit it as a second source.

`check-city-source` compares the immutable original model, traced geography and map input;
`check-city-source-save` covers history/bundle/Save/reload, pending map inspection, actual Game
fare admission and arrival rejection. Metro timetable/ride isolation and complete geographic/
route authoring remain unfinished; source registration does not certify those capabilities.


### Metro timing and isolated sessions

City & travel also edits `world/transport/metro.json`: platform timetable and station offsets,
ride phases, closed-station run multiplier, emergency braking and halt durations. These are
transport source documents with strict validation and the same history/bundle/Save path.
`createLineSystem(city, metroSource)` owns each Game's mutable ride/platform state. Transit scene
factories bind it through `SceneDef.bindWorld`; TRAIN rules and rendering share that instance.
Layout preview receives pending source documents and binds the same scene factories.

`check-metro-sessions` compares original movement/platform behavior and isolation;
`check-metro-source-save` verifies actual pending Game execution after source Save/reload.
Controller snapshot/restore and authored in-flight starting states remain outstanding.


### In-flight metro fixtures

Play -> Starting state supports an optional validated metro snapshot, including station route,
phase, distance, speed, door/halt state and platform shifts. Existing fixtures without this field
keep their old behavior. Train has four ready starting fixtures: departure, approaching the
hidden siding, stopped at the siding and siding doors released. Typed presets can also create
braking and track-stop states. Use current metro as starting state captures private Play's
controller into normal pending history; Undo restores it. Native scene-state fields are available
for every registered scene with device data.

`createLineSystem().capture/restore/reset` owns controller state. Restore validates completely
before mutation and preserves references held by bound rules. Fixture snapshots validate against
prospective world route/timing in both ComposerModel and grouped Save. They are not new player
Save or slot fields. Private restart preserves them only for retained autosaves; reset/slot-load
semantics stay separate. See `check-metro-snapshots` and `check-metro-fixture-save` for evidence.


### Device configuration and authored starting cables

Logic -> Devices exposes the existing native parameters for Capsule, Yard, Downtown, Moth, Beach,
Laundromat, Library, Stacks and Train. Select a device or Scene settings, then a noun/field group.
Existing fields use typed text/number/checkbox controls; new STORE nouns, read verbs, events and
state/emit/registered-effect/trace actions can be added. Placement remains in the Scene view. Shared-bound
verb actions remain in Commands & dialogue. Original controller-bound IDs/kinds are protected by
an immutable-derived identity contract, while newly added ordinary nouns can be removed after Save.

Wiring -> Starting cables edits the scene's authored defaults. Shared gameplay native.wires owns
these when declared; otherwise devices.json owns them. There is no second stored cable copy.
Fixed conduits remain read-only for now. Player cuts/rewires belong to private Play/player saves.
Intentional cable edits are validated structurally; original default cable preservation has a
separate immutable-baseline test. Pending data reaches the same scene geometry adapter, SceneModel
and native controller, including after Train world binding.

Focused checks: check-device-source-baselines (nine exact default projections/original cables),
check-device-source-save (nine grouped source saves/factories, new noun/event, actual delayed TRAIN
signal and source/history isolation). Full optional-field creation and general device creation/
removal/rebinding and all-controller/network authoring remain unfinished. Sandbox now uses this same path.


### Native block and seal creation

All ten native device scenes, including Sandbox, now use Logic -> Devices / Wiring -> Starting
cables. Sandbox retains its historical sandbox-behavior ID/kind for bundle compatibility. The
separate limited Sandbox Lab is retired; its regression helpers live under scripts/scene-system/
legacy-s13 and are not editor/runtime paths.

Choose a native noun template and optional ID, then Add native noun. Templates include eight
engine classes and four guard toys. Choose a seal template and Add sealed sector to create the
sector plus its stored content atomically. Noun sector assigns content; removal detaches content
before deleting an ordinary sector. Renaming a native verb updates the handler key in one edit.
Original controller-bound IDs/kinds remain protected until their migration/rebinding support exists.

Events uses pending validated device sources and points shared device conversations and cables
to their actual source documents. It does not evaluate conditions or execute callbacks. The
broader actor/bot/story graph and general entity/scene creation remain unfinished.

Checks: check-native-blocks (160 schema cases and real native runtime mechanisms),
check-native-block-save (general Sandbox creation/history/Save/Events/native delayed signal),
check-device-source-save (ten grouped device sources), and check-event-inspector (pure graph and
source references). See the execution ledger for scoped browser/raster evidence and remaining gates.

### Native actor bodies (Corner Shop, Library, Laundromat and Warehouse)

Logic -> Interactions & story -> Actors exposes all nine Shop bodies, including background walkers, eight Library bodies, eight Laundromat bodies and four Warehouse bodies.
Layout owns their positions; actor tuple travel endpoints are offsets from that artwork position.
Controls cover seeded human appearance/extras/colors, animal/robot family, robot variant/colors/wear/
face, native action, travel extent/endpoints, speed, facing, pixel size, dimming, parallax, height,
following/gap, emphasis and city-clock windows/day filters. Dialogue remains in People and the shared
conversation source. No additional animation or schedule runner is introduced.

The same scene.json actors feed preview, private Play and protected source Save. Original identities,
target bindings and bands are protected during this first migration to preserve bot save keys.
Older Shop, Library, Laundromat and Warehouse source documents inherit canonical original actor definitions. Actor creation/removal,
general actor rebinding and native clipping/controller configuration remain goal work. Private Play
JSON diagnostics expose actual world actor body values and current schedule visibility.

Library attachments still follow their furniture: moving an armchair moves its seated resident.
Its actor source retains each original explicit/automatic height and seeded appearance. Following
is rebound after dialogue presentation merges so the renderer and interaction targets share the
same final actor objects. Source Save/history/bundle tests cover a moved chair, changed resident and
SHELF-E appearance/movement, schedules and a following cat.

### Native ordinary content (Shop, Library, Laundromat and Warehouse)

Content & bindings owns width/spawn/use/readable/rest/exit bindings in these four migrated native scenes.
Use existing artwork anchors and finite offsets for content placement and text heights. Library’s
Terminal 3 uses the terminal’s seat anchor plus offsets, preserving its existing prompt position
when its chair-offset property changes. Add/remove/rebind uses, readables, rests and exits through
this panel. Removing content keeps artwork; remove artwork in the Scene view after its references move.
Pending preview, Play, source Save and bundles resolve the same pending source documents.

Goals & time creates/removes objectives and story-clock milestones in registered manifest scenes.
Their dedicated detail entries edit text, targets, conditions and minutes. The final entry is an
unconditional fallback; new conditional entries insert before it. Removing the fallback promotes
the preceding entry. New conditions start as all-of-zero (always); author the desired flag condition.
Removing all entries restores the scene’s default goal/time policy. Arrival can enable separate touch
pages. Library’s existing native LAN/catalog permissions and source-owned actor identities remain
protected, while ordinary shared commands, events, flags, state and conversations can be added.

Laundromat now uses the same body compiler and manifest bindings, including its outside walkers.
Its original soap purchase and native SUDS ownership remain protected while ordinary content and
shared gameplay vocabulary can be extended. The washer state machine and its render snapshot remain
registered native controller code; their full controller/lifecycle authoring is still goal work.

Registered artwork can declare bindingIdentity=presentation when its named visual inputs carry no
instance-owned simulation state. This is trusted implementation metadata, never an editable document
permission. The composer and source Save then allow deleting that consumer, subject to native scene,
attachment and pending content-reference validation. Retained bound instances keep their exact binding
identity. Laundromat's snapshot consumers use this contract; original required washer/device/actor/
window/controller instances and types remain protected. The Save regression verifies optional soap/
notice/sock/door removal after rebind, plus rejection of controller deletion/replacement, retained
binding substitution and an attempted permission forged in document data.

The actual Layout Delete/Duplicate actions use the same presentation-ownership rule as imports and
protected Save. Duplicating snapshot-consuming artwork creates artwork only; it does not create a
second device/controller. Retained original bound instances still cannot silently change bindings.

Private Play installs error reporting before bundled module initialization. Errors reach the editor
and dispose the frame; opaque-origin browser errors may be reported only as Script error. A loading
watchdog now reports that the game is still loading after 15 seconds and keeps its frame alive. It
can subsequently become Playing, or the user can Stop. A real 18-second script-delay fixture verified
both phases on the same frame and disposal on Stop; an injected initialization failure verified error
reporting and frame removal. Harness: .scene-system/delayed-play-check/serve.py (4207 delay,4208 fault).

Warehouse uses the same source actor/content/milestone controls. Its patrol, dock attachments, lights,
van caster and wall shadow retain their original defaults. The old Warehouse layout projection is now
a paint-comparison fixture under scripts/scene-system, not a shipping gameplay path. The native scene
still owns ambient/shadow preparation; complete environment authoring remains goal work.

The common response-height binding can enable responseAboveFloor (typed control: response override
above floor only). It requires a numeric response height; at floor level the override is omitted so
the regular default applies. Above the floor the offset is added to the resolved anchor height.
Warehouse’s original door uses offset0 with this policy: default response height at floor level,
response at the door elevation when raised. Existing numeric response-height bindings are unchanged.

All four native actor migrations use compileSceneActors. It binds source bodies, dialogue IDs and
follow links to the same actor objects before rendering or gameplay, with no per-scene merge runner.

### Stable actor interaction order

Logic -> Actors -> Actor earlier/later changes interaction priority in Shop,Library,Laundromat and
Warehouse. Artwork drawing order remains in the Scene view. Original actor/target/band identities remain
protected during this migration; original array order is no longer a save-compatibility requirement.

Actor source reaction keys are explicit compatibility identities for the original world actors.
They retain the existing bot slot/name cursor keys. Native Character metadata remains unchanged:
runtime identity is held outside its enumerable fields, and reconstructed when source compiles.
Missing reaction fields in older source bundles are restored by canonical actor ID, independently
of the supplied order. New generic source actors default to an actor-ID namespace instead of a slot.
Malformed/colliding identities and edits to original reaction keys are rejected. Entity creation/
removal/rebinding and the remaining native-scene migrations are still goal work.

Private Play now appends its sandboxed frame before assigning an absolute game URL, with explicit
loading=eager. The sandbox, source validation and private storage boundaries remain unchanged. An
observed non-navigating about:blank frame prompted this change; three native reorder/start/stop cycles
subsequently passed. This is scoped navigation/lifecycle evidence, not the complete all-scene audit.


Native actor collections in Shop, Library, Laundromat, Warehouse and Sandbox are editable under
**Logic → Interactions & story → Actor collection**. Create actors there so their body, artwork
and optional conversation are saved together. Select an actor for Duplicate/Remove, conversation
ownership, placement parent/anchor/offsets and world/background participation. Layout controls its
placement and drawing order; actor list order controls interaction priority. Clear follower or other
source references before removing their target. Original surviving actors retain old save identities.
Other native scenes still need this migration; this is not full19-scene editor acceptance.

For compact player feedback and a short editor workflow, see
[CONSOLIDATION-REVIEW-GUIDE.md](../docs/reference/CONSOLIDATION-REVIEW-GUIDE.md).
