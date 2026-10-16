# Local scene and animation composer

Run from the repository root:

```
pnpm --filter plaza-design-demo compose-scenes
```

Open `http://127.0.0.1:4192`. The launcher starts a separate loopback save service at
port 4193. `--port` and `--api-port` select other ports. Ctrl+C stops both services.
This entry is a development tool; production builds do not import the editor or its write service.

The selector includes all 19 scene compositions, four sequence compositions and two timeline
documents. Migration acceptance is recorded in [the execution ledger](../SCENE-SYSTEM-STATUS.md);
this working editor checkpoint does not mean that the overall plan is complete.

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
their shipping renderers in this editor. Larger sequence assemblies are still being decomposed.

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

Remaining plan work includes explicit isolation of lighting/shadow frame state, further decomposition
of large sequence assemblies, metadata refinements and complete editor-operation acceptance.
Follow the execution ledger for verified behavior and outstanding goal gates.
