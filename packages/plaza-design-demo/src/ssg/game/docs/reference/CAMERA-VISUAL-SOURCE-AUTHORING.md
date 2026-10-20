# Camera and procedural-picture inputs

Yard camera pan/parcel reads and Downtown camera feed/loop endpoints now come from
`devices.json → camera.bindings`. Typed controls use current state and noun/verb options.
Loop still enters the real native action API, with the same permissions and signals. Removing
its binding removes the loop button. Missing bindings do not restore historical state names.
Only roles supported by the actual registered panel appear or validate; Stacks continues to
use its existing cargo controller roles.

Moth and Beach have registered read-only visual controllers under `devices.json → controller`.
Their typed fields select existing state, display comparison values and Moth's actual CLOCK noun.
Moth's fish/plant/tape/record picture and Beach's rental/billing/danger/lamps read those references.
There is no new gameplay state, action interpreter or save owner. Procedural artwork and frame
timing remain native. Disabling these inputs leaves the empty visual policy rather than silently
restoring the original vocabulary. Their old fixed-state requirement lists are removed.

## Evidence

- `check-camera-bindings-source.mts`: `.scene-system/camera-bindings-source-XN3kIE`.
  Typed rebinding, 21 original input cases, actual registered panel buttons/native actions,
  optional-binding removal, invalid references, pending/history/bundle, protected Save, fresh
  shipping import and exact Undo.
- `check-visual-controller-source.mts`: `.scene-system/visual-controller-source-MOhueR`.
  120 original state snapshots, all typed state/comparison/clock roles, actual native picture
  environment inputs, explicit disabling, invalid references and the same Save/import/Undo path.
- Existing `check-moth.mts`, 60 immutable Beach drawing-command comparisons and 512 Beach
  workflow cases pass. Fixture models now supply the real configuration; original expected
  drawing/behavior outputs remain unchanged.
- Both builds and TypeScript pass at source
  `sha256:50dca405499fc63c4a6cfe2e550cfa508caa0eeb68bcd651495b9a5aef0058fb`.
  Native browser raster evidence has 173 zero-difference rows:
  `.scene-system/all-game-pixel-check/evidence/50dca405499fc63c4a6cfe2e550cfa508caa0eeb68bcd651495b9a5aef0058fb-1792444996646.json`.
  Actual packaged-editor Moth/Beach Play and Stop pass without console errors, using
  `app-BNQXVGVR.js` / `play-RW6WEHH4.js`. This is a two-scene smoke check, not a new all19 run.

These changes remain local after published checkpoint dbf8dec until the next integrated batch.
Yard and Downtown's remaining world-picture references and final coverage acceptance are still open.
