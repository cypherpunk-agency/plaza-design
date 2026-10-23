# Animated artwork and authoring

Current paths, 2026-10-23. [ROADMAP.md](../../ROADMAP.md) owns remaining work and priorities.

The title and glide use ordinary authored zones and world backdrops. `story/title/render.ts`
calls `runtime/zone-sequence-frame.ts`, which evaluates the timeline and configures
`renderWorldFrame`. The former `opening/` artwork dispatcher, metadata and measurement wrappers
are removed. Do not recreate them or the removed `nativeOpeningFrame` comparison path.

`cinematics.ts` registers intro, Act II and taxi artwork in the art library. Their source lives
under `story/cutscenes/`; `runtime/sequence-frame.ts` evaluates its timeline and presents its
composition as a one-zone frame through `renderWorldFrame`. These adapters supply camera, passes,
state and overlays; they do not own another frame renderer. Piece thumbnails are isolated art
previews, not another world render path.

JSON controls compositions, shots, tracks, cards, fades and handoffs. New drawing algorithms
remain registered code primitives with typed inputs, bounds and anchors. A sequence/context
piece is not automatically a reusable independent object; the library's usability label describes
its supported placement contract.

The intro's existing `IntroPlaybackSession.advance` advances packets before painting. `Skyline.parts`
paints prepared network commands without changing packet state. The isolated `IntroSeekSession`
reconstructs deterministic state for editor inspection, including backward seeking, without touching
live playback. Same-time paint and bounds must not advance authoritative animation; light comes
from the explicit View. ROADMAP C1 records the remaining visual preservation closeout.
