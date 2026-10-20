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

These changes remain local after published checkpoint dbf8dec until the next integrated batch.
Yard and Downtown's remaining world-picture references and final coverage acceptance are still open.
