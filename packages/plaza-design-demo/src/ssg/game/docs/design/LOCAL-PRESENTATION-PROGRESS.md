# Local presentation: coverage and acceptance

Authorized 2026-10-28. The inventory below preceded dependent migrations. L1–L5 are implemented;
the acceptance evidence below distinguishes native interaction, focused checks and preservation.
Publishing is excluded.

## L1: fixed configuration inventory

The inventory distinguishes contracts from their repeated uses. Ten independently editable
boolean contracts replace the former FramePass family. All five affected sequence sources are
migrated: explicit switches on two world sequences, actual world-input capability limits for
three standalone sequences. All ten climate definitions now live in city.json. Existing scene environment, asset geometry,
story, checkpoint and timeline contracts remain authoritative; do not copy them into rendering settings.

| Contract/family | Current owner and consumers | Disposition and contextual destination |
| --- | --- | --- |
| Ten render switches: sky/weather/casters/actors/shade/grade/lights/prompts/bubbles/vision | Existing source documents → world/render-policy.ts → render-scene.ts and FrameInspection | 10/10 contracts exposed contextually; 5/5 affected sequences migrated; former implicit presets removed |
| Climate weights (seven kinds), variation seed salt, fixed kind, reporting roof/note/name | city.json CLIMATES; weatherAt/forecast/report/screenLine | 10/10 definitions migrated; City map Climate controls and shared source-driven deterministic forecast |
| Beach climate binding | city.json PLACES → sceneClimate | 1/1 former scene-ID exception replaced by explicit place climate binding; Place inspector |
| Ambient sky/city/street/weather availability | SceneDef.ambient; SceneEnvironment; scene factories/manifest compiler | Already typed Environment controls; retain source/capability distinction from pass switches |
| Weather covers | SceneDef.ambient.covers or registered canopy geometry | Existing Environment or Layout controls; no duplicate coverage field |
| Facing/outdoor | SceneEnvironment or registered window/building geometry | Existing Environment or Layout controls; preserve authoritative geometry inputs |
| Horizon | SceneEnvironment or registered sky/water geometry | Existing Environment or Layout controls |
| Street shade bands/gaps/depth | SceneEnvironment or registered wall geometry | Existing Environment or Layout controls |
| Local light/caster geometry and intensity | Registered asset fields, SceneDef.lights/casters, frame additions | Existing asset controls and ordinary source bindings; retain registered physical kernels |
| Grade tint/strength/daylight/weather formulas | lighting.ts gradeOf; same formula everywhere | Shared algorithm stays code; only existing grade enable/disable differs locally |
| Camera framing/zoom/directed position | Sequence shots/tracks and sequence.world-control width/height/pixel/ground/origin/playFit | Already typed assets/keyframe controls; preserve existing scopes, do not invent district follow overrides |
| Local camera floor bounds | Level kit low/high; runtime/camera.ts | Existing level source/controls; shared following/smoothing stays code |
| Local room light and visual wash | Scene phases/wash; story rules and registered room assets | Existing typed Story phases/asset controls; preserve source ownership |
| Local rain/day/clock direction | sequence.world-control visual fields and timeline state | Existing animatable typed fields; retain shared evaluator and clock |
| Local simulation time policy | SceneDocument time/timeDay, story persona/run policy, checkpoints | Already source authored/typed; do not move gameplay into presentation switches |
| Local movement/abilities | Level geometry, mover definitions, play profiles/persona source | Already typed source; speed/gravity constants are shared implementation |
| Local interaction behavior | Scene uses, native target/graph/availability and access sources | Already typed contextual controls; shared reach/keyboard geometry stays code |
| Local guidance | Profile guidance, objective attention and ordinary story cues | Already source authored; ShiftGuidance animation/read/reminder mechanics are shared |
| Feedback timing and sound policy | engine/feedback.ts; runtime/audio.ts; presentation signal cues | Shared queue/timing/tone synthesis stays code; authored cue requests already use shared commands |
| Input bindings | runtime/input-routing.ts | Shared controls stay code; no location-dependent key binding table |

Four starting families and seven other policy areas were inspected. No concrete ownership or
precedence conflict remains in this inventory. Do not add hypothetical local scalar overrides.
For pass switches the precedence is default → district → chunk → composition →
group/member → sequence, with explicit named sequence members after its whole-picture override.
Other contracts retain the narrower scopes above. Source availability/capabilities still apply;
enabling a pass does not manufacture absent gameplay, weather or entity simulation.

## Preservation evidence before migration

The existing native visual runner was executed before configuration changes. It reports 55/60
passing cases; five stored-image differences already exist (warehouse-day 997 pixels,
stacks-day 3,629, harborStation-day 3,390, harbor-day 1,864, harbor-night-rain 1,734).
These are not introduced by this goal and their stored images will not be regenerated.
Matched native comparisons use the actual pre-change scene canvases; approved fixtures remain
untouched. The final comparison repeats 24/24 exact matches after the renderer changes.

## Acceptance outcomes

| Case | Outcome and evidence |
| --- | --- |
| 1. Original report | Sequence Rendering identifies Color grading Off from Glide; Inherit exposes the supplying district. Staged On leaves the picture untouched before Apply, changes native grading after Apply, and Undo restores exact pixels. Native camera-space checks prove the empty workspace stays ungraded. |
| 2. Adjacent differences | Six native production-renderer pixel checks pass: independent neighbor grades, one grade in overlaps, foreground grade-off, ungraded workspace, a crossing headlight using its destination policy despite disabled source lights, and inspection using the same resolved value/source. |
| 3. Precedence | Focused contracts cover every layer, explicit false, absence/reset, named sequence members and invalid combinations. Native composition, group, member and chunk Sky edits each change the picture and Undo restores exact pixels. Sequence inheritance/source navigation opens the correct Harbor district inspector. |
| 4. Climate | Typed fixed-weather and weights controls use pending city source; deterministic sampling, forecast/report propagation, fixed-kind behavior and stable seed salts are checked. Native district fog edit reaches private Play as weather=fog. Temporary toolbar weather remains preview state. |
| 5. Camera | Native Camera X edit at Glide 55 s moves the camera border and picture while retaining the canvas viewport; Undo restores exact pixels. Focused native-camera, bounds, remembered view and sequence-source checks pass. |
| 6. Persistence | Actual typed forms exercise reset and Undo/Redo. Bundle import, invalid rejection, protected Save and fresh native reconstruction cover sequence, composition, member, group, chunk and district settings plus climate. Native staged Cancel/Apply and private Play were exercised; Stop destroys its iframe. Disposable browser edits were undone; Undo is disabled and no private realm remains. |
| 7. Preservation | Final 24/24 native scene pictures match pre-change actuals, including all five unchanged stored-reference discrepancies above. All five affected sequences match: Glide at 55/68 s, Title at 2 s, Intro at 1.5 s, Act2 at 2.4 s and Taxi at 1.2 s. Act2/Taxi comparisons normalized both canvases to CPU readback raster mode before exact comparison; GPU/CPU rounding was not treated as an authored change. No reference images were replaced. |
| 8. Responsiveness | Existing CPU recorder on Harbor world, Glide 68 s, Workspace: six fixed-weather toggles, wall median 275.6 ms/max 336.3 ms. Earlier matched six-edit workload: median 493.15 ms/max 604.8 ms. Final recorder editor.command p50 254.8 ms, render.total p50 6.7 ms; hidden inspector p50 0.1 ms instead of 302.1 ms. No overflow, incomplete spans or invalid ends. These whole-source edits still have a noticeable pause; this is not a claim of instant interaction. |

Final validation: package `tsc -b`, homepage build (152 documents/158 references), 13 focused
checks covering local presentation, frame director, seam continuity, composition authoring,
city locks, native camera/bounds, editor view memory and sequence runtime/source selection.
The all-scope persistence check also ran after its coverage extension. Stale runtime
FrameDirector.passes/SEQUENCE_PASSES/FramePass consumers: zero. Whitespace check passes.

Resolution uses one typed path in world/render-settings.ts and world/render-policy.ts.
Existing narrower controls remain their sole source: level/camera geometry, environment,
asset lighting, story guidance and clocks. Shared algorithms and asset-only capability limits
stay code. Joined grading uses the existing horizontal chunk windows in scenery order, clipped
to the game camera; it is not a new per-object alpha-mask system. Moving lights choose their
current projected region. No renderer, adapter, runtime, property store or compatibility reader
was added. Current AGENTS, handbook and authoring guidance describe these boundaries.

Temporary native-check build files were removed by the normal homepage build; source-store
scratch runs self-clean. Keep the small current-contract checks, not captured historical engines
or regenerated expectations. Nothing was published.
