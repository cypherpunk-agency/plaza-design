# Runtime lifetime and clock ownership

| Owner | Lifetime and clock | Release / suspension |
| --- | --- | --- |
| Homepage Game (`game/index.ts`) | One cached instance per initialized homepage; `game ??= new Game` on entry | Quit calls `stop`, not destruction. Reentry reuses hosts and their source sessions. Realm destruction releases the page. |
| Game input / drawing | Three window input/resize handlers and one RAF loop while running | Stop removes handlers/cancels RAF, closes UI and pauses cached host clocks. |
| SceneHost (`engine/host.ts`) | Cached once per visited scene. One250ms host interval and one pagehide persistence callback per cached host | These belong to the cached Game/page, not each visit. Hide switches live scene behavior; stop pauses all models. They do not multiply on reentry. |
| SceneTime (`engine/time.ts`) | Scene-relative performance clock and owned delayed callbacks | Pause removes native timeout handles while retaining remaining durations. Reset/restore clears pending callbacks. Wall-clock lockouts remain separate. |
| Native model tick (`engine/model.ts`) | Active scene runs native rules/workflows; hosted inactive scenes retain trace/watchdog/CLOCK policy | Preserve existing behavior; do not stop off-screen engines merely to reduce resource counts. |
| GameplaySession / native bindings | Paired with cached scene model; shared state remains the normal save-owned block | Stop retains the pair and pauses scene time. Actual session disposal removes observers/native hooks and cancels owned deadlines/handoffs. |
| Opening session | Separate story workflow owner | Stop/new opening disposes its current story session and cancels transient story presentation. |
| Communication / guidance | Readability clock while active and uncovered; independent of reduced motion/simulation time | Scene change/stop clears scoped feedback/help and acknowledgments; completed guidance cancels its target. |
| Private Play workbench | One opaque-origin iframe per run | Stop removes frame; switching/disposal clears startup timeout, load handlers and pending messages. Disposing workbench removes parent message listener. |
| Private Play runtime | Game, host intervals, DOM handlers and250ms inspection sender belong to iframe realm | Removing iframe destroys the owning realm. Stale messages are rejected by source-frame and generation checks. |

## Verified correction

Game.stop previously retained hosts but disposed all their gameplay sessions. On reopening, cached
models had lost native gameplay hooks; source handoff/deadline work was canceled rather than paused.
Stop now retains paired scene sessions and uses the existing pause owner. No scene-rebuild adapter
or second state copy is introduced.

`check-game-reopen-lifecycle.mts` failed on the old implementation, then passed20 actual Game
stop/start cycles using real SceneModel/GameplaySession/native binding/SceneTime/handoff owners.
It checks remaining600ms delivery after9000ms stopped time, no stopped mutations, exactly three
registered input handlers/one RAF on each resume, and actual session-disposal cancellation. An
empty scene introduction is also verified to create no invalid speech bubble.

`check-gameplay-handoffs.mts` covers1499/1500ms boundaries,100 clock-clear cycles,100 actual model
reset/restore cycles, failed commits, repeat guards and disposal. Communication callsite checks
cover22 actual Game loop/HUD/guidance cases including hidden/covered/reduced-motion conditions.

## Additional scoped owners

All seven schematic gesture paths now use one per-layer temporary listener owner. Close, reset,
restore, mode changes, replacement and pointercancel cancel work without invoking its tap/drop.
Only the initiating pointer can move/finish it. Existing partial placement updates remain intact;
cancellation removes transient cable/chip painting. The cached drawer listener/ResizeObserver belong
to the cached schematic/page, not individual gestures.

`check-schematic-gesture-lifecycle.mts` passes567 actual gesture cases across seven paths and eight
interruptions, including stale callback rejection, foreign pointers, normal completion and replacement.
The packaged browser verifies real core/noun taps, native wave and layer close with no errors.
Panels now own explicit cleanup callbacks and a generation for their RAF/say/close adapters. Toy
keys, solved-card timer, Morse pause and shared pointer drags release on close/replacement; detached
controls cannot act. Menu fade/load timers and Schematic focus timers cancel on owner changes.
Popup removes its capture listener on close; transport/touch handlers belong to cached DOM and
handle pointercancel. Boot owns its initial-page element, cancels line timers/removes global keys
on finish, and its final380ms callback removes that captured element only. Diagnostics removes its
visibility listener on stop. Pure sampled presentation controllers own no asynchronous resources.

The combined acceptance now includes38 real native Play/Stop cycles, repeated actual scene visits,
current private/native storage checks and the full source ownership inventory. G5 is accepted;
full entity/controller/network/save/preservation requirements remain in their own open gates.
