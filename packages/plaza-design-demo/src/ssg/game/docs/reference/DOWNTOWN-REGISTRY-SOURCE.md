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

DLV-9 is no longer native trajectory code: it is a Circuit mover (`dlv9.chassis`: stops `home`, `gate`, `door`, `market`, the `inward` and `outward` paths, its speed, the time it waits at the door for the lock to hear) with a scan-area zone on the gate (`gate.beam`), all in devices.json. The code left is the two physical direction endpoints, which only send the van along a path, and the picture's read of where it is. Ordered route/access/busy refusals use ordinary device Case lists. The B slice also removes native scan/door/completion/finale writes and policy: finite physical milestone inputs dispatch authored shared commands.

VERIFY sign test now uses a shared command: emit its cosmetic pulse, grant the existing vrify keyring fragment, then deliver the authored static response. Composition consumes `pulse.sign` on the existing scene clock. The old sign.test effect and private signTest timestamp are removed. Fresh/known fragment behavior and pulse-before-caption order stay unchanged.

## DLV physical milestones and finale

`downtown.dlv.scanned`, `.door`, `.through` and `.back` are finite native physical input roles; the parts of the Circuit raise them (a `milestone` of the zone `gate.beam` and of the mover `dlv9.chassis`). Their ordered case lists and system-only commands are typed and editable through the same shared authoring controls as other inputs. Nothing in code writes ordinary state, emits scanner/door story events, grants a goal, writes a saved flag, chooses captions or invokes END. The mover writes `dlvAt` (`home`, `gate`, `market`, or `driving` on the way), so no command does and no second copy of the van's place exists.

The van's scan area (`gate.beam`) notices it entering, reaching far enough from the door that the lock hears the scanner's word (`dlvSignalMs` at `dlvSpeed`); the mover then waits at the door for `dlvSignalMs`. When the `door` leg ends the path looks at the lock (`lock=open`), in the same tick the `door` input's cases do (passed, or bonked): open, it runs on through (`through`), shut, it backs off to where it came from (`back`). Neither fact is saved or aliased as gameplay state: the lock is the state.

The `through` input's source cases recheck the current lock and the existing global end flag (`back` only settles). Successful outward trips can finalize too. Already-ended trips only settle location/scanner state and never add a missing gate goal. The finale command writes the existing end flag and emits the goal/caption event followed by a distinct END presentation event. Likewise door passage emits a native cable event before a separate caption event, preserving the original event-before-caption order regardless of observer registration order. END uses the actual shared Game/SceneHost handoff, not saved-flag polling, so it never reopens just from reloading an ended save.

Several native readonly display fields still remain outside this slice. No duplicate native Registry grant, billboard timer, DLV ordinary tail or private sign pulse remains as a fallback.
