# Animated artwork and authoring

Current paths, 2026-10-23. [ROADMAP.md](../../ROADMAP.md) owns priorities.

A sequence is a composition with a `sequence` field containing its duration, shots,
tracks, cards, fades, beats and optional handoff. The timeline is the editor for those
fields, not a separate source document. `art/core/sequence.ts` derives the pure temporal
evaluator's program from these compositions; there is no second saved representation.

Title and glide reference ordinary authored zones and world backdrops. Intro, Act II
and taxi place registered artwork directly in their compositions. Both use
`runtime/render-scene.ts::renderWorldFrame`, with `runtime/prepare-frame.ts` preparing
camera, scene references or inline contents, passes and overlays. The separate world
sequence, composition sequence and editor sequence adapters are removed. Do not recreate
another renderer, projection or pass order.

The normal editor preview captures the actual painted frame's scene scopes and views.
Selection bounds and drag deltas use those views and the registered artwork geometry.
Selecting scenery in Opening glide edits its owning scene/backdrop source while retaining
the sequence view. Inline cinematic objects edit the sequence composition itself.
Undo/redo, bundles and protected Save use the same ComposerModel and source store.

New drawing algorithms remain registered code primitives with typed inputs, bounds and
anchors. A context-dependent picture is not automatically an independent reusable object;
the library's usability label describes its supported placement contract.

`IntroPlaybackSession.advance` advances packets before painting. `Skyline.parts` paints
prepared network commands without changing packet state. `IntroSeekSession` reconstructs
isolated deterministic state for editor inspection, including backward seeking. Painting
and bounds never advance authoritative animation; light comes from the explicit View.
