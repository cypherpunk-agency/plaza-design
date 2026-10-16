# Asset workbench evidence

S8-S13 extend the completed S0-S7 composer. This ledger records each gate independently;
an implemented panel or a successful build does not close an unverified gate.

All F1-F6 gates are accepted within their frozen inventories. Final homepage and design-demo
builds pass, as does the aggregate acceptance checker. This delivery preserves shipping artwork,
scene/data sources, runtime/world/story and player saves; the only engine extension is an optional
immutable, exception-isolated observer for the native Sandbox trace. Main was published at
`d619294` before this goal began; stretch implementation and production publication remain separate.

Acceptance records are under `authoring/inventories/`; actual local captures are retained in
the ignored `.scene-system/evidence/` directory of the development worktree. Source and bundle
pins describe that exact byte-level comparison environment. Keep the original captures when
refreshing source or browser inputs. From `packages/plaza-design-demo`,
`pnpm exec tsx scripts/scene-system/check-stretch-acceptance.mts` verifies all six recorded gates,
current source pins and the unchanged shipping artwork/scene/world/story boundary. It does not
reissue browser acceptance or claim a campaign playthrough.

## F1 / S8 asset browser

Frozen source inventory: `authoring/inventories/S8.json` (`d619294` artwork/catalog):
832 registered types, 1,938 placements in 23 composition documents, two timeline documents,
and 18 reusable embedded library components. Catalog entries are derived from the shared
`ArtRegistry`; usage paths come from the actual loaded composition documents. Embedded
components are labeled as such and do not imply an independently registered renderer.

Operations: text/tag/family search; typed default metadata; source usage, group/child and
attachment inspection; resolved transforms, inherited visibility/opacity, anchors and pass/order;
native-scene controller snapshots; isolated registered pass previews; preview zoom; and opening
the exact source instance. Viewing has no model-edit or Save capability.

The isolated preview uses the source scene factory and its prepared environment, then resolves
the selected subtree through `resolveComposition`. It preserves evaluated transforms and
appearance while excluding ancestor artwork and unrelated siblings. Camera centering and
render scale go through the native renderer. It does not emulate scene grading, reflected
light or unrelated background objects; **Open instance** provides that mounted context.

Support is explicit: default local piece, prepared scene context, or structural group. A piece
with only cinematic uses opens its native sequence composition instead of receiving a fabricated
controller pose. Invisible/conditional pieces, marker geometry and light collectors report a
snapshot with no visible pixels. No new art or source compositions were introduced.

### Verification

From `packages/plaza-design-demo`:

```
pnpm exec tsx scripts/scene-system/check-asset-browser.mts
pnpm exec tsx scripts/scene-system/build-asset-browser-fixture.mts
```

The focused check verifies all frozen type ids, every one of the 1,938 exact usage paths,
search/family filtering, no document mutation, missing-id rejection, nested attachment
transforms and inherited visibility/opacity. Its synthetic hierarchy includes a hidden parent,
attached child, descendant and unrelated sibling.

In the existing loopback fixture host, import `/s8-assets.js` and fetch `/s8-documents.json`.
`checkAssetPreviews(documents, true, 'S8-final-reset')` checks all 832 default support modes and compares 40
source-hierarchy versus isolated-projection frames across all 19 native scenes at 0.5 s normal
and 1.25 s reduced. The fixed environment is 960×540, day 1, minute 580, seed 3 and clear
weather. Twenty-six pairs contain visible artwork; fourteen also verify invisible/culling
states and must not be described as visible artwork coverage. All channel differences are zero.

Retained local evidence (ignored `.scene-system/evidence/` in the development checkout):

- `S8-final-reset-hierarchy-images.json`: 40 numeric comparisons and 80 actual PNG references.
- `S8-final-reset-independent-png-verification.json`: independently decoded Pillow RGBA checks, dimensions
  and image SHA-256 pins; 40 pairs, zero differences.
- `S8-final-reset-usage-previews.json`: all 582 registered types with native
  scene usages replayed at 0.5 s after a fixed readback warmup; zero replay differences. Forty have no visible
  pixels in that snapshot and are explicitly reported. Documents, city clock and player storage
  remain unchanged. This is bounded snapshot coverage, not every theoretical state combination.
- `S8-final-reset-editor-operations.json`: actual browser search, prepared usage, exact Mall
  stool source/selection, retained usage/zoom, 1×/8× pixel output, unchanged source/player
  storage and disabled Save. All pass.

Independent image verification from repository root:

```
python packages/plaza-design-demo/scripts/scene-system/verify-asset-browser-images.py S8-final-reset-hierarchy-images.json S8-final-reset-independent-png-verification.json
```

Both homepage and design builds pass. No production game artwork, state rules, source scene
documents or player-save formats were changed by S8. Source code/bundle pins and current
acceptance totals are recorded in `authoring/inventories/S8-acceptance.json`.

Final integration repeats the full bounded F1 matrix after the native camera solver was shared
with S11. Camera probes have finite input/bounds checks and bounded corrections; ordinary affine
camera cases preserve the original solution. The private preview model freezes simulation time
before resetting native deadlines and applying explicit source-state overrides. This prevents
Sandbox's metronome snapshot from depending on host render duration. Full native preview frames reset their private Canvas drawing state, so camera probes cannot inherit styles or clipping from an earlier frame. `check-native-preview-context.mts` verifies a fresh Library frame against deliberately contaminated drawing state and an away/back camera probe. Actual game clocks and rendering are
unchanged. `check-native-preview-clock.mts` proves identical native paint commands and countdowns
under four advancing host-time schedules. Browser readback mode is fixed before comparison;
no tolerance, masked pixels or changed shipping artwork are used. Earlier evidence is retained
as historical evidence rather than silently relabeled as final-source verification.

## F2 / S9 character workbench

Accepted within `authoring/inventories/S9.json`; source/bundle pins and totals are in
`S9-acceptance.json`. The screen covers 33 families: procedural humans, three animals, three
legacy robot critters, eighteen procedural robot families with three variants, eight metro
rider looks, Pixel, player/Downtown sprites, dockworker cargo, LIME and natural/robot flying gulls.
It exposes only supported actions and native appearance controls. There is no common invented
held-item system: human extras, robot payloads, rider belongings and dockworker parcel/case
retain their actual native paths.

`check-character-workbench.mts` verifies all 2,286 independent appearance/action/variant/facing/
time cases, repeated and fresh-session seek equivalence, native walk/steal/load/serve/marshal/
follow transitions, typed controls, clock/light/input isolation and shared playback semantics.
The mounted UI additionally proves seek/frame-step/play/pause/reduced hold, appearance reaching
native snapshots, real carried pose and no source/player storage changes.

Browser evidence in the ignored local evidence directory:

- `S9-character-v3-normal.json` and `S9-character-v3-reduced.json`: 2,286 cases each; actual
  registered-prepared versus native-direct RGBA agree with zero differences.
- `S9-character-v3-visible-output.json`: every normal case has visible artwork (minimum 36 pixels).
- `S9-v3-images-{0,100,200,300,400}.json`: 381 appearance/action examples at 1.25 seconds and
  33 reduced family examples; 414 retained pairs.
- `S9-v3-environment-images.json`: 24 actual native day/night/shadow cases across human, cat
  and servbot, both facings. Lighting changes output and both render paths agree.
- `S9-v3-independent-png-verification.json`: independently decoded raw RGBA and hashes for
  all 438 pairs / 876 PNGs, zero differences.
- `S9-v3-editor-operations.json`: mounted controls, source and storage checks.

Reproduce with `check-character-workbench.mts`, build `character-workbench-fixture.ts` to the
loopback fixture directory, then use `runCharacterWorkbenchParity` and the bounded
`capture-character-workbench.js` helper. Independent verification:

```
python packages/plaza-design-demo/scripts/scene-system/verify-character-workbench-images.py
```

Specialized native functions are called directly; procedural characters use the actual
`prepareCharacter` and prepared-artwork adapter. Pixel's random autonomous controller is
excluded: the workbench supplies explicit pose/particle snapshots. Reduced motion explicitly
holds effective preview time at zero; it does not claim an action-specific runtime feature.


## F3 / S10 vehicle workbench

Accepted within `authoring/inventories/S10.ts` and `S10.md`; `S10-acceptance.json` records
the source/bundle pins and evidence. The frozen inventory contains 35 families: ground
vehicles and lifting machinery, flying craft and sprites, three rail views, the legacy
hover cab, Harbor boats/forklift/chassis, opening ships/boats and the canal boat/occupant.
The 229-case matrix includes 35 defaults, animated/reduced snapshots, 102 supported-control
probes and 22 separately labeled route-culling rows. This does not cover every combination.

All artwork dispatches shipping kernels with explicit native inputs. Ground/craft linear
movement is a labeled inspection placement transform; native Harbor, fleet and opening
routes keep their existing formulas. Rail views receive disposable door/rider snapshots,
without advancing the transport singleton. Platform/metro passenger variation changes a
native rider seed rather than inventing an empty-train state. Cargo, lift/reach, facing,
paint and lights are available only where supported. Delivery-drone facing and unsupported
time-of-day controls are disabled. The canal boat retains its native vault/water context;
that context may be cropped and is not an independently authored vehicle system.

Final v5 browser evidence in the ignored local evidence directory:

- `S10-final-v5-rendered-evidence.json`: all 229 native-direct/workbench RGBA comparisons,
  seek/replay and isolation checks pass; all 35 defaults contain artwork. Each of the 102
  supported-control probes changes visible pixels with artwork visible on both sides.
- `S10-final-v5-independent-png-verification.json`: Pillow independently decodes all
  229 source/candidate pairs and 229 difference images, totaling 687 PNGs. Raw RGBA hashes
  match the browser report and every difference image is zero. The retained v5 bundle is pinned.
- `S10-native-machinery-containment.json`: 64 native command-geometry cases keep the complete
  straddle cab/beacon/load and stacker arm/spreader/load inside both tested viewport sizes,
  across facing, payload and lift/reach states. Culling rows do not prove visible controls.
- `S10-vehicle-command-contracts.json`: 229 independent native command comparisons and
  102 effective-control comparisons, deterministic replay and preserved transport/world/source.
- `S10-final-v5-editor-operations.json`: the primary agent's actual composer UI proves native
  loading and supported facing pixels, disabled unsupported controls, route/speed, frame
  stepping, seek/reduced hold, play/pause, loop, camera reset, no viewing Save and unchanged storage.
- `S10-final-v5-disposal.json`: closing a playing panel freezes its retained canvas; reopening
  creates a fresh canvas and a paused clock. No detached preview animation continues.

From `packages/plaza-design-demo`, run the focused checks and acceptance recorder:

```
pnpm exec tsx scripts/scene-system/check-vehicle-workbench.mts
pnpm exec tsx scripts/scene-system/check-vehicle-workbench-geometry.mts
pnpm exec tsx scripts/scene-system/record-vehicle-workbench-evidence.mts
```

The recorder requires existing actual UI and retained-image evidence; it does not manufacture
browser acceptance. Build `check-vehicle-workbench-fixture.ts` for the loopback host and use
`runVehicleWorkbenchParity` or the bounded capture helper for a fresh rendered matrix.
The actual-composer helpers `check-vehicle-workbench-ui.js` and
`check-vehicle-workbench-disposal.js` run through trusted browser script injection;
they return evidence without bypassing the composer's cross-origin/CSP policy.
Independent image verification from repository root:

```
python packages/plaza-design-demo/scripts/scene-system/verify-vehicle-workbench-images.py
```

Source audits confirm unchanged shipping artwork, scene/data documents, runtime, world and story
directories. The viewer does not change player storage, rules, route topology or transport state.
No gameplay driving, arbitrary route editing, invented payload semantics or source Save is included.

## F5 / S12 scene event and connection inspector

Accepted within `authoring/inventories/S12.inventory.json`. `S12.acceptance.json` pins 83
implementation/source-reference files, four check/launcher files and 26 inspected document
revisions. The actual registry projection covers 19 scenes, 10 declarative scene files,
23 compositions and 6 sequences: 3,885 nodes / 3,112 semantic connections, including all 222
nouns, 41 declared events, 331 cases and 177 nested actions. Engine-generated seal/watchdog
nouns, guards/dialogue/sectors/clocks/LINK/net declarations, physical interactions, attachments,
travel and handoffs are derived from actual registries/documents. Current references resolve;
opaque controller effects/callbacks remain source-linked boundaries rather than invented logic.

The focused model check proves exact captured active/blocked/inactive states, context mismatch
remaining unbound, explicit missing-target probes, valid current behavior-draft overlays,
invalid-overlay rejection, and immutable inputs with model/storage/callback traps. The source
reader allows only 71 exact graph-referenced `.ts`/`.json` files, with canonical-root/junction
checks, bounded 512 KiB UTF-8 reads, strict file query and unchanged loopback/origin/GET/CSP guards.
Literal source display and JSON-pointer extraction execute no source text. Source viewer text
comes from saved disk files; the graph's declared-data panel shows the validated unsaved draft.

The primary agent's actual composer 4200 browser helper passed all 9 final integration checks:
JSON source/pointer display, exact Library/window-1 scene/object selection, opaque sbx.pulse
TypeScript source/symbol, stale filter selection replacement/clearing, pending draft overlay,
Undo restoring the graph, zero source writes, all 26 source revisions unchanged and player
storage unchanged. `S12.acceptance.json` explicitly identifies these as root-observed tool
outcomes recorded by the child; it does not claim a child-owned browser execution.

Reproduce focused checks from `packages/plaza-design-demo`:

```
pnpm exec tsx scripts/scene-system/check-event-inspector.mts
pnpm exec tsx scripts/scene-system/check-event-inspector-source.mts
pnpm exec tsx scripts/scene-system/check-event-inspector-acceptance.mts
```

The source-reader junction fixture may require an authorized context outside the Windows
sandbox. The last command verifies existing source/evidence hashes; it does not regenerate
browser acceptance. Run `check-event-inspector-browser.js` as a script in the isolated composer
for actual UI checks. Inspection never evaluates live conditions or invokes gameplay callbacks.

## F6 / S13 bounded Sandbox behavior authoring

Accepted only for `authoring/inventories/S13.json`: ten existing handlers on five devices,
two stable cable ids, four typed state keys, literal assignments, same-noun event emission,
bounded conditions/responses and the existing protected sbx.pulse effect. Unsupported data,
rewards, code, rules and unrelated cables remain protected. No arbitrary code/evaluator is
introduced; the laboratory runs production `SceneModel` cases/actions with an isolated queue.
Cases retain first-match semantics and actions observe preceding writes. Source and restored
preview link graphs reject potential signal cycles conservatively; unsafe restored previews
cancel pending callbacks, reset to current defaults and report the refusal. Shipping saved
wiring/cuts/new-default merge behavior remains unchanged; no player-save migration is claimed.

`S13.acceptance.json` pins 11 implementation/inventory files, five check/helper files and 26
restored document revisions. Focused checks cover 17 native operation sequences, 20 unsupported
edit probes, observer-absent/throwing equivalence, repeat suppression, 149/150/500 ms timing,
reset/reentry cancellation, old saved wiring/cuts/new endpoints, restored-cycle rejection,
protected Save/conflict/undo/redo/crash recovery and ComposerModel validation before history.

The primary agent's actual UI edited lamp.on to set `memo=2` and reply
`S13 integrated source roundtrip`; selection, trace, timing, captured-save reentry, keyboard and
header Undo/Redo, Blob export/file-input import and actual protected Save passed. A fresh Node
process imported real `SCENES.sandbox` and invoked `SceneModel`, confirming `memo=2` and the reply.
Source Reload retained the behavior. Real stale-revision 409 and unsupported-reward 422 requests
left the source revision intact. Protected journal Undo restored all 26 original revisions;
fresh runtime baseline returned `memo=0` and `LAMP: on.` with byte-exact original Sandbox hash
`ea44d5a90ad211c2d50fad9519fa42e2b4dc4899925840fdd860e08aab23ac0e`.

The first browser restoration report was not persisted because an attempted cross-origin
evidence POST was correctly blocked by CSP. The report records root-observed outcomes with
that limitation; fresh baseline runtime/hash and the browser emergency-restoration equality
check independently confirmed recovery. No credentials or transaction tokens are in evidence.
No authored fixture remains in shipping source; unrelated source/player storage stayed intact.

```
pnpm exec tsx scripts/scene-system/check-behavior-authoring.mts
pnpm exec tsx scripts/scene-system/check-behavior-authoring-save.mts
pnpm exec tsx scripts/scene-system/check-behavior-source-roundtrip.mts baseline
pnpm exec tsx scripts/scene-system/check-behavior-acceptance-manifest.mts
```

The staged `check-behavior-source-roundtrip.browser.js` helper is intentionally reversible and
must be run only in the isolated composer. It uses actual controls/service Save, exposes no
session credentials, and provides journal Undo/emergency cleanup. Run the fresh CLI with
`edited` between UI Save and journal Undo, then with `baseline` after restoration. The manifest
check only verifies existing pins; fresh browser acceptance cannot be obtained by rehashing.
No campaign playthrough or publication is part of these gates.
