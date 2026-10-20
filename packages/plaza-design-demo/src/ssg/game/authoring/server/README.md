# Local document service and timeline contracts

This Node-only code is a local development integration. Do not import it into the
shipping renderer or expose it through production routing. The service does not
discover files or accept client paths: its launcher must supply every editable
document explicitly. It edits existing JSON source documents only.

The allowlist includes the Harbor Shift `gameplay` document. Its closed schema and stable
ID/invocation-permission contract are validated before source replacement, just like other
documents. This adds no new endpoint, client-supplied path, or public write capability.

## Start from the editor launcher

```ts
import { AuthoringStore } from './store';
import { startAuthoringServer } from './http';

const store = new AuthoringStore({
  root: absoluteGameDirectory,
  documents: [
    { id: 'scene-harbor', file: 'scenes/harbor/composition.json',
      kind: 'composition', validate: value => registry.validate(value) },
    { id: 'sequence-demo', file: 'story/timelines/demo.json',
      kind: 'timeline', validate: value => validateTimeline(value, context) },
  ],
  validateAll(documents) {
    // Build the context from the prospective compositions, then validate every
    // referencing timeline/world document. Throw before any write on a bad link.
    validateProspectiveReferences(documents);
  },
});
const session = await startAuthoringServer({ store, editorOrigin: editorUrl.origin });
// Pass session.url and session.token to the local editor through the trusted
// launcher. There is deliberately no unauthenticated token endpoint.
// On shutdown: await session.close().
```

The example identifiers and documents above are illustrative; this module does
not create or migrate them. The editor and its launcher must provide their real
registry, document allowlist and cross-document validator. `validate` throws on
invalid data; its return value is ignored. Valid source data is preserved rather
than replaced with validator defaults.

The listener binds **127.0.0.1** only. Every request must use its literal host and
port, exact configured loopback `Origin`, and `x-authoring-token` session header.
CORS preflights are allowed only from that origin. POST bodies require
`Content-Type: application/json` and are limited to 2 MiB by default. Tokens must
stay out of source documents and production bundles. The local service is not a
defense against another process already able to modify the same workspace.

| Request | Response |
| --- | --- |
| `GET /documents` | Array of `{id, kind, revision, value}` |
| `GET /documents/:id` | One allowlisted document |
| `POST /save` with `{edits:[{id,revision,value}]}` | `{transaction,documents:[...]}` |
| `POST /undo` with `{transaction,revisions:{id:revision}}` | New save transaction restoring the earlier values |

Revisions are SHA-256 hashes of exact source bytes. A stale revision returns 409;
the UI retains pending edits and offers reload/export. Invalid data returns 422,
disallowed paths/session/origin return 403, and failed storage returns 500. The
editor must mark saved only after a successful response with the new revisions.

Save validates the complete prospective document set, stages sibling files,
flushes them, rechecks revisions and replaces source files by rename. A failed
group rolls back its replaced files. A persistent `.authoring-history/` journal
retains original and replacement bytes. On startup an interrupted prepared group
is rolled back; an outside edit conflicting with recovery refuses startup rather
than being overwritten. Keep this directory for recovery and exclude it from
publication. A grouped save is rollback protected; another filesystem watcher
can observe its individual file replacements before the group finishes.

Directories, files and recovery paths are checked for symlinks/reparse escapes;
traversal and duplicate file aliases are rejected. Clients cannot create files or
select paths. The editor's in-memory undo stack should remain usable after Save:
undo marks it dirty and the next Save uses the latest confirmed revision. Backend
`/undo` additionally restores a prior transaction only if all affected files still
match that transaction. Undo itself creates a recoverable transaction, enabling
redo by undoing that result. No history pruning is automatic.

## Timeline API

`art/core/timeline.ts` supplies browser-compatible data contracts:

```ts
const timeline = validateTimeline(json, {
  registry, compositions: { harbor: harborComposition },
  destinations: { harbor: ['west', 'east'] },
  clips: { 'character.worker': ['idle', 'walk'] },
  motionTracks: registeredExactMotionKernels,
});
const frame = evaluateTimeline(timeline, 'arrival', timeInSeconds, context,
  { reduced: reducedMotion });
```

A version-1 document has multiple `sequences`. Each sequence contains stable
`id`, positive `duration` in seconds, a composition reference, ordered
non-overlapping `shots`, `tracks`, `text`, `fades`, `beats`, and an optional
validated `{scene,entrance}` handoff. All five arrays are explicit, even if empty.
Shots have `{id,from,to,camera:{x,h,zoom}}`; text cards have
`{id,from,to,text,x,h}`; fades have `{id,from,to,color,start,end}`;
beats have `{id,time}`. Camera height and element height use the composition's
`h` coordinate. Shot/text intervals include their start and exclude their end;
the last shot and fade remain evaluable at the exact sequence endpoint.

Tracks contain `{id,target,keys:[{time,value,ease?}],reduced?,motion?}`.
Targets are camera `x/h/zoom`, instance local `x/h/scale/facing/parallax`, instance
`visible/opacity`, declared `property` or `state` fields with `animatable:true`,
or a registered `clip` channel. Targets must resolve to composition instances.
One track owns each target. Visibility and opacity are separate output maps so
the renderer can respect parent/child and multi-pass ordering. Visual states and
clips are also explicit outputs for the caller's existing state/clip adapters.

Numeric tracks interpolate with `linear` (default), `smooth`, `in` or `out` easing.
An easing belongs to the outgoing key's segment. Discrete fields, facing, visibility
and clips require `hold` on every outgoing segment. Keys have strictly increasing
times within the sequence. Values clamp to the first/last key beyond its range.
`reduced:'freeze'` samples time zero; `'normal'` or omission preserves the track.
Text/fade/beat timing is retained under reduced motion. The renderer must apply
its existing ambient reduced-motion behavior separately.

Optional `{motion:{type,props}}` routes a track through a trusted registered exact
motion kernel instead of interpolating keys. Kernels must validate typed props,
compute deterministic values from absolute seconds and props, and avoid mutable
simulation state. They contain existing TypeScript formulas; documents never
contain code or expressions. Evaluation validates kernel output against its
target. Legacy frame-dependent simulation still needs its existing seeded replay
adapter; this pure module does not replace it.

The resulting frame supplies a **cloned** composition with local property and
placement changes. Resolve attachments afterwards using `resolveComposition` so
moving an owner moves attached children correctly. It also returns camera,
visibility/opacity, visual state, clips, active text and evaluated fades. `beats`
is an informational list through the seek time, not an event queue. Seeking is
absolute and never writes saves, awards items or fires handoffs. Use one
`SequenceHandoff` instance per actual runtime play: call `complete(sequence,
commit)` on skip/completion, once. Seeking does not call it. This is a controller
latch, not a global save or progression mechanism.

## Focused checks

From the repository root:

```powershell
pnpm --filter plaza-design-demo exec tsx scripts/game-tests/check-timeline.mts
pnpm --filter plaza-design-demo exec tsx scripts/game-tests/check-authoring-save.mts
pnpm --filter plaza-design-demo exec tsx scripts/game-tests/check-composer-model.mts
```

## Browser editor integration

`authoring/app.ts` exports `mountComposer(host, config)`. The caller supplies
the real artwork registry, authenticated API URL/token and a game preview:

```ts
const editor = mountComposer(host, {
  registry, api: { url: session.url, token: session.token },
  viewport: { width: 960, height: 540 },
  preview: {
    render(canvas, request) {
      // Use the same game renderer, state adapters, fonts, environment and passes.
      // request.composition already includes evaluated timeline placements.
      // Apply frame.state/clips/visibility/opacity without advancing gameplay.
      // Selection overlays are optional and must follow the shared render.
      return drawGamePreview(canvas, request);
    },
  },
  destinations, clips, motionTracks,
  initialEnvironment: { cameraX: 0, zoom: 1 },
  worldPanel: (panel, openScene) => mountReadOnlyWorldPanel(panel, openScene),
});
// editor.openScene(sceneId), editor.reload(), editor.save(), editor.dispose().
```

`render` receives `{composition,frame?,time,reduced,overlays,selectedId?,environment}`
and returns `{bounds,deltaToLocal?}` synchronously or asynchronously. Bounds are
`{id,x,y,width,height}` in canvas pixels, ordered from back to front. They must
match the actual rendered elements. `deltaToLocal(id,dx,dy)` converts canvas-pixel
pointer deltas to local `{x,h}`, accounting for camera, zoom, parallax, parent
scale/facing and attachments. The editor disables dragging when conversion is
absent and reports why. It has no approximate rendering fallback.

Use `environmentControls` for explicit preview fixtures: number, boolean or
select fields that the real preview provider understands. They change only the
editor's preview environment. Overlay drawing and weather/light handling remain
provider-owned. No real Game instance or player-save access is created here.

The document chooser includes compositions, timelines and read-only world
documents. Hierarchy and catalog operations edit the current composition (or a
timeline's referenced composition). Dragging commits one undoable command at
pointer release. Inspector values are local to their parent/anchor. JSON fields
require Apply and use the element schema's validator. Gameplay bindings and scene
identity cannot be removed or changed through import; deleting bound items,
dangling attachments or timeline targets fails without replacing valid data.
Nested duplicates remain beside their original within the same parent.

Timeline controls select or add multiple sequences, play/pause, scrub, frame-step
and loop a range. Select an element to expose its transform/animatable-property
targets, add a key at the playhead, then edit its typed value, time and easing.
Clip targets appear for types with registered clips. Camera tracks need no
selection. Shots, text cards, fades, named beats and advanced sequence fields are
editable through labeled JSON panels, with validation before changes become
active. Handoff controls allow only the injected destination list. Inspector
changes affect the base composition; keys may override it during preview.

Save persists every dirty editable document as one validated group. Ctrl/Cmd+S
saves; Ctrl/Cmd+Z and Shift+Ctrl/Cmd+Z undo/redo editor commands. Saving retains
history, and undo after Save marks the document dirty. Reload warns before
discarding pending changes. Import replaces the selected document only after
validation; Export downloads the pending document, including unsaved work.
Navigation away from a dirty editor uses the browser's unsaved-change prompt.


The registered Harbor `scene.json` and `authoring/play-fixtures.json` use the same grouped Save,
revision and journal protections as artwork, gameplay and scoped behavior. Prospective source-set
validation cross-checks the Harbor scene against pending gameplay. Neither document may contain
executable code. The public editor only downloads them. Play runtime snapshots and wire changes
are private session state and are never source-save inputs.
