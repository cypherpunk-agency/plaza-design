# ACCESS DENIED: the deck screen and hints (proposal)

Status: **step 1 built** (the Esc deck with SYSTEM; 2026-10-18); steps 2–6 proposed. Mockup: [deck-mockup.html](./deck-mockup.html)
(open it in a browser; ← → or 1–4 switch tabs).

The game is growing RPG parts: things you carry, money, goals that pile up, more keys. Today none
of that has a home. The token balance shows only in a price tag at a counter; the key bar along the
top spells out walk / run / use and carries MAP, TERMINAL, SOUND and MENU buttons, two of which
duplicate the pause menu. This plan gives all of it one place, the **deck**, and gives hints one
system, so the screen over the street can stay empty.

## What it changes

This revises two recorded decisions:

| Decision | Where | Becomes |
|---|---|---|
| No inventory screen; what you carry shows only where it is used (2026-10-15) | GAME-DATA.md, "What you carry shows where it is used" and "Using what you carry" | Items **still** show at their point of use (popup chips, prices). The deck's CARRY tab adds a place to *check* what you have; it never becomes the place you *use* things. |
| Objectives carry no hints ("No hints for now") | GAME-DATA.md "Decided"; `GoalData` in data/types.ts | The game gets a channel for showing hints (see **Hints**); which goals or places use it is decided later. The fixer's paid hints (`save.hints`, level.ts `HINTS`) stay what they are: a purchase, not a free hint. |

When this is built, the GAME-DATA.md passages (and, once goals use hints, the `GoalData` comment) are rewritten to match.

## The deck

The handheld deck already exists in the fiction: Enter opens "the deck" (the terminal,
`openDeck`, game.ts), and Tab opens "the deck's map app" (game.ts key handling). The deck screen
makes that literal: the deck has a home screen with tabs, and the terminal and the map are apps on it.

### Esc opens it; no new key

The deck **replaces the in-game pause menu** (ui/menu.ts). Esc keeps the layering it has today
(game.ts `onKey`): it first closes whatever is on top, and opens the deck only when nothing is left.

1. A cutscene or the opening: Esc skips, as now.
2. The terminal has focus: Esc leaves it (terminal.ts), as now.
3. City map / net map / a schematic overlay / a thing's popup: Esc closes it, as now.
4. A speech bubble or hack vision: Esc closes it, as now.
5. Nothing open: Esc opens the deck **on the tab you last had open** (kept in the save as
   `deckTab`, default JOBS).
6. In the deck, Esc closes it and the game resumes. Inside a sub-screen (SYSTEM's save slots, a
   confirm), Esc goes back one screen first, as the pause menu does now.

The world holds still while the deck is open, exactly as under the pause menu
(`if (this.menu.open)` in `loop`).

**Moving around:** ← → switch tabs, 1–4 jump to one, ↑ ↓ move in a list, Enter / E / Space
select (as in the pause menu now; so E cannot also switch tabs).
Mouse and touch tap tabs and rows.

**Stays separate:**

- **The title screen's menu** (NEW GAME, CONTINUE, LOAD GAME over the sunrise). Before a run exists
  there is nothing to show in JOBS or CARRY. `Menu.showTitle` keeps its own panel.
- **The city map** stays on Tab / M. It is a picture you pan, not a list; a row in SYSTEM (or the
  CONTROLS tab) points to it.
- **The terminal** stays on Enter, straight in. See **Touch** for whether it also becomes a tab.

### Tabs

| # | Tab | Shows | Built from |
|---|---|---|---|
| 1 | **JOBS** | The current goal; the latest hint shown; goals done in this place; earlier places, folded. | Today's GOAL line source (`def.objective`, the opening's goals, `zh.objective()`, `libraryGoal`), plus the goal list in each scene's data. |
| 2 | **CARRY** | Tokens first; then items with counts; key chips; modules and programs. Each row says in one line where it is used, once you know. | `save.tokens`, `save.items` (names: `ITEMS`, scenes/kit.ts), `save.keyring`, `save.modules`, `save.programs`. Modules and programs keep their full view in hack vision's LOGIC drawer; CARRY only lists them. |
| 3 | **CONTROLS** | Every key and what it does, grouped: walking, talking, hacking, the deck. Keys you have not unlocked yet (SPACE jump before legs.so; N before scan.so) are not listed. | The labels in ui/keybar.ts, moved here. |
| 4 | **SYSTEM** | RESUME, MAP, SAVE GAME, LOAD GAME, NEW GAME, SOUND, QUIT TO HOMEPAGE; LEVELS in sudo. | ui/menu.ts `mainItems`, unchanged in content. |

The deck header keeps today's pause-menu line (`<scene> · PAUSED`), plus the day and the clock.

### The key bar goes

With CONTROLS in the deck, the key bar (ui/keybar.ts, `#key-bar`) loses everything except the
scene's own buttons:

- **walk / run / jump / use labels:** gone; the control hints (below) teach them once.
- **MAP, TERMINAL, MENU buttons:** gone on desktop; Tab, Enter and Esc do it, and CONTROLS says so.
- **SOUND:** gone; it is in SYSTEM (it already is in the pause menu).
- **HACK / BOARD and hack vision's EXIT / BOARD / LOGIC / UNFOLD** (`KeyBar.adopt`): stay for now.
  They are the clickable way into the hacking layer; moving them is a separate question.
- **Hack vision's pan / zoom / reset / leave labels:** become a control hint the first time you
  open hack vision.

The empty strip at the top becomes the **hint lane**.

### Touch

The touch bar's MENU button (ui/touch-controls.ts, `data-key="Escape"`) becomes the deck button.
On touch the terminal already covers the whole game area (`#term.deck`, render.tsx), so the two
merge (decided 2026-10-18): on touch the deck gets a fifth tab, **TERM**, and the `>_` button opens
the deck on it. Desktop keeps Enter for the inline terminal and four tabs.

Phones have no visible status line, so the token balance lives in CARRY and in point-of-sale
prices, nowhere else.

## Hints

The hint system is a **mechanic for showing hints**: a channel any part of the game can send a line
to. It does not decide *when* players get help; that is authored where a hint is used (a scene's
code or data, a goal, a control), and is a separate design question.

A hint is `{ id, text }`, sent with `hint(id, text)` from game code (and later from data steps).

**Where:** the hint lane, the top band where the key bar is now; one line, left-aligned under the
scene title, above the caption lane (ART-GUIDE §11).

**One at a time:** hints queue; each stays a few seconds (longer for longer text) and fades; the
next follows. A cutscene, the deck or the map holds the queue until play resumes.

**Once:** shown ids are kept in the save (`seenHints: string[]`; not `save.hints`, which counts the
fixer's paid hints). Sending an id already seen does nothing, unless the sender asks to repeat.
A sender can also withdraw a queued or showing hint (`hint.clear(id)`), so a control hint
("← → WALK") disappears the moment you walk.

**Kept:** the latest hint stays readable in JOBS, so a missed one is not lost.

**Tone:** hints are world text, so they are dry and plain: "THE COUNTER SELLS. THE DESK SETS THE
RULES." No jokes; the characters keep those.

**First users** (to prove the mechanic, not a policy): the controls the key bar teaches today
(walk / run, use, hack vision's keys, ESC for the deck). They replace the key bar's labels.

## Build order (when approved)

1. **Built.** The deck panel with SYSTEM only, opened by Esc, replacing the pause menu; `deckTab`
   in the save (ui/menu.ts `DECK_TABS`; the key bar and touch buttons say DECK).
2. CONTROLS; strip the key bar to the scene's buttons.
3. CARRY.
4. JOBS, from the existing goal sources.
5. The hint mechanic, with the control hints as its first users.
6. Rewrite the GAME-DATA.md passages and the keybar/menu file comments.

Each step is a playable state; nothing in a save changes meaning (`deckTab` and `seenHints` are
optional, older saves start with JOBS and no hints seen).

## Decided (2026-10-18, Tommi)

1. **CARRY lists only what you hold.** Used-up items are gone, as in the world.
2. **Touch: the terminal becomes a fifth tab, TERM**, opened directly by `>_`. Desktop keeps Enter.
3. **HACK / BOARD stay in the top strip** for now; they show only where there is something to hack.
4. **Hints are a mechanic first.** When and why a player gets a hint (goals, failures, places) is
   authored per use and designed later; `GoalData.hint` and scene `hints` lists are not part of
   this plan.

## Open questions

None yet.
