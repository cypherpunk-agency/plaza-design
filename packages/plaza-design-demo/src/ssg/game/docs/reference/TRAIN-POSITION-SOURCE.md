# Train position report source

The pure `train.position` effect has been removed. The position noun's ordinary source cases now choose the station, halted or between-stations response. They use the existing shared select queries over positive readonly physical observations and the existing `Case.say` delivery path. Missing physical/shared context selects an explicit unavailable response.

Current/next station names, the physical door-open observation and one-decimal kilometre formatting are readonly display observations on the registered Train primitive. They never become saved state. Source labels and existing select/label queries own the open/shut wording; the caption uses the explicit `{query:train.positionDoors}` reference, so prospective query removal is validated. No new scalar bridge, formatter query, event wrapper or evaluator was added.

Source authors can change the response references and templates, rebind door wording, disable or reorder branches, and delete replaced text keys. The old static position text requirements were removed. Native mechanical tick events, paid brake mechanics, halt/resume inputs, and door permissions remain unchanged. The existing native `where` status display and physical region classification remain registered display logic.

## Verification