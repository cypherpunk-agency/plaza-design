# Unified game: review guide

2026-10-20. Review readability, appeal and editing workflow. Mechanical correctness, isolation,
Save/Undo and original parity are agent-owned checks in ENGINE-CONSOLIDATION-STATUS.md.

Use the production build at `http://127.0.0.1:4211/?demo` and
`http://127.0.0.1:4211/editor/`. Public routes after publication are
`https://cypherpunk.agency/?demo` and `https://cypherpunk.agency/editor/`.
A local verification does not imply that a newer commit has deployed publicly.

## Compact Test District

**Review shortcuts** is at the top right. Every bookmark moves directly to its test; the case
buttons collapse the panel so it cannot hide the result. No walking between desks or rooms is
needed. Communication examples are in a collapsed subsection. Message examples preview the real
presenters; they do not grant tokens. The purchase and guidance controls execute real shared rules.

| Review | Steps | Useful feedback |
| --- | --- | --- |
| Status messages | Communication examples → Reward message, then Refusal message | Are success and refusal readable, distinct and appropriately restrained? |
| Device response | Remote device reply | Does the caption and ping make the responding device clear? No travel is required. |
| Dialogue and help | Dialogue with waiting hint; read the bubble and press E once when finished | Does help wait appropriately, then remain readable? Does speech feel too slow or intrusive? |
| Repeat feedback | Repeated signal | One causal signal is delivered four times to the real lane. Is the resulting single message clear? |
| Motion and expiry | Toggle reduced motion & expiry; watch the message finish. Click again to return to normal motion | Is the result readable while the artwork holds still? This review-only toggle is not saved to campaign settings. |
| Goal introduction and completion | Purchases → Guidance example → Start. Return without permission and Buy. Reopen Guidance example → Authorize current task, then Buy | Is permission refusal understandable? Does the brief centered goal introduction settle quietly into the HUD, and is completion noticeable? |
| Goal cancellation | Guidance example → Leave guidance example | Does obsolete guidance disappear without distracting you? |
| Pricing and stock | Purchases → Pricing & stock, change the optional discount/fee/stock; Buy at counter remains here | Are the quote, consequences and dialogue clear? No need to re-prove arithmetic. |
| Conversations | Conversations → Talk: Librarian / Talk: SHELF-E | Who is speaking, how to continue, and whether the wording feels right. |
| Devices and wiring | Devices or Wiring & chains bookmarks; use the nearby parts, H for hack view and L for logic | Can you tell what changed and why? Note confusing wiring details for later design work. |

## Scene-centered editor

Choose any of the19 scenes. In Scene, select artwork and use its Behaviour, Device or Wiring
inspector. Logic keeps the complete scene lists. Existing specialized mechanics have typed inputs;
new drawing implementations and new physical mechanics still require code.

A short useful review is: move an item, change an interaction or dialogue, Play scene, Stop,
Undo, Play again. Comment on discoverability, labels, selection, clutter and whether the change
felt direct. A running Play is an isolated snapshot; source Undo affects the next Play or Reset.
Use World for places, exits and transport/story connections, Library for assets and viewers.
Create a new ordinary scene and connect an exit if you want to judge that authoring experience.

Public **Download edits** and **Import edits** are portable. They do not publish or write server
files. Local **Save to source** uses the protected service started by
`pnpm --filter plaza-design-demo compose-scenes`; publishing remains a separate action.

## What changed and limits

Character bubbles and choice panels remain. Device captions/pings remain. The three competing
flash overlays now share one status lane; goal guidance keeps the quiet goal line. Speaker
identity, readable timing, cancellation and terminal history have shared ownership. Conversation
progress is intentionally saved. Shops, objectives, access, scenes, devices, world links and
existing controller settings now use shared source and typed authoring.

The user approved the newer upstream walk-turn pose. The raw Mall raster difference remains
recorded; other measured fixtures remain exact. The visual guarantee is the finite recorded
corpus, not every possible campaign state. Historic saves are outside scope. No campaign
playthrough, new story act or new remote hacking ability is claimed. Six performance baselines
are complete; no safe measured optimization was retained. Existing large-bundle advisories remain.

## Source and fixture locations

Status, remote, deferred, repeat and motion cases: demo/communication-review.ts and the
Game.reviewCommunication port; check-communication-review.mts verifies their mechanical paths.
Objectives/completion/cancel and purchases: scenes/demo-counter/scene.json and gameplay.json;
check-demo-district.mts verifies shared commands and isolation. Conversations: scenes/demo-desk/scene.json.
Devices/chains: demo/workshop.json and workshop.ts. All use the shipping presenters/engines.
The collapsed shortcuts are demo/review-navigator.ts. Campaign tutorial reminders are suppressed
only in the Test District so they cannot obscure the particular feedback example.
