# Downtown Registry control and billboard source

Registry access outcomes and billboard scheduling now use shared editable source.
The native `controlNode`, `node.control` and `billboard.feed` bodies were deleted.
This does not claim the remaining DLV-9 controller is fully consolidated.

## Source ownership and order

- Box and relay GUARD success steps call matching guard-origin inputs. Source
  ordered cases distinguish fresh and already-controlled targets using the same
  label query used by the controlled grant. The next existing guard goal step
  remains after the input, preserving guard.ok, control reply, goal, opened event
  and sector-unseal order.
- `node.box`, `node.relay` and `node.billboard` are authoritative label fields.
  Their queries drive grant targets, freshness conditions, formatted control
  captions and the three boolean controlled-status/lamps queries. There is no
  second grant-target literal in the commands. The native node-count formatter
  still calls the existing canonical player service after the atomic grant.
- `controlled2F`, `controlled31` and `controlledTV` retain stable presentation
  input IDs but now name source select queries, replacing native hardcoded
  predicates. Source validation requires boolean select outputs; designers can
  edit their conditions and values. Composition reads these same source queries.
- Only a fresh box grant emits the event that arms its peer response. The peer
  deadline reads authored `peerMs` (default 700), and its reply speaker is owned
  by the source reply binding. The former duplicate `peer.box.who` label is gone.
- A signal-only billboard command selects CAM-3 and starts the ad and trend
  deadlines; the manual refusal remains source-owned. Ad expiry emits the same
  native `billboard.ads:next` event, retaining existing cable delivery latency.
- A trend callback rechecks feed=cam3 when due. An already-controlled target is
  silent. A fresh target commits its grant, then publishes tv.trend followed by
  the control reply, in the original order and one causal feedback scope.

Replies reference static source line keys. The native formatter substitutes the
corresponding node label query and current nodes count. Committed reply lookup
is static; no post-commit dynamic reply-key expression is introduced.

## Parallel deadlines

`native.deadlines[id].restart` is `replace` by default. Explicit `parallel` keeps
one independent SceneTime callback for each start. The billboard uses parallel
ad and trend deadlines because repeated feed signals originally scheduled
independent callbacks: replacing them would shift visible timing. Cancel events,
model reset/restore and session disposal cancel all owned handles; pause/resume
uses the same SceneTime. Tuning remains the sole duration source.

## Verification

- `check-downtown-registry-control.mts`: 128 immutable-original histories cover
  all control subsets, box/relay/repeat guards, manual/signal feed, repeated feed
  and ad timelines, cut/intact ad cable and reversed ad/trend delay order. Grants,
  scalar state, goal sets visible during captions, native events and exact scene
  times match. The same 128 histories also compare normalized receipt cue, scope,
  source and tone against published `ee8cc6a` rules on the current interpreter.
  Logical grants are observed through the shared grant stream, rather than
  requiring the removed controller's granted callback.
- `check-downtown-registry-forms.mts`: actual input/query/reply/deadline controls,
  static text-key selection, node-label and caption edits, timing controls,
  invalid-target rejection and exact history Undo. Changing node.box to 0x31
  drives grant, freshness, caption, composition lamp state and the real green
  box-LED painter from that same field.
- `check-downtown-registry-save.mts`: protected paired gameplay/device Save,
  invalid reply key/target/origin/restart/query/boolean output rejected atomically,
  actual Game root fresh/known outcomes and receipt, fresh shipping SCENES import
  from saved JSON, and exact byte Undo. Evidence:
  `.scene-system/downtown-registry-save-sweAfC`.
- `check-parallel-deadlines.mts`: independent repeated due times, omitted/default
  replace behavior, all-handle cancel/reset/restore/dispose, pause/resume and
  actual typed policy controls/invalid edit/history Undo. Existing Laundromat
  deadline histories and forms remain covered.

## Remaining native logic

DLV-9 trajectory geometry and scan timing remain native. Ordered route/access/busy refusals use ordinary device Case lists; only two physical direction endpoints invoke the trajectory. No duplicate native refusal branch remains. The B slice also removes native scan/door/completion/finale writes and policy: finite physical milestone inputs dispatch authored shared commands. The initial trajectory is initialized before the started command commits, so synchronous redraw sees valid driving coordinates.

VERIFY sign test now uses a shared command: emit its cosmetic pulse, grant the existing vrify keyring fragment, then deliver the authored static response. Composition consumes `pulse.sign` on the existing scene clock. The old sign.test effect and private signTest timestamp are removed. Fresh/known fragment behavior and pulse-before-caption order stay unchanged.

`check-downtown-dlv-sign.mts` covers 64 immutable-original DLV location/route/manual/signal/lock/wire histories, exact scalar/scratch/trajectory/caption/event/finale order, and sign fresh/known/repeated grants, pause/resume/reset/disposal and composition state. The Registry typed/Save fixtures also exercise actual Case condition/response controls, pulse target rebinding and sign text changes; malformed source references reject atomically, edited pending and fresh shipping models consume saved fields, and byte Undo restores both documents. Latest evidence: `.scene-system/downtown-registry-save-fgWd4F`.

`check-causal-feedback.mts` now invokes actual current shared sessions and ordinary act/guard entrypoints rather than deleted native effects. Its frozen original also uses the equivalent ordinary act/guard entrypoints. Exact captions, sources, goals, state, scheduled native events and DLV completion/END order compare directly; no caption/event normalization hides differences. Existing independent cue/audio assertions remain active. Commit/redraw/persistence notification counts are intentionally outside that observable comparison; dedicated grant tests cover the new common ownership.

## DLV physical milestones and finale

`downtown.dlv.started`, `.scanned`, `.door` and `.completed` are finite native physical input roles. Their ordered case lists and system-only commands are typed and editable through the same shared authoring controls as other inputs. The physical controller retains geometry, linear trajectories, scanner timing, the 450 ms minimum signal window and existing callback cancellation through SceneTime. It does not write ordinary state, emit scanner/door story events, grant a goal, write a saved flag, choose captions or invoke END.

At the original door time, the controller samples `downtown.dlv.passage`, a required boolean select query whose authored condition checks the current lock. It captures that collision fact in transient scratch `dlvThrough`; the completion callback publishes its own captured sample before the final input. A second readonly physical observation says whether the trajectory endpoint lies inside the gate plane. `downtown.dlv.destination` maps that fact to the finite physical location domain market/gate. Validators require boolean passage outputs and literal market/gate destination outputs, while the source owns their conditions and choice. Neither observation is saved or aliased as gameplay state.

The final input's source cases recheck the current lock, captured passage and existing global end flag. Successful outward trips can finalize too. Already-ended trips only settle location/scanner state and never add a missing gate goal. The finale command writes the existing end flag and emits the goal/caption event followed by a distinct END presentation event. Likewise door passage emits a native cable event before a separate caption event, preserving the original event-before-caption order regardless of observer registration order. END uses the actual shared Game/SceneHost handoff, not saved-flag polling, so it never reopens just from reloading an ended save.

Proofs now include 115 immutable-original histories with 200 independently sampled trajectory frames each, initial locations, route and busy cases, manual/signal invocation, intact/cut cables, lock changes after the captured door decision, outward completion, already-ended saves, pause/resume and reset/disposal. Only the newly explicit transient collision fact is excluded from the old scratch dictionary comparison. Published ad90b79 rules on the current model also match normalized receipt cause/source/tone/scope ownership; obsolete native persist/granted callbacks are replaced by common command commit/feedback ownership. Shared commits can add coalescible redraw/persist notifications; redraw count is not claimed identical, while scene time, physical positions, caption order and state/goal outcomes are.

`check-downtown-dlv-host.mts` constructs the actual Game and SceneHost for inward/outward fresh/already-end cases, checks valid coordinates at synchronous initial commit, source state/goal/caption/END order and no saved-flag replay. Actual typed controls can turn passage false and the pending real Game then bonks without END. Paired Save validates source query domains, physical input roles and text refs atomically; edited gate caption/inputs/queries reach both pending and fresh shipping SCENES imports. Exact byte Undo remains covered. Latest evidence: `.scene-system/downtown-registry-save-1tboUF`.

Several native readonly display fields still remain outside this slice. No duplicate native Registry grant, billboard timer, DLV ordinary tail or private sign pulse remains as a fallback.
