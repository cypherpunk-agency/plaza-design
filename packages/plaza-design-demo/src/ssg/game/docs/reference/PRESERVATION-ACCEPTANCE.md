# Preservation and current persistence acceptance

2026-10-20. **G12 PASS**, with the explicitly approved upstream animation exception below.
Verified shipping game source before this acceptance-only matrix update:
`sha256:99cb740c1db10a9ae13726d0b899066efad11323a73e56a580e4ec572b524bf0`.
The captured451-file baseline remains immutable:
`4d646c8add7a13b4687bd85fc5dae517376df47234666623351896bf974dc805`.

## World and actor paint

The current browser comparison contains95 native scene cases across all19 scenes,50 device
cases,20 bound-actor/transport cases and8 map cases:173 total. Fixtures cover the recorded
viewport, day/night, weather, reduced-motion and hack-layer combinations. They are finite
fixtures, not every possible campaign state. Shipping output has172 exact matches, zero render
errors and one Mall frame with282 differing pixels, maximum channel delta82.

Raw shipping report (its FAIL status is deliberately preserved):
`.scene-system/all-game-pixel-check/evidence/99cb740c1db10a9ae13726d0b899066efad11323a73e56a580e4ec572b524bf0-1792488434813.json`.

The difference comes from upstream commit `e8cf05f` introducing a walk-turn pose. A diagnostic
build removes only the `frameOf` branch guarded by `since < TURN`; all other current source and
the original baseline are untouched. It gives173/173 exact matches, zero errors. Raw control:
`.scene-system/all-game-pixel-check/evidence/99cb740c1db10a9ae13726d0b899066efad11323a73e56a580e4ec572b524bf0-1792488556853.json`.
Its diagnostic descriptor identifies the synthetic substitution; it is not shipping parity.
`build-all-game-pixel-check.mts --without-user-turns` reproduces this bounded control.
The default fixture was restored without that flag after diagnosis.

The user explicitly approved **Keep newer animation** on2026-10-20. Acceptance permits this
specific pose change. Neither the baseline nor the raw comparison is rewritten to conceal it.
Communication overlays and the persistent-conversation policy have their own approved scope in
COMMUNICATION-ACCEPTANCE.md; they are not claimed as identical world paint.

## Current saves and isolated modes

`check-all-game-persistence.mts` passes all19 native scenes using actual Game preparation and
persistence, source-backed SceneModels and shared gameplay sessions, actual Menu slots and
resumeInto/takeResume, and fresh current-format model/session restore. Evidence:
`.scene-system/all-game-persistence-uYz7Xn/evidence.json` at the shipping source above.

The check preserves source-backed saved scalars and conversation cursors, actual engine goals
and cable edits, board/noun/hack-vision positions, inventory, resources and clock. It verifies
copy-only serialization, stable scalar-owner identity and absence of duplicate SceneSave.state.
Browser storage is memory-backed for the test; user saves are untouched. Actual current native
Harbor Shift and demo mode/save/slot/reset isolation additionally pass check-play-storage.mts
with --native and check-demo-district.mts. No historical save adapter is required or introduced.

## Outcomes and timing

Previously accepted source-bound behavior fixtures retain their original checkpoint identities;
this acceptance does not relabel them as freshly rerun at the current hash. CONTENT-ACCEPTANCE.md,
CONTROLLER-NETWORK-ACCEPTANCE.md and COMMUNICATION-ACCEPTANCE.md reconcile all19 families to their
immutable-original ordinary outcomes, actor dialogue/rewards and registered simulations:

- Capsule thermal/boot histories; Downtown Registry, till, delivery trajectories and gate policy.
- Yard grab/drop/hatch/camera; Stacks permissions, lift/return/watchdog and camera.
- Beach billing/danger; Laundry start/stop/deadline/jacket/breaker; Sandbox time/environment.
- All four rail scenes: platform, ride-frame, position/brake/door and permission boundaries.
- Harbor actor/cargo cues; Harbor Shift tutorial/carry/objective/day and picture cases.
- Library and Moth observations; Warehouse metadata/draw transcripts; Market commerce/chatter;
  Shop source geometry and commerce; Mall original interaction/payment/rotation sequences.

These compare exact original replies, guards, rewards, atomic failures, relevant trajectories,
timing boundaries and repeat behavior. Current all19 ordinary source dispatch and native Play,
full-corpus forms and Save/fresh-import tests are accepted under G8/G9/G10. G3 owns the66-row
conversation corpus and intentional persistence policy. The timing fixtures and lifecycle
checks, rather than static screenshots alone, establish animation/simulation preservation.
The formerly recorded Train overflow boundary refusal remains explicit in its source audit;
normal authored prices/permissions/outcomes retain their original fixtures.

G7 integration/handoff and G13 final removal/completeness remain separate. No campaign
playthrough or subjective player-appeal acceptance is claimed.

## Final integration recheck

Final source `sha256:f96a56dd41f6b6cb51afa42e15569ff3266af980092f51e59698f3ec938f1e01` again has173 browser fixtures:172 exact,
sole approved Mall frame difference282/max82, zero errors. Immutable raw report:
.scene-system/all-game-pixel-check/evidence/f96a56dd41f6b6cb51afa42e15569ff3266af980092f51e59698f3ec938f1e01-1792490808181.json.
All19 current persistence cases pass at that same identity in all-game-persistence-mTFVzB.
The final removed Downtown synchronizer is preserved through64 original combinations and actual
Game.persist timing, source mutation/removal, protected Save/fresh shipping/byte Undo in
persist-source-MGNTwR. No baseline or raw failure was changed.
