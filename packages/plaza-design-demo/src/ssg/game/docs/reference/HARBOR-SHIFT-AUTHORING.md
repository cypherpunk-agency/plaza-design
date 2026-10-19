# Harbor Shift source ownership

Harbor Shift uses the same Commands & dialogue editor and native Play frame as other scenes. Its original flag/item/event/command names, command permissions, conversations, graph nodes and choices are ordinary source content. Current cross-references and invocation permissions remain validated; historical names are no longer a second schema. Scene objectives and minute/day rules may be removed without restoring the shipping tutorial.

`scene.json.presentation` names the existing dockworker/prop drawing primitive and maps its eight finite flag roles to actual gameplay flag declarations. Typed Scene controls can rebind or omit each role, or remove the whole mapping. The actual pending scene passes those refs to both its frame snapshot and the player's carry drawing. Omitted roles read false. The registered drawing still owns the original parcel/case/trolley/clamp poses and geometry; the mapping creates no new state or actions.

`timeDay` is an optional ordered list of `{when?, day}` rows, evaluated with the same condition evaluator as `time`. Days are positive integers from 1 to 10000. The shipping rules retain day 2 after the empty case is returned and day 1 otherwise, independently of the minute selection. The actual Game consumes the compiled source day. With no day rules it retains the current day; with no minute rules it releases the story clock and retains its current time. Ordinary conditions, pages and goals remain in the shared model.

The scene, horizon, trolley and bay artwork remain registered primitive dependencies. Ordinary uses, actors, dialogue, objectives, flags and commands are not inferred from that artwork.

The obsolete Harbor-only delivery laboratory UI was removed. Its synthetic circuit and clock helper have only regression-test consumers and now live in `scripts/scene-system/shift-{pilot,delivery}-fixture.mts`; they are no longer shipped engine/editor modules.

## Verification

- `check-shift-authored-floors.mts`: 2048 immutable carry/objective/minute/day combinations and 768 immutable visual snapshots; absent optional source content and wholly replaced ordinary graphs/vocabulary.
- `check-shift-conversation-source.mts`: 48 actual Game one-press interaction comparisons.
- `check-scene-pilot-parity.mts`: all 1100 immutable original guidance/time/visibility/interaction/message/state/event cases. The earlier approved move from `shift.replace-tag` interaction authority to `shift.reissue-tag` conversation authority is asserted explicitly; no fixture bytes changed.
- The broader fixture exposed an earlier source-graph omission: the old supervisor reissued a missing tag while showing off-duty dialogue whenever checkout was false. A source-only `off-duty-reissue` entry/node now restores that behavior, including unusual flag combinations. Assignment/trolley choices still take precedence, as in the original adapter.
- `check-shift-editable-save.mts`: actual typed choice removal, original graph/command deletion, dialogue cloning/rebinding, edited off-duty reissue, visual-role/day rebinding, registered generic editor, live pending behavior, history, portable bundle, protected paired Save, atomic foreign-reference rejection, fresh shipping JSON import, actual Game clock behavior and byte Undo.
- `check-gameplay-foundation.mts` and `check-gameplay-authoring.mts` retain the synthetic circuit's test coverage using its relocated test-only helper. Source failure tests now exercise actual invalid references rather than historical permission floors.

Final protected-source evidence: `.scene-system/shift-editable-save-5cRNld/evidence.json`. Package `tsc -b` passes. Integrated builds, browser checks and raster gates remain owned by the overall checkpoint.

No save-format migration or compatibility adapter was added. Native scene pixels, valid tutorial progression, primitive geometry and timing retain their original defaults.
