# END presentation handoffs

An event handoff may specify `presentation: "end"`. This finite operation uses
the existing postcommit handoff interpreter. SceneHost forwards it to its actual
Game host, which opens the existing transient END presentation. It neither
creates a saved flag nor derives presentation visibility from saved completion
state; loading a completed game does not reopen END.

A handoff cannot request both an immediate cutscene and an immediate END
presentation. Existing delayed command continuations remain available and keep
the existing SceneTime cancellation and pause policies. The typed presentation
selector replaces a selected cutscene, and selecting a cutscene clears the
presentation operation.

Use ordered source events when completion has distinct deliveries: emit the
goal event, then the caption event, then the END event. The existing transaction
notification order produces the caption before END. Eligibility, a refused
transaction and disposed sessions produce no presentation. Repetition is
controlled by the authored command condition, not by a second presentation
state owner.

What the END card says is a document, not drawing code: story/end-card.json (title, lines with the tokens `{controlled}` and
`{handle}`, the prompt), registered as source document `end-card`, validated by story/end-card.ts and edited in World › Game opening ›
End card. Private Play passes its pending copy through `GameRuntimeSources.endCard`. The card has no state of its own.

The presentation callback is optional on a general SceneStore. A session whose
source requires a presentation handoff must have a real presentation host;
attachment rejects a missing host before registering its observer. This avoids
silently treating an unavailable presentation as delivered.