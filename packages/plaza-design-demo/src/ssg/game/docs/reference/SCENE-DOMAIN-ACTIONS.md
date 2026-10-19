# Shared wire and trace command actions

The command interpreter can mutate the existing device engine's wire and trace domains atomically with common state/resources. These remain `SceneModel` domains and keep their existing `SceneSave` serialization. There is no wire/trace block in `Save.gameplay`, state alias, save codec, alternate evaluator or postcommit native gameplay effect.

## Source and authoring

The finite action shapes are:

- `{wire:{op:'connect',from:'port.scanner:warm',to:'port.alarm',verb:'sound'}}`
- `{wire:{op:'cut',from:'port.scanner:warm',to:'port.alarm'}}`
- `{trace:{device:'port',add:{query:'stacks.tamperTrace'}}}` (a finite literal delta is also allowed).

Existing source permissions still govern their commands. Prospective validation checks actual scene event/noun/verb/device references. The action editor offers finite endpoint/device selectors and the existing literal/state/query numeric control. Invalid references reject before Save. The actions work in ordinary catalogue scenes without inventing a `native` binding flag. They do not discover or instantiate missing network nodes.

## One canonical owner and one transaction

`scene-domains.ts` contains pure connection/cut/trace/kick reducers. Native `connect`, `cut`, `addTrace`, `kick` and wire eligibility reuse them. `GameplaySession.domain` is the sole capability slot; the existing unconditional Host attachment installs it once the actual local model exists, and disposal identity-clears it. A generic session without that capability refuses these actions with resources. Sessions created before an ordinary host remain the same session when the host later attaches; constructor state initialization is not repeated.

A dispatch creates one temporary domain draft lazily at its first domain action. Existing link objects retain their identities inside that draft. Common actions and reactions continue through the existing interpreter and condition matcher. `wirePresent` reads staged cables after each action. Later bound native commands use staged device lockout eligibility, so a trace kick followed by a native-route reaction cannot consult an obsolete canonical lock.

Every action/reaction and final common value check must succeed first. The existing atomic common `StatePort.write` runs, then the prepared model patch performs assignments only. No callbacks, scheduling, formatting or further validation occur in that patch. Domain notices, persistence/redraw, captions and hooks run only after both owners have committed. A base-write failure or an invalid later action leaves canonical domains, link references, clocks, history and common state untouched. The base port retains its existing atomic-write contract; there is no compensating write around arbitrary external side effects.

Committed notification failures are isolated presentation/mechanical failures, not reasons to pretend that an already completed transaction rolled back. Source domain commits request a model refresh even when the scene has no native bindings. Additional redraw/persist marks may coalesce; notification count identity is not claimed.

## Preserved engine semantics

A fixed wire refuses replacement/cutting. Connecting replaces its endpoint pair with a new non-wired Link and leaves the cut-ID set intact. It also preserves the original engine's replaced live-Link references. Cutting a prewired Link records its wired ID, removes that exact live reference, and never cancels an already queued 150 ms signal delivery. Source cut resolves the currently existing endpoint pair; an absent pair refuses atomically.

Trace clamps to 0–100. Crossing 100 installs the existing wall-clock lock deadline/span, resets trace, and clears viewing/touched state. The existing scene clock owns the lock's `span+50` repaint timer. Wall time can expire the lock while scene time is paused; restore retains the existing remaining-span behavior. The generic trace kick caption precedes its kick hook, which precedes subsequent authored notices. Shared mechanical kick delivery has its own fresh cue; native immediate calls retain their existing causal context. This preserves the old watchdog threshold's two independent error causes (kick, then restore).

No automatic connect/cut caption is emitted by a command action. Native UI methods keep returning their existing captions; authored commands emit the replies they need.

## Stacks cutover

The Stacks repair is a beforeNative source trigger. It uses the registered physical port-frozen observation plus `wirePresent == false` and dispatches a system-only command: connect the alarm cable, add trace through the existing tuning query, then emit the authored restore reply. This preserves the old order before native cold expiry, ordinary log trace processing and watchdog motion. Its native cable constant/check/reconnect/trace/reply branch was deleted.

Lift-start, thermal scan visibility/presentation expiry and reefer world presence remain separate known native work. This slice does not claim the entire Stacks controller is authored.

## Evidence

- `check-scene-domains.mts`: eligibility purity; staged query reads and route lock authorization; late/base-commit failure rollback; fixed/cuts/live identities; queued signals; lock deadlines/spans/refresh, pause and restore; delivery order and disposal.
- `check-stacks-watchdog-source.mts`: 480 immutable histories over live/offscreen/frozen/wires/repeated repairs/trace/locks/tuning. Canonical links/cuts/trace, wall locks, SceneTime pending work, caption/kick order and published receipt causes match.
- `check-scene-domains-forms.mts`: actual typed action kinds, finite endpoint/verb/device controls, decimal read editing, invalid reference atomicity and Undo/Redo.
- `check-scene-domains-save.mts`: new ordinary catalogue/city source, actual lazy Game/SceneHost session reuse and refresh, rollback, canonical current Save/reload without a shadow store, fresh saved shipping JSON import and byte Undo. Evidence `.scene-system/scene-domains-save-bD4ELU`.
- Extended Stacks typed and paired Save proof consumes edited wire/trace command controls and restore caption in pending and fresh shipping models. Evidence `.scene-system/stacks-permission-save-9e3YN1`.
- `check-session-startup.mts`, `check-common-state-context.mts`, `check-common-game-state.mts`, `check-causal-feedback.mts` and the existing 288 Stacks permission histories pass. The stale common-state fixture now supplies a real model instead of requesting a native host from an incomplete fake Game.
