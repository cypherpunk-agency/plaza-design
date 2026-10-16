# Scene system evidence and reproduction

The local `.scene-system/evidence` archive contains captures and indexes. It is deliberately
outside generated production output and Git. Preserve it with the source checkpoints when
moving this checkout. The preceding original-source archive is also retained separately;
never replace original expected hashes with values from migrated code.

## Pinned comparison scope

| Family | Cases | Immutable expected manifest |
| --- | ---: | --- |
| Scenes | 489 | v2-scenes.json |
| Authored animations, normal and reduced | 15,308 | v2-animations.json |
| Composed map | 8 | v3-map-original.json |
| Actual harborShift launch | 32 | v2-prototype.json |
| Taxi flight | 804 | S4-flight-parity.json |
| Game/editor world-frame contract | 489 | S7-native-world-reference-20261016-v1.json |

The last family compares the verified current Game renderer with the editor. Its manifest is
explicitly a frozen game/editor contract reference, not a substitute original migration baseline.
All other expected manifests are from the retained original implementation. Total: 17,130 pairs.
Each case has actual before/after/diff PNG references, dimensions, raw RGBA hashes and numeric
pixel/channel differences. Equal image content shares content-addressed PNG files.

The environment is pinned by each header: Chrome 155 on Windows, DPR 1.25, loaded IBM Plex Mono
400/500/600/700, explicit viewport, scene/sequence time, seed and recorded input order. Pixel
identity is claimed within that environment. A browser/environment mismatch must stop replay.

## Preserved original bundle

Reassembling the original sources with later fixture imports changed fixture initialization and
failed to reproduce original case two. The failures remain in the smoke diagnostic archive.
Use `.scene-system/baseline-compiled-reproducible/baseline.js`, SHA-256
`15073a211f4ae6d3e78f29b31229abcdf0fe5c99be55e0f61d60d820f32d8832`.
The accompanying HTML is preserved too. This bundle reproduces the complete original scope.

After building fixture output, run from repository root:

```
node packages/plaza-design-demo/scripts/scene-system/instrument-original-capture.mjs .scene-system/baseline-compiled-reproducible
```

This adds only read-only exposure of the already-existing pixel readback. Removing its two
insertions recovers the exact original bundle; `G5-original-bundle-capture-proof.json` records
the proof. Its output is `baseline-original-capture.html/js`, not the diagnostic reassembled
`baseline.html/js`. No extra canvas read or drawing/update call is introduced.

## Capture and independent verification

`serve.mts` hosts loopback fixture pages and an append-only evidence writer. See the top of
`capture-artifacts.js` for its browser API. Pin the expected manifest and both bundle hashes;
use a fresh ordered case list/pair per family, and `?play=harborShift` for prototype pages.
Chunks are bounded and durable. Resume replays earlier inputs before continuing. A changed
original hash stops the run and retains failure evidence. Finish rechecks all source pins.

PNG encoding uses exact RGBA scanlines, avoiding a canvas alpha round-trip. The independent
Python verifier uses Pillow rather than that encoder/decoder implementation:

```
python packages/plaza-design-demo/scripts/scene-system/verify-capture-artifacts.py .scene-system/evidence S7-artifact-final-scenes-20261016-v1-complete.json .scene-system/fixture/v2-scenes.json --fixture .scene-system/fixture
```

Final scene/native indexes use the final candidate directly. `link-artifacts.js` replays the
other four families through the final candidate, byte-compares actual captured RGBA with the
existing decoded PNG, and records final bundle linkage. It does not substitute source similarity
for a real replay. `verify-final-artifact-links.py` independently verifies those links, prior
image contents, full case coverage and immutable references. For example:

```
python packages/plaza-design-demo/scripts/scene-system/verify-final-artifact-links.py .scene-system/evidence S7-final-link-animations-v1-complete.json .scene-system/fixture/v2-animations.json --fixture .scene-system/fixture
```

Completion manifests and corresponding `*-independent-verification.json` reports enumerate
all cases and file references. Failed v1 taxi capture used the wrong small-screen height;
the accepted v2 restores the recorded 420x240 input without changing expected hashes.
Retain failed runs as diagnostics, not accepted evidence. These fixtures are not a campaign
playthrough or a player-comprehension study.
