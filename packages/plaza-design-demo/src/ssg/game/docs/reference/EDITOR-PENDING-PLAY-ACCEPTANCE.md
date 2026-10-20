# Existing-scene native Play acceptance

2026-10-20. **19/19 scene Play rows PASS. G10 remains open.**
Verified implementation: `sha256:8fdb3e4ff807cdce8c4a45efcf0be9cd3787bdf0b028c4e553bfda62f3f47863`,
before the acceptance-only matrix update. Packaged editor `app-E5DJAGHL.js`, native runtime
`play-ZKT77YS4.js`, served at `http://127.0.0.1:4211/editor/`.
Observed evidence: `.scene-system/editor-pending-play/run-lw8To1/evidence.json`.

For each frozen scene, use the actual Scene outline/inspector to move its spawn marker13 pixels,
start private native Play and read the visible player-state diagnostics. Undo the source while
Play runs: its original private snapshot remains unchanged. Reset Play: the restored source
position is used. Stop: zero iframes remain. Missing starting fixtures were created through
the editor before changing the spawn. All19 pass, with no captured browser warnings/errors.
Moth's local marker0 compiles to world52; the edit produces world65, then Reset returns52.

The initial Downtown test failed: pending733 still started at720. Game already starts with
Downtown selected, so `continueGame` does not call `enter` for it. The constructor now reads
the initial player position from its supplied scene definition. Shipping Downtown remains720;
pending733 is honored without changing scene entry, introductions or existing artwork.

Train's Undo input acknowledgement timed out after applying. The existing session showed
source780/private793; Reset returned780 and Stop removed its iframe. It was not restarted
because of the observation timeout. Library and Capsule were rechecked against the corrected
build after the remaining17 scenes, so all19 rows describe the same native runtime.

Additional checks at this implementation checkpoint:

- `check-game-reopen-lifecycle.mts`:20 cached Game stop/start cycles PASS.
- `check-play-storage.mts`: independent private stores, saves, slots, resume/reset/reload PASS.
- `check-scene-catalogue.mts`: two connected ordinary scenes without TS registration, projected
  edits, history/bundle/protected Save/reload/byte Undo and invalid graph rejection PASS;
  `.scene-system/scene-catalogue-check/run-IfjuOm/evidence.json`.
- `check-scene-domains-forms.mts`: actual typed wire connect/cut, endpoint/verb/trace controls,
  prospective invalid-reference rejection and history PASS.
- `check-general-device-forms.mts`: Harbor, HarborShift and projected catalogue device creation,
  binding/detachment, device-local state, shared gameplay state, text/goal/noun/cable creation
  and deletion PASS. Its stale test-only native-state fixture was updated to the current
  `native.reads` and shared state declaration editor; no removed schema support was restored.
- Package TypeScript, homepage build and design-demo build PASS. The existing large-bundle
  advisory remains.
- `check-scene-inspector-identities.mts`: all19 actual manifest/companion/actor forms mount
  with the current source IDs; `.scene-system/scene-inspector-identities-apSBo5/evidence.json`.
- `check-source-authoring.mts`:98 real documents, actual Library runtime placement after
  protected Save, conflicts, grouped invalid-reference rejection, exact Undo and shared
  artwork catalogue PASS. Its added stool fixture now follows Library's current layer system.

## Browser-created connected scene

On the same packaged implementation, World / Scenes created `review-created-room` and its
starting fixture and Downtown membership. Native Play ran it at120. Logic / Content & bindings
added `review-door` on its spawn marker; the exit destination control was changed to Library.
In real native Play, E entered Library at74, with both scene seen flags in the visible state.
Stop and three Undo operations removed the destination edit, exit and grouped scene creation;
no created scene option or iframe remained, Undo was empty and Redo available.
Observed receipt: `.scene-system/editor-pending-play/run-lw8To1/new-scene-browser.json`.
This used only UI controls, without TS registration or injected application state. A browser
input transport stall was recovered with the documented accessible controls. No protected
repository Save was attempted by the public browser; the separate catalogue test proves it.

This accepts the per-scene **Play** column. It does not substitute for all entity/control
authoring, protected Save or preservation requirements in G4/G10/G12. Complete the combined
entity/control/source-path coverage audit before promoting those gates.
