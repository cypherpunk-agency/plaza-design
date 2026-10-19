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

DLV-9 trajectory geometry, scan timing, completion state and gate-finale reward decisions remain native. The bounded A slice moves ordered route/access/busy refusals into ordinary device Case lists; only the two physical direction endpoints invoke the trajectory. No duplicate native refusal branch remains.

VERIFY sign test now uses a shared command: emit its cosmetic pulse, grant the existing vrify keyring fragment, then deliver the authored static response. Composition consumes `pulse.sign` on the existing scene clock. The old sign.test effect and private signTest timestamp are removed. Fresh/known fragment behavior and pulse-before-caption order stay unchanged.

`check-downtown-dlv-sign.mts` covers 64 immutable-original DLV location/route/manual/signal/lock/wire histories, exact scalar/scratch/trajectory/caption/event/finale order, and sign fresh/known/repeated grants, pause/resume/reset/disposal and composition state. The Registry typed/Save fixtures also exercise actual Case condition/response controls, pulse target rebinding and sign text changes; malformed source references reject atomically, edited pending and fresh shipping models consume saved fields, and byte Undo restores both documents. Latest evidence: `.scene-system/downtown-registry-save-fgWd4F`.

`check-causal-feedback.mts` now invokes actual current shared sessions and ordinary act/guard entrypoints rather than deleted native effects. Its frozen original also uses the equivalent ordinary act/guard entrypoints. Exact captions, sources, goals, state, scheduled native events and DLV completion/END order compare directly; no caption/event normalization hides differences. Existing independent cue/audio assertions remain active. Commit/redraw/persistence notification counts are intentionally outside that observable comparison; dedicated grant tests cover the new common ownership.

Full DLV completion/finale migration is deferred to the next covered slice. Native geometry and captured passage facts must stay physical, while shared milestone commands can own ordinary writes and the existing global end flag. A committed END handoff must run once after the gate caption, never replay solely because the saved end flag is true. Several native readonly display fields also remain outside this slice. No duplicate native Registry grant or billboard-timer path remains as fallback.
