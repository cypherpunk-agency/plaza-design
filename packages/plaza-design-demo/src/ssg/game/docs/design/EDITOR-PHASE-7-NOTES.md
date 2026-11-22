# Editor redesign phase 7: notes

Authorized by the user on 2026-11-21. **7a and 7b built 2026-11-22**, plus the 7d live
state panel (see "Built" under each); 7c and the rest of 7d follow. Written 2026-10-28 so the work can resume without repeating the design
discussion. Phase 7 fills four workspaces with new content; the
shell from phases 1–6 shipped on 2026-10-28. Each part should become its own goal, chosen by
the user. Rules: [Editor UI](../reference/EDITOR-UI.md). Mockups: the
[layout canvas](https://claude.ai/artifact/2rJZRN6SeUisTKoTatZ9ZD), page "Chosen · A in neutral
grey" (Logic, Conversation, World and Review boards).

Mockup copy (fixer lines, district names, state values) is placeholder, not game data.

## 7a · Logic: rule view

**Mockup intent**
- Left dock: the chunk's logic grouped as Interactions, Triggers, Objectives, Story phases, with
  counts. Broken items show inline in `--error` ("metro arrival · ! missing command").
- Centre: a dimmed scene strip (about 210 px, collapsible) that highlights the rule's subjects,
  with **Test this rule**. Below it the selected rule as clauses:
  **WHEN** (input/event and subject) · **IF** (conditions, "always" by default) · **DO**
  (ordered actions) · **ORDER** (target order, rotation). One plain-language line above:
  "Reads as: when the player talks to the fixer, open the hint conversation and charge for it."
- Each clause item is a token; selecting a token opens it in the inspector. `＋ condition` and
  `＋ action` add in place.
- An objective chain card shows the chunk's objectives in order with the current one marked.

**Existing sources to build on**
- Workbenches: `scene-logic` (Interactions & story), `gameplay` (Commands & dialogue),
  `device-config` (Devices), `events` (read-only event graph), `scene-connections` (Starting
  cables), `story-logic` (global), and Story phases on the chunk.
- `authoring/event-inspector.ts`, `event-inspector-model.ts`, `story-logic-authoring.ts`,
  `scene-phases-authoring.ts`, `gameplay-authoring.ts`, typed conditions/actions already shared
  with the game.

**Open questions**
- Is the sentence view an alternative layout of the same typed forms, or a replacement?
- Where do device verbs/nouns and wiring live: inside Logic, or as their own Circuit view
  (see the Circuit direction in memory/design docs)?
- Should "Test this rule" run a private Play from a checkpoint, or simulate the rule in place?

**Built 2026-11-22** (`authoring/rule-view.ts`, pure projection in `authoring/rule-model.ts`,
check `rule-view-model`). Logic → **Rules** is the first Logic panel. Left: Interactions
(carried-item variants as their own rows), Triggers, Objectives, Story phases with counts and
inline `! missing …` lines. Centre: a scene strip (the stage's last picture, cropped to the
chunk and dimmed, subjects outlined; **Show in Layout** selects the subject), **▶ Test this
rule**, title, the "Reads as" line and WHEN / IF / DO / ORDER token rows with `＋ condition`
and `＋ action`, plus the objective chain. Right: the selected token's own fields; **All
interaction settings** / **All chunk triggers** fold out the complete existing form.
Decisions on the open questions:
- The rule view is another layout over the same sources, not a replacement: Interactions &
  story keeps the complete form, and both write through one shared `scene-logic-source.ts`.
- Device verbs, nouns and wiring stay in Devices / Starting cables for now.
- Test this rule starts private Play in the open chunk from the chosen checkpoint (the scene
  toolbar's Play); it does not simulate the rule in place.
- Story phases show a read-only summary with the existing phase form in the inspector.

## 7b · Logic: conversation graph

**Mockup intent**
- Left dock tab **Conversations**: graphs used in this chunk (with owner) and shared ones
  (animals, robots, companion), filter, `＋ New conversation`.
- Centre: cards on a dotted canvas joined by curves. Card kinds: page, choice, text input,
  exit, fallback. Cards show the line, conditions as `--changed`-coloured chips (`if credits ≥ 20`)
  and commands as neutral chips (`set player.name`, `charge downtown.fixer.hint`).
- Toolbar: breadcrumb (interaction › graph id, usage count), `＋ Page`, `＋ Choice`,
  `＋ Condition`, **Try conversation**; overlay zoom, Frame all, Tidy.
- Inspector for a choice: Label, Leads to, Otherwise, Shown when (condition chips), On choose,
  Saved progress (state prefix); footer with speaker and "Select actor in scene".

**Existing sources**
- `conversations` library workbench, `conversation-library.ts`,
  `conversation-structure-authoring.ts`, `character-conversation-controls.ts`,
  `response-conversations-authoring.ts`. Named graphs are the only persisted dialogue format;
  robot/animal namespacing and session-lifetime state are described in `authoring/README.md`.

**Open questions**
- Is graph layout saved source (positions) or computed each time (Tidy only)? Saved positions
  add data to the graph documents.
- Edit text on the card directly, or only in the inspector?

**Built 2026-11-22** (`authoring/conversation-graph.ts`, pure projection in
`authoring/conversation-graph-model.ts`, check `conversation-graph-model`). Logic →
**Conversation graph**; "Edit conversation definition" links elsewhere now open it (the
Conversations form stays as the complete library form). Left: this chunk's graphs, shared ones
(companion, robots, animals) with use counts, a filter that also searches other chunks, and
`＋ New conversation`. Centre: start card, page / choice / text input / exit / fallback cards on
a dotted canvas, curves for routes, choices, jumps (dashed) and fallbacks; conditions as
`--changed` chips, commands as neutral chips; unreachable pages are dashed and listed.
Toolbar: breadcrumb with use count, `＋ Page` (from a selected choice it becomes that choice's
destination), `＋ Choice`, `＋ Condition`, zoom, Frame all, Tidy, **▶ Try conversation**. The
inspector edits a page (speaker, pages, on-arrival command and failure page, templates, typed
input, plus the existing Graph structure controls), a choice (label, leads to, shown when, on
choose, order), a jump, a start route or typed input.
Decisions on the open questions:
- Layout is computed (columns by distance from the start, tall columns wrap). Dragged
  positions are a per-browser view preference in local storage; Tidy forgets them. Nothing is
  added to the graph source.
- Text is edited in the inspector only; cards show it read-only.
- Try conversation runs the shared `ConversationSession` on a private default state in the
  panel (green frame, "nothing is saved"); private Play remains the full test.

## 7c · World workspace

**Mockup intent**
- Left dock tabs: **City** (Places with district colour swatch, Districts with climate, Travel:
  metro lines, taxi routes, fares), **Variables**, **Settings**, plus Networks.
- Centre: the game's city map renderer with layer toggles (Street, Metro, Above, Below) top-left;
  a dashed **Preview only** bar top-right (Discovery: all, Keys held) that never changes saves;
  `＋ Place`, `＋ Route` bottom-left; **Open <place> in Layout →** bottom-right.
- Inspector for a place: Name, Arrive at, District; Climate & look shown as inherited from the
  district with one Override link; Travel, Discovery, Access collapsed with summaries.

**Existing sources**
- `world-map` panel (City map with Place, Districts, Travel, Map layout & discovery, Preview
  conditions), `world-variables`, `network`, `game-settings`, `climate-authoring.ts`,
  `district-authoring.ts`, `city-authoring.ts`.

**Open questions**
- Does Game settings (launch, player, guidance, contacts, ending) belong in World or in Review?
- Should network editing get its own map-like view?

## 7d · Review workspace

**Mockup intent**
- A green **PLAYING · private run** banner and frame with pause, step and speed; status chip
  "PLAYING". Text: "Edits made now are not part of this run".
- Left dock **Run**: Configuration (e.g. Full game), Start at (checkpoint), Sources (pending
  edits), Abilities chips, Restart, Stop; footer "Private run · its saves are thrown away".
  Second tab: Shortcuts (review stations).
- Right dock **Live state**: Story (phase, objective, clock), **Changed this run** (highlighted in
  `--play`), Inventory; button **Save this moment as a checkpoint**. Second tab: Watch.
- Bottom dock **Events**: time, type (input, interaction, state, objective, guidance) and message;
  Console and Issues tabs. Overlay buttons: Show triggers, Pick object → edit.

**Existing sources**
- `play`, `play-profiles` (Test configurations), `review-stations`, `demo-world`,
  `manifest-pilot` workbenches; `play-workbench.ts`, `play-frame.ts`, `play-startup.ts`,
  `play-profile-authoring.ts`; `?probe` read-only game handle (`window.__game.probe()`) shows
  what live state can already be read. Private Play keeps opaque-origin isolation.

**Open questions**
- Which live values can be read across the isolated realm without breaking isolation?
- "Save this moment as a checkpoint": which state is captured (flags, inventory, scalars,
  position, time) and how does it map onto the Starting state form?
- Does "Pick object → edit" stop the run, or switch workspace while the run pauses?

**Built 2026-11-22 (live state only)** in the Play workbench (`authoring/play-workbench.ts`,
pure comparisons in `authoring/play-live-state.ts`, check `check-play-live-state`):
- Answers to the open questions: live values come only from the detached `game.inspect()`
  snapshots private Play already posts every 250 ms, so isolation is unchanged.
- **Live state** shows Story (scene, goal, clock), **Changed this run** against the run's first
  snapshot (an absent flag equals false, an absent item equals 0), Inventory, and the last 14
  **Events** (scene, goal, speaker, state changes).
- **Save this moment as a checkpoint** adds a `moment-N` starting state to Test checkpoints:
  declared flags, keys and programs (undeclared ones are listed as dropped), items, tokens,
  modules, player name, scalar state that differs from its default, day, minute and spawn x.
  Entrance and sequence are cleared so the run resumes where the player stood.
- Not built yet: the separate Review workspace arrangement (Run dock, Watch tab, Console and
  Issues tabs, Show triggers, Pick object → edit).

## Order to propose

Originally suggested: 7d Review first (it shortens every test loop), then 7a Logic,
7b Conversations, 7c World. As of 2026-11-21, 7a Logic and 7b Conversations matter most because
building Act I is mostly rules and dialogue. The user decides the final order.
