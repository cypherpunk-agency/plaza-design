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

## Remaining native logic

DLV-9 trajectory geometry and scan timing remain native. Ordered route/access/busy refusals use ordinary device Case lists; only two physical direction endpoints invoke the trajectory. No duplicate native refusal branch remains. The B slice also removes native scan/door/completion/finale writes and policy: finite physical milestone inputs dispatch authored shared commands. The initial trajectory is initialized before the started command commits, so synchronous redraw sees valid driving coordinates.

VERIFY sign test now uses a shared command: emit its cosmetic pulse, grant the existing vrify keyring fragment, then deliver the authored static response. Composition consumes `pulse.sign` on the existing scene clock. The old sign.test effect and private signTest timestamp are removed. Fresh/known fragment behavior and pulse-before-caption order stay unchanged.

## DLV physical milestones and finale

`downtown.dlv.started`, `.scanned`, `.door` and `.completed` are finite native physical input roles. Their ordered case lists and system-only commands are typed and editable through the same shared authoring controls as other inputs. The physical controller retains geometry, linear trajectories, scanner timing, the 450 ms minimum signal window and existing callback cancellation through SceneTime. It does not write ordinary state, emit scanner/door story events, grant a goal, write a saved flag, choose captions or invoke END.

At the original door time, the controller samples `downtown.dlv.passage`, a required boolean select query whose authored condition checks the current lock. It captures that collision fact in transient scratch `dlvThrough`; the completion callback publishes its own captured sample before the final input. A second readonly physical observation says whether the trajectory endpoint lies inside the gate plane. `downtown.dlv.destination` maps that fact to the finite physical location domain market/gate. Validators require boolean passage outputs and literal market/gate destination outputs, while the source owns their conditions and choice. Neither observation is saved or aliased as gameplay state.

The final input's source cases recheck the current lock, captured passage and existing global end flag. Successful outward trips can finalize too. Already-ended trips only settle location/scanner state and never add a missing gate goal. The finale command writes the existing end flag and emits the goal/caption event followed by a distinct END presentation event. Likewise door passage emits a native cable event before a separate caption event, preserving the original event-before-caption order regardless of observer registration order. END uses the actual shared Game/SceneHost handoff, not saved-flag polling, so it never reopens just from reloading an ended save.

Several native readonly display fields still remain outside this slice. No duplicate native Registry grant, billboard timer, DLV ordinary tail or private sign pulse remains as a fallback.
