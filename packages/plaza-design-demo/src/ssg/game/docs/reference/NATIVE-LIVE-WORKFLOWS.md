# Native live workflows and committed replies

Beach rental, billing and danger clearing now live in `scenes/beach/gameplay.json`.
Commands own charges, state changes, counters and goals. Their old scene-specific
effect bodies, tick implementation and duplicate response texts have been deleted.
Existing native state bindings use the current common state owner.

`native.intervals` describes ordinary live-tick workflows:

```json
{
  "beach.billing": {
    "kind": "liveInterval",
    "elapsed": "minute",
    "duration": { "tuning": "minuteMs" },
    "active": {
      "all": [
        { "state": "beach.rented", "is": true },
        { "not": { "state": "beach.billing", "is": "pause" } }
      ]
    },
    "inactive": "hold",
    "resetOn": ["beach.rent.started"],
    "due": [
      { "when": { "tokensAtLeast": 1 }, "command": "beach.bill" },
      { "command": "beach.exhaust" }
    ]
  }
}
```

The existing live `SceneModel.tick` runs these bindings in source order, in the
former scene-rule tick position. Conditions and commands use the existing
`GameplaySession.matches/dispatch`; there is no additional evaluator or scheduler.
Each active interval accumulates the supplied live `dt` in its scratch key. A due
interval resets elapsed time to zero and dispatches one system command. Overshoot
is discarded and the interval fires at most once per tick. Inactive `hold` retains
elapsed time, while `reset` writes zero. Declared committed events can reset an
interval immediately. Reset/restore use the existing scratch lifecycle; disposal
removes the observer and live hook. Offscreen `live=false` updates do not advance
ordinary workflows. Host pause retains the existing update/clock policy.

These policies preserve the current Beach behavior: the billing meter holds a
partial minute while paused or inactive and resets on a new rental; the drone's
danger timer resets whenever its flag is clear. They deliberately use live ticks,
rather than substituting wall deadlines or persisted CLOCK phases.

`native.replies` maps a committed event to `{from, say, template?}`. It uses the
existing device caption/history/receipt path. Optional templates reuse the shared
gameplay text renderer after commit. Each due workflow receives its own causal
receipt scope, including when two workflows finish in one tick. No player bubble,
new notification lane or duplicate log is introduced.

Validation requires unique elapsed owners, positive finite duration tuning,
declared reset/reply events, real source devices, validated text fields and ordered
due cases with one final fallback. Due commands must allow only `system`. All lists
are bounded. The inspector supports interval creation/deletion/reordering, ID and
elapsed/duration rebinding, activation/outcome conditions, reset events, and reply
creation/deletion/device/text/tone/template edits.

Evidence:

Continuous simulations and cancelable washer deadlines are separate work. This
primitive adds no player-save format conversion or storage migration machinery.
