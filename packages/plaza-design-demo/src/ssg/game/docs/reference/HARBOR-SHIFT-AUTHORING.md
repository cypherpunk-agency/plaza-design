# Harbor Shift source ownership

Harbor Shift uses the same Commands & dialogue editor and native Play frame as other scenes. Its original flag/item/event/command names, command permissions, conversations, graph nodes and choices are ordinary source content. Current cross-references and invocation permissions remain validated; historical names are no longer a second schema. Scene objectives and minute/day rules may be removed without restoring the shipping tutorial.

`scene.json.presentation` names the existing dockworker/prop drawing primitive and maps its eight finite flag roles to actual gameplay flag declarations. Typed Scene controls can rebind or omit each role, or remove the whole mapping. The actual pending scene passes those refs to both its frame snapshot and the player's carry drawing. Omitted roles read false. The registered drawing still owns the original parcel/case/trolley/clamp poses and geometry; the mapping creates no new state or actions.

`timeDay` is an optional ordered list of `{when?, day}` rows, evaluated with the same condition evaluator as `time`. Days are positive integers from 1 to 10000. The shipping rules retain day 2 after the empty case is returned and day 1 otherwise, independently of the minute selection. The actual Game consumes the compiled source day. With no day rules it retains the current day; with no minute rules it releases the story clock and retains its current time. Ordinary conditions, pages and goals remain in the shared model.

The scene, horizon, trolley and bay artwork remain registered primitive dependencies. Ordinary uses, actors, dialogue, objectives, flags and commands are not inferred from that artwork.

## Artwork (2026-10-22)

The scene is drawn with the harbor shift kit (`art/harbor/shift-kit.ts`, `shift.*` in Library › Artwork, category "harbor shift"): the bay with the city and the Spire across the water, a container ship at the berth, ship-to-shore cranes, the quay apron, container blocks with reefers and their plug gantry, high-mast sodium lights, fog, the transit shed with its canopy, the supervisor's glass booth (back and front parts round the supervisor), the dispatch and receiving windows, counters, the case-return rack, parcel, case, trolley, clamp and release, the checkout reader with its turnstile and shelter, the wage-slip printer, the shift board, station signs, lockers, floor markings, the bay's ends and the wet floor. Every look is a field on its piece.

The functional instances keep their ids, placements, attachments and bindings (`dispatch-post`, `rack-post`, `receiving-post`, `checkout-post`, `office`, `trolley`, `release`, `clamp`, `bay`, `checkout`, `statement`, `complete`, the `use-*`, `cue-*` and `light-*` markers); only their artwork type changed, and the stateful pieces read the same presentation values (`visible`, `x`, `released`, `trolleyX`, `restX`, `checked`, `done`). To move a station, move its post or parent instance: its use marker, cue and light are attached to it and follow.

The obsolete Harbor-only delivery laboratory UI was removed. Its synthetic circuit and clock helper have only regression-test consumers and now live in `scripts/scene-system/shift-{pilot,delivery}-fixture.mts`; they are no longer shipped engine/editor modules.

## Verification

No save-format migration or compatibility adapter was added. Native scene pixels, valid tutorial progression, primitive geometry and timing retain their original defaults.
