# Scene and animation composer

Public editor: **https://cypherpunk.agency/editor/**. It includes the scene/timeline editor,
asset and animation workbenches, event/source inspector and scoped Sandbox behavior lab.
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
documents and the scoped Sandbox behavior document. S0-S7/G1-G8 acceptance is complete; see
[the execution ledger](../SCENE-SYSTEM-STATUS.md) and
[evidence/reproduction guide](../docs/reference/SCENE-SYSTEM-EVIDENCE.md). S8-S13 adds focused
workbenches to the same shell; individual acceptance and limits are recorded in the
[stretch evidence ledger](../docs/reference/SCENE-SYSTEM-STRETCH-EVIDENCE.md).

The S8 read-only asset browser is now available above the scene workspace. Search by type,
name or tag, filter families, inspect embedded library components, and choose a real source
usage for its isolated prepared preview. Preview zoom does not edit the asset. **Open instance**
selects its exact source placement in the ordinary composer. Metadata distinguishes defaults
from resolved transforms/visibility/anchors. Cinematic-only pieces open their native sequence
context; conditional or non-painting pieces report invisible snapshots. See the
[stretch evidence ledger](../docs/reference/SCENE-SYSTEM-STRETCH-EVIDENCE.md).

Open one workbench panel at a time. Characters offers the supported humans, animals and robots,
appearance controls and actual native animation inputs. Vehicles offers ground, flying, rail
and water families, supported cargo/passenger inputs, and explicitly labeled inspection routes.
Signs, lighting and architecture offers native kernels plus real scene usages; composed mode
retains scene overlap, lighting and weather, while isolated mode shows the selected registered
parts. Unsupported controls are disabled or explained. These panels are viewers: their controls
do not save changes to artwork or advance the game. Playback, frame stepping, seeking and
reduced motion affect only the open preview; closing a panel disposes its clock.

The event inspector reads actual declarations and source references. Search scenes, nouns,
triggers, conditions, actions and connections; select a node to inspect its data, open its scene
or placement, or read the whitelisted literal source. Opaque controller code is labeled explicitly.
Conditions without a matching captured runtime context remain unbound rather than being guessed.

Behavior authoring is limited to the frozen Sandbox inventory in
`inventories/S13.json`: five nouns, ten handlers, four state keys and two signal connections.
Select a noun and verb, edit supported typed cases/actions/replies, then run the native sandbox
with its trace and controlled signal queue. Reset, advance time or capture/reenter a lab save
without touching player saves. Global Undo/Redo and validated import/export use the same pending
document. Save writes only this allowed source through the existing conflict-protected service;
Reload source discards its pending draft. Arbitrary code, rewards, other scene rules and map or
transport editing remain outside this editor's scope.

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
