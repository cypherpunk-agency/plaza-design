# Train paid brake response ownership

The paid brake still invokes the car's real emergency stop (`SceneModel.brake`, the `brake` of the `train.car` mover) exactly once. Its native effect now owns only that physical call and the accepted-stop redraw. The standing/already-braking/accepted response selection and text references live in ordinary scene source.

Three positive readonly physical observations describe the same phase classification as the existing brake primitive: standing, already braking, and ready to brake. Existing `native.reads` bindings expose them to shared select queries. Those queries combine the existing paid-pass query with the physical observation. The device's ordered `noun.on` cases select a response, call the one physical effect, then use the existing `Case.say` path.

This retains the actual manual/signal action context, command prefix, speaker, tone, causal receipt and change/reply order. There is no saved last-result field, extra event runner, synthetic privileged player input or postcommit reply context reconstruction. Eligibility only observes state. Missing shared/physical context reaches the explicit unavailable response without invoking physics.

The native effect's hardcoded brake text selection and its static text requirements were deleted. Source authors can rebind those responses and delete replaced text keys. The subsequent TRAIN-POSITION-SOURCE.md slice removes the native position report effect too. The spontaneous mechanical tick remains native.

## Verification