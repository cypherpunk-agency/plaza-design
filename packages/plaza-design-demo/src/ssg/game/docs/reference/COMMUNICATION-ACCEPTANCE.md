# Communication and conversation acceptance

2026-10-19. Technical gates G1, G2 and G3 PASS at source
`sha256:377ff1fccc6c5374f2826002acd7e2b239e6af02af0a04f717f16a91168606f9`.
This does not sign full editor, all-scene lifecycle, performance, pixels or user appeal.
The exact frozen source remains `.scene-system/all-game-baseline-2026-10-18/source`.

## G1: routing and retired producers

The following inventory was reconstructed by comparing that untouched baseline with current source.
It is an acceptance audit, not a claim that a producer ledger was written before implementation.
Baseline and current game paths are `runtime/game.ts`.

| Original producer | Current destination |
| --- | --- |
| Player-head toast state/helper/drawing | State and drawing removed; `flash` delegates to the shared status/history path |
| Jump, district reveal, use payment, item grant and shared token delta | Same status/help presenter and terminal history, without a second overlay |
| Taxi already-here/fare, hacking locked/unavailable, network out-of-reach/answers | Same immediate status/refusal path |
| Scan acquisition | One status announcement/history entry; competing NET pulse disabled |
| Train depart, arrive and pass announcements | Native train sign; no duplicate flash; transition sound remains |
| Independent gain state/observer/drawing | Drawing/state removed; `checkGain` uses the shared status/history path |
| Touch terminal-mirror state/constructor forwarding/drawing | Removed; closed-terminal errors alone enter visible status; source-tagged history does not notify again |
| Scene-use and exit refusal through player speech | `SceneHost.react` identifies the reacting thing |
| DRIVER and CONCIERGE | Device reply/acknowledgment adapters, retaining their existing art and interaction |
| SOAP/STS scene responses | Shared source speaker routing |
| Noun/wiring teaching | Persisted contextual lessons; separate vision pan/zoom topic and CONTROLS reference retained |

The original 15 flash callsites consist of 12 retained helper calls routed through the single status
owner and three retired train flashes. Character speech remains character-owned; captions are not
mirrored on touch. Terminal history alone never requests another notification.

Checks PASS: `check-communication-history.mts`, `check-communication-ownership.mts`,
`check-causal-feedback.mts`, `check-communication-callsite-clocks.mts` and direct source inspection.
These exercise actual Game, SceneHost, Panels, Schematic and feedback/audio callsites, including
closed-terminal errors, acquisition deduplication, identical text from distinct actions, receipt
replay, device sources and cancellation of owned sound work.

## G2: readable time and attention

Checks PASS: `check-communication.mts`, `check-device-feedback-timing.mts`,
`check-communication-callsite-clocks.mts` and `check-causal-feedback.mts`.
Controlled cases cover normal/reduced motion; pause, hidden and covered-screen suspension;
resumed expiry; dialogue deferral; queue/caption/ping bounds; alert priority; duplicate collapse;
scene clearing; objective guidance ownership; missing/on-screen/off-screen targets; completed or
cancelled guidance; and immediate refusals without waiting behind optional help. The 22 actual
Game/ShiftGuidance clock cases preserve unread time across every existing takeover category.

## G3: complete frozen conversation corpus

Frozen and current ledgers contain exactly the same 66 IDs, with no additions, removals or duplicates:
58 NPC rows, six device rows and two shared Shift rows. All are migrated. The four stale Market
entries are corrected. `check-migration-progress.mts` verifies 58 actor bindings, 17 procedural bot
bindings and zero remaining legacy rows. There is no competing native/panel progress evaluator.

Checks PASS: `check-unified-conversations.mts`, `check-free-conversations.mts`,
`check-bot-conversations.mts`, `check-capsule-conversation.mts`,
`check-native-conversation-actions.mts`, `check-stacks-conversation.mts`,
`check-shift-conversation-source.mts` and the corresponding corpus/source Save checks.
They cover original pages/prompts/variants/effects, permissions, saved cursors, deterministic fresh
entry, final-repeat/cycles, free-text misses/retries, cancellation, refusal/rollback and repeated-entry
reward isolation. Bot parity covers 834 original cases; free-text matching covers 61 original cases.
The free-conversation fixture now reads its counter from the common `values.test` owner; no runtime
behavior or expected reward/rollback assertion was changed by that fixture correction.

G0 was separately accepted on2026-10-20 under the user-approved retrospective audit condition;
see BASELINE-RECONCILIATION.md. Other goal gates retain their independent requirements.
