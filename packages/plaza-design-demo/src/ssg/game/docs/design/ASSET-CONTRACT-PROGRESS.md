# Asset contract acceptance

A2–A6 closeout, 2026-10-28. [ROADMAP.md](../../ROADMAP.md) owns status;
[goal conditions](ASSET-CONTRACT-GOAL.md) retain the requirements;
[authoring contract](ASSET-DIRECT-MANIPULATION.md) explains the implemented system.
A2–A6 are complete locally. No required acceptance item or user design decision remains open.

## Coverage and migration

| Measure | Verified result |
| --- | ---: |
| Registered definitions | 890/890 |
| Authored top-level fields | 3,234/3,234 |
| Authored fields including nested controls | 3,401/3,401 |
| Structured authored contracts with typed/contextual controls | 146/146 |
| Definitions with declared direct manipulation | 445 |
| Definitions with explicit fixed/structured geometry explanation | 445 |
| Missing geometry dispositions or semantic admission exemptions | 0 |
| Numeric integer fields | 401; integral defaults and current source values |
| Original asset types reconciled | 886/886:885 retained,one compound traffic type replaced by five types |
| Original naming proposals reconciled | 245 top-level and24 nested |
| Allowlisted authored documents/files validated | 152/152 |
| Files referenced by source inspection | 158/158 (six additional code/data references) |
| Compositions / placements / used asset types | 90 / 4,484 / 835 |
| Explicit property keys / visual bindings | 17,846 / 3,579 |
| Presets / ordinary group children in presets | 28 / 9 |
| Existing source sequence targets | 19/19:4 camera,15 prepared-state;no authored property tracks to convert |
| Library dispositions | 648 reusable,217 contextual,25 helpers |

Building conversion covers167 uses in26 files with exact old layout formulas. Shared floorLayout
reserves ground/roof/parapet space,derives complete floors and retains the remainder below the roof.
Through-block height also becomes its actual physical height above bottomY. No writable floor count
or silently rounded existing floor-count animation remains.

Opening traffic becomes seven ordinary child behaviors. Eighteen former road placements become24
independent lanes across six chunks. Twenty-nine sky placements remain single generators with typed
internal craft. Residents:744 checked,727 depth values renamed and54 speeds converted across42 files.
Sixty-four time/angle/rate declarations use canonical authored units;native conversions remain at
existing compiler/drawing boundaries. Other migrated families include signage,vehicles,interiors,
terrain,level pieces,palettes,masks,station/train fittings and typed nested generator settings.

Source identity comparison covers4,456 original non-preset placements and4,475 current ones:
zero original qualified IDs removed. Nineteen new child IDs account for12 split road children and
seven opening behaviors. Seven original IDs become ordinary groups,retaining their source identity.
The nine preset children bring the complete current placement count to4,484.
Among83 non-composition/non-preset source documents,76 are identical to the untouched capture.
Seven differ only in stage references:six explicitly read bearing,and the train reads its shared
ceiling role. Gameplay/world-state keys and dialogue/reward/progression data are unchanged.

The final semantic pass corrects23 color fields formerly labeled text:RGB triples and CSS colors
retain their existing values and controls. The two remaining label matches mentioning "painted"
are floor text,not colors. Fractional Downtown room-light variation is an appearance factor,not
an integer seed. Shared scalar validation rejects fractional counts/indices/seeds;key creation,
validation and the easing inspector use hold animation for those discrete fields.

## Requirement audit

Each row corresponds to a bullet in the unchanged A2–A6 acceptance contract.

| Gate | Evidence and result |
| --- | --- |
| A2.1 Vocabulary and authored/prepared separation | Field semantics/shared constructors;strict coverage above;visualFields remain prepared input. Pass. |
| A2.2 Admission | Registry/validateFieldSemantics/validateSpatialContract reject missing/invalid groups,units,defaults,targets and geometry. Focused negative cases pass. |
| A2.3 New definitions and exemptions | All890 production definitions require semantics and explicit geometry. Five replacement traffic types pass;no migration exemption/fallback. Pass. |
| A2.4 Shared consumers | Existing inspector,resolveComposition,captured projection,viewport gestures,ComposerModel and renderWorldFrame consume the contracts. No renderer/adapter/runtime/property store added. Pass. |
| A2.5 Buildings | floorLayout feeds kernels,anchors,bounds and derived inspection;threshold/remainder/native roof cases pass. |
| A2.6 Traffic | Ordinary identities/groups/presets preserve clearance,density ramps,quiet regions and scheduling;native comparisons and boundary checks pass. |
| A3.1 Shared manipulation | Rectangle,range,endpoint,radius/repetition controls return sparse typed source edits;no app type switches/stretching. Pass. |
| A3.2 Representative native cases | Building,cloud,lane,masked Far Shore,attached light,mirrored/scaled Beach bar and differing parallax workflows below pass. |
| A3.3 Eligibility and anchors | Pre-preview validation,linked-field suppression,captured transforms and opposite-edge checks pass. Inspector/handles use the same fields. |
| A3.4 Nested identity and animation | Shared rows survive insert/reorder/remove/deep Undo;stale callbacks reject. Structured configuration cannot create nested scalar tracks. Existing qualified property targets animate normally. Pass. |
| A3.5 Gesture/history/persistence | Native capture,snapping,Escape,cancel,one Undo,invalid recovery,download/import and protected Save/fresh load pass;workspace navigation leaves authored camera unchanged. |
| A3.6 Roof thresholds | Native340→440 crosses4→5 complete floors;floorHeight66,ground anchor,seed113 fixed;34 units remainder. Download/reload/import and one Undo pass. |
| A3.7 Traffic interaction | Actual Add,lane endpoints/altitude,duplicate/delete,group move,preset,bundle round-trip,patrol radius and drone destination/rejection pass. |
| A4.1 All inventory entries | Original886 types and269 rename proposals reconciled;current890 strict definitions and all source uses validate. Pass. |
| A4.2 Atomic consumers | Current sources,defaults,nested rows,presets,roles,binding providers,sequence targets and tests read the new keys. No alias/codec. Pass. |
| A4.3 Numerical/identity preservation | Native family/full-scene comparisons,explicit conversion checks and qualified source identity audit above pass. |
| A4.4 Height migration |167 exact source conversions/shared layout;no original property tracks requiring count conversion;default/configured geometry and edited thresholds pass. |
| A4.5 Independent traffic | Seven opening behaviors,24 road lanes,29 retained fleets;source/order/motion/clearance/boundary checks pass. Internal particles are not scene instances. |
| A4.6 Whole eligible library |445 explicit controls and445 explicit exclusions cover all890 definitions;152 allowlisted sources include folder,catalogue,backdrop,demo and sequence content. Pass. |
| A5.1 Replaced paths | Look fallback,74 duplicate raw constructors,old traffic module,142 unused train fields,implicit geometry and native-unit authoring aliases removed. Shared metadata replaces2,791 repeated annotation objects. Pass. |
| A5.2 Prepared diagnostics | stateOverride resolves effective values/provenance once;linked controls/tracks suppressed;no saved effective-value copy. Native linked/copy cases pass. |
| A5.3 Geometry exclusions |445 source-backed fixed/structured reasons;none inferred from missing dimensions. Fixed art,people/vehicle bodies,typography,markers and heterogeneous groups retain supported transforms. Pass. |
| A5.4 Guidance and library | AGENTS.md,authoring README and current contract describe extension/admission. Asset-browser checks cover all890 entries,4,027 library usage paths and filtering. Pass. |
| A5.5 Compound editors/floor paths | Old bundle/list-only traffic authoring and writable floor counts removed;ordinary groups/presets and shared height layout replace them. Pass. |
| A6.1 Repeatable current audits | asset-source-contracts and asset-spatial-contracts check production validators/current registry,not historical formats. Counts above pass. |
| A6.2 Workflows | Native and focused matrix below covers projection,mirroring,attachment,depth,masks,history,rejection,persistence and keyframes. Pass. |
| A6.3 Layout/traffic preservation | Exact source/row totals above;native and canonical comparisons preserve thresholds,seeds,overlap,clearance and schedules. Pass. |
| A6.4 Current pictures/cadence |42 scenes/126 full native frames and five sequences/50 normal+reduced frames match unchanged baseline;family timing checks/runtime integration pass. |
| A6.5 Responsiveness/builds | Measured heavy composition below;immutable relevant-input reuse removes world rebuilding per pointer. TypeScript/homepage and focused checks pass after final cleanup. |
| A6.6 Results and limits | Exact coverage,workflow results,exclusions and limitations are recorded here. No design decision or visual exception remains pending. |

## Native editor workflows

All temporary source edits were undone in an isolated editor context. The user's player save was
untouched. These are native UI workflows,not a general gameplay playthrough.

| Workflow | Observed result |
| --- | --- |
| Building roof / persistence |340→440,4→5 floors,66 fixed floor height,34 remainder;actual29,784-byte download survives reload/import;Undo restores clean source. |
| Qualified sequence edit | At opening Beach0,frame Downtown tower4700;keys0/561 and1/601;midpoint581;actual2,961-byte download/import recovers track;authored camera/playhead unchanged by framing. |
| Cloud | Add/frame;top band550→444.5 with bottom400 fixed;seed5/cloud width150 unchanged;inverted range rejects with no history. |
| Lane / patrol / stream | Lane start−4000→−1827,end26000→23173,altitude480→1836;copy/delete/Undo. Patrol radius600→693. Drone destination8500/480→9072/834;passing launch rejects immediately. |
| Traffic group | Add seven behaviors,move groupX0→100;actual31,964-byte download/import recovers all children and collective placement. |
| Linked hut / independent copy | Rear width74→110 updates read-only front;front has no ineffective handles. Independent front copy resizes normally. Undo restores clean source. |
| Mirrored/scaled attachment | Native independent Beach bar width edges at facing−1,scale2;captured projection preserves opposite source edge. Protected bound original rejects scale. |
| Attached light / water / inset | Attached radius50→79;station horizon62→102 with wall26 fixed and invalid wall120 rejected;Yard tank height9→14/inset10→15 with top fixed. |
| Masked Far Shore | Boundary4680→0 reveals drawing;west width1566→1644 preserves2330.8/0 anchor and seed17;two Undos restore masked source and explanation. |
| Harbor crane | Boom1→0 exposes trolley/drop controls;trolley−60→−28 leaves drop40 and anchor7685.5/34 fixed;two Undos restore raised boom/no handles/clean source. |
| Nested rows | Actual Downtown reorder/remove/add,Undo/Redo and train nested pages;stable UI identity and100-deep model history;stale callbacks rejected. |
| Cancellation / eligibility | Native captured Escape restores source without history;focused pointercancel,pinch/disposal,snapping,blocked preview and commit rejection checks pass. |

## Preservation and focused verification

No baseline was changed. Final full native capture:19 folder scenes×3=57/57 and23 catalogue scenes×3=
69/69 exact/nonempty. Five sequences×five samples×normal/reduced=50/50 exact/nonempty. These176
frames cover real shared native preview/render paths. Color-metadata corrections do not change
values or paint code. Standalone comparisons additionally cover edited/default dimensions and units.

Representative family evidence:684/684 building paint-command comparisons;27/27 opening traffic
order comparisons;270/270 road native frames;48/48 sky frames;2,232/2,232 resident frames;176/176
ordinary vehicle frames;460/460 signage frames;360/360 duration frames;72/72 flock frames.
Later role/color/palette/geometry families also matched;these overlap full-scene samples and are
not summed into a misleading unique-frame total. The earlier sky-glow exception is resolved:
restored single-generator drawing matches exactly.

Passing focused checks:asset-source-contracts,asset-spatial-contracts,asset-browser,asset-preview-state,
asset-placement-contracts,asset-thumbnails,artwork-role-source,native-target-pending,pending-fixture-state,
keyframe-editor,inline-keyframes,structured-row-controls,editor-hit-targets,animated-authoring,
sequence-runtime,opening-workflows,sky-traffic-authoring and title-traffic/boundary cases.
The413-type independent-artwork workflow also checked actual Add/edit/history/bundle/protected Save,
fresh native reload and paint. TypeScript and homepage builds pass;final cleanup/build result below.

## Measured responsiveness and limits

Chrome155,1152×1858,DPR1.25,backing556×1464,Downtown proposal/front-12. Earlier five inspector edits
before relevant-input registry reuse:median96.2ms/max115.1ms. Final five:40.3ms/max57.8ms;render
median9.7ms/max16.3ms. Workspace zoom changed slightly2.71282→2.72883,so this is near-matched local
evidence,not a controlled cross-machine benchmark. Final captured roof drag:five renders,median8.7ms,
max9.4ms;one committed command41.5ms and one full source-validation span2.9ms. One Undo restores clean
source. Both recordings have zero overflow,incomplete spans and invalid ends.

Known limits:CPU submission is measured,not GPU/presented-frame latency;small samples do not guarantee
all-machine performance. At fractional workspace zoom,preserved native origin snapping can shift the
displayed opposite edge by up to one projection snap step;the authored physical edge stays exact.
Fixed artwork and heterogeneous groups intentionally lack fake body-resize controls. Structured
configuration uses typed rows but has no unsupported nested scalar animation. Protected native geometry
retains its restrictions. Frame samples plus focused invariants do not constitute an exhaustive
playthrough or proof of every possible future authored input.


## Final cleanup and build

Removed the ignored untouched source/ZIP capture,comparison scripts and generated captures,one-off
property/source migration scripts,and original proposal inventories. No production or focused test
consumes historical fixtures. Unrelated pre-existing work and artifacts were preserved. Re-ran
asset-source-contracts,asset-spatial-contracts and animated-authoring after removal:all pass.
TypeScript and homepage build pass;fresh editor app-OLBEYDKC.js loads with the clean native source.
The final semantic correction changes metadata only;no subsequent paint/source-value change invalidates
the native comparisons. No runtime,renderer,adapter,compatibility layer or property store was added.
No commit,push or deployment was performed.
