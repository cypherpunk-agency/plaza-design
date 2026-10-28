# Editor UI: layout, look and controls

Current design rules for the composer (local editor and public editor). Chosen 2026-10-28:
docked panels with task workspaces, in the **neutral grey** look. The
[migration plan](../design/EDITOR-REDESIGN-PLAN.md) says how the existing editor moves there;
[ROADMAP.md](../../ROADMAP.md) owns priority. Mockups of every workspace live in the
[layout mockup canvas](https://claude.ai/artifact/2rJZRN6SeUisTKoTatZ9ZD) (page "Chosen").

These rules govern presentation only. ComposerModel, history, validation, the protected save and
the shared renderer keep their current ownership. Layout, panel sizes and open sections are
per-browser view preferences, never source.

## Goals

1. **The scene comes first.** The preview gets at least 60% of the window in Layout.
2. **Only the relevant thing stands out.** Colour, weight and size mark the selection, the one
   main action, the current mode and problems. Everything else is quiet.
3. **One home per thing.** Each setting is edited in one place; other places link to it.
4. **The mode is never in doubt.** Base editing, sequence editing, drafts and playing look different.

## Window layout

```
┌ header 44 ─ brand · workspace tabs · chunk switcher ＋ · [ Search… Ctrl K ] · ↶ ↷ · save state · Save · More ┐
├ panel strip 36 (workspace panels; context of the open chunk) ───────────────────────────────────────────────┤
├ left dock 256 ┬ scene toolbar 38 ─ Add · Live motion · Snap · checkpoint · ▶ Play ┬ right dock 300 ┤
│ Outline       │ scene preview + overlays                                           │ Inspector      │
│ Library       ├ bottom strip 30 (Layout): ▴ Timeline · Errors  /  timeline (Animate) ┤ (boxed sections)│
├───────────────┴ status bar 24 ─ mode chip · crumb · context · error chip · dock toggles · save state ┤
```

- Left dock default 256, right dock default 300; Animate defaults to 220 and 280 so the scene
  keeps its share with the timeline open. The timeline opens at 240. Drag edges to resize;
  sizes are remembered per workspace (browser storage, never source).
- Docks close from the status bar toggles and reopen from those toggles or the thin edge strip.
  `Ctrl Space` maximises the panel under the pointer and restores it again.
- Panels stay in the dock their workspace gives them; they do not move between docks.
  **Reset layout** in the ⋯ menu restores the workspace default.
- No floating windows. The desktop editor targets wide screens; there are no tablet or phone
  layouts. Dialogs are reserved for confirmations and command search.

## Workspaces

Workspaces are saved arrangements of the same panels. Switching never changes source, selection
or history; it changes what is visible.

| Workspace | Left | Centre | Right | Bottom |
| --- | --- | --- | --- | --- |
| Layout | Outline · Library | Scene | Inspector | Timeline · Console · Issues (collapsed) |
| Animate | Outline | Scene, sequence frame | Inspector (keyed fields) | Timeline (open) |
| Logic | Chunk logic · Conversations · Story logic | Rule view or graph, scene strip above | Inspector | Issues |
| World | City · Variables · Settings · Networks | City map | Inspector | — |
| Review | Run · Shortcuts · Test configurations | Private play | Live state · Watch | Events · Console |

Existing workbench areas map onto workspaces: `scene` panels to Layout/Logic by their `mode`,
`library` panels to the Library tab or Logic, `world` panels to World, `labs` panels to Review.
Read-only galleries (vehicles, buildings, signs) open from the Library dock, not top-level tabs.

While a sequence is open (Animate), composition structure (＋ Chunk, ＋ Composition, ＋ Mount,
chunks and groups), chunk boundary labels and connection tags are hidden; they return in base
editing. The inspector opens on the sequence's own settings instead of the checkpoint's
starting state.

## Panel anatomy

Every panel has the same three parts.

1. **Header** (32 px): tabs or title, then at most two actions and a `⋯` menu, right-aligned.
2. **Body**: the content. Sections are collapsible with a 32 px heading row.
3. **Footer** (optional, 40 px): Apply/Cancel for drafts, or one line of context such as
   "Not drawn at this time of day — preview night".

Inspector body order: identity block (name in mono 14, kind and owner in muted 12, icon
actions), then tabs (Properties · Behaviour · Rendering where they apply), then sections.
Show changed and overridden sections open; others closed with a one-word summary on the right
of their heading ("always", "none", "metro, taxi").

## Colour

Grey panels keep the art's colours true. Colour is reserved for meaning; each colour has one job.

### Surfaces and text

| Token | Value | Use |
| --- | --- | --- |
| `--chrome` | `#202020` | Header, status bar |
| `--bg` | `#161616` | Behind the scene and graphs |
| `--panel` | `#262626` | Dock panels |
| `--raised` | `#333333` | Buttons, cards, hovered rows |
| `--field` | `#1b1b1b` | Inputs, selects, search |
| `--separator` | `#404040` | Lines between regions and rows; decorative only |
| `--control-line` | `#737373` | Borders of inputs and buttons (3.2:1 on panel) |
| `--ink` | `#e8e8e8` | Main text (12.4:1 on panel) |
| `--muted` | `#aaaaaa` | Labels, secondary text (6.5:1) |
| `--faint` | `#9c9c9c` | Hints, counts, units (4.6:1 even on `--raised`) |

### Meaning

| Token | Value | Means | Never use it for |
| --- | --- | --- | --- |
| `--select` | `#5aa2ff` | Selected object, active tab/tool, focus ring, playhead | Buttons, links to other places |
| `--primary` | `#e8e8e8` fill, `#161616` text | The one main action in a region (Save, Apply) | Anything else |
| `--key` | `#e9bc45` | Sequence editing: banner, frame, keyed fields, key diamonds | Warnings |
| `--changed` | `#3fc7b4` | Value changed from default or overriding an inherited one | Selection |
| `--draft` | `#c9a6ff` | Staged edit not yet applied (Apply/Cancel forms) | Saved changes |
| `--play` | `#7fd18b` | Private play running: banner, frame, values changed by the run | Success messages |
| `--error` | `#ff8080` | Rejected edits, broken references, issues | Emphasis |

- Text on `--select`, `--key` and `--play` fills is dark (`#0d1b2e`, `#1b1300`, `#07160a`).
- Never colour alone: pair each with a word or glyph (`!`, `◆`, `↺`, `●`).
- Inherited values: muted italic text with a dashed field border and "from district" style
  provenance; one **Override** link. Overridden values: a 3 px `--changed` bar on the left of the
  field and a reset `↺`.
- Preview-only settings (time of day, weather, hack vision, discovery simulation) sit in a
  container with a dashed border labelled **Preview only**. When a checkpoint is selected the
  values come from it, so the border turns solid and the label reads **Checkpoint world**.
  They never use a meaning colour.
- The scene preview, graphs and maps are never tinted by the UI. Mode frames sit outside them.

## Type

| Role | Size / line | Weight | Font |
| --- | --- | --- | --- |
| Panel and section headings | 12 / 16 | 600 | Sans, sentence case |
| Body, labels, buttons | 12 / 16 (13 in header tabs) | 400 | Sans |
| Identity name | 14 / 20 | 600 | Mono |
| Group labels in lists | 11 / 14, +0.06em | 600 | Sans, uppercase |
| Values, IDs, times | 12 / 16 | 400 | Mono (IBM Plex Mono) |
| Workspace title (graphs, rule view) | 18 / 24 | 600 | Sans |

Sans is Inter with system-ui fallback. Use weight before size. No text below 11 px. Mono marks
data the author types or the engine names; labels and prose are never mono.

## Size and spacing

- 4 px spacing grid. Panel padding 12; row gap 6; section gap 0 (headings carry the rhythm).
- Control heights: fields 26, buttons 28, compact buttons in overlays and footers 24, list rows 26.
- Radius 3 for controls, 6 for cards and overlays, 10 for dialogs.
- Field grid in the inspector: label column 78–96 px, value column fills. Paired values (X/Y)
  share one row.

## Controls

- **Buttons:** default (`--raised`, `--control-line`), quiet (no border, `--muted` text) for
  secondary actions, icon-only (28 square, `aria-label` required). One primary per region.
- **Tool and mode toggles:** pressed state uses `--select` border and a 16% `--select` fill.
- **Segmented controls** for 2–4 exclusive options; selects beyond four.
- **Pickers:** any list over 15 entries gets search and grouping. Generated IDs (window
  anchors, internal parts) are hidden behind "Show internal".
- **Numbers:** keep the existing scrubbing contract; units in `--faint` after the value.
- **Disabled** controls keep their label readable (`--muted` text, no opacity below 0.6).
- **Help:** one line under a field at most. Longer explanations go behind an `ⓘ` button in the
  section heading or a documentation link. No paragraphs between fields.

## Modes and state

| State | Signal |
| --- | --- |
| Base editing | Status bar chip "BASE EDITING" in `--ink`; no frame |
| Sequence editing | `--key` banner across the scene top with "Exit to base editing", 2 px `--key` frame, chip "SEQUENCE · id @ time" |
| Draft open | `--draft` bar on changed fields, footer with Apply (primary) and Cancel; status "Save waits for Apply" |
| Playing | `--play` banner with pause/step/speed, 2 px `--play` frame, chip "PLAYING" |
| Rejected edit | Red ghost of the attempted change in the scene, snaps back; error card at the top of the inspector with the reason in one sentence and a fix action |
| Unsaved edits | Count beside Save ("3 unsaved edits"); Save is primary only while there is something to save |

Status and badges appear only for exceptions. A chunk that is fine shows no badge.

## Scene overlays

- Scene toolbar as its own row above the scene: Add, Live motion (ambient people, lights and
  signs; "Play sequence" when a sequence is open, hidden in sequence editing where the timeline
  owns playback), sequence picker, Snap, checkpoint and play starting point, then ▶ Play. There are no Select/Move tools: the
  editor has no tool modes, so clicking selects and dragging moves. The selection breadcrumb
  sits in the status bar.
- Inside the scene: **Preview only** bar top-right; zoom, percentage and Frame `F` bottom-left;
  Camera and Show menus bottom-right (chunk borders, outlines, status, layers).
- Selection: 2 px `--select` outline with a label in mono 11 on a `--select` fill. Hover uses
  the same shape at 1 px, without a label fill.
- Clicking again where objects overlap cycles through them; `Alt`-click lists what is under the
  pointer.

## Keyboard

| Key | Action |
| --- | --- |
| `Ctrl K` | Command search: objects, commands, settings, library |
| Drag | Drag artwork moves it; drag empty space or middle-drag pans |
| `H` `I` | Preview hack vision, preview interiors (existing; same keys as the game) |
| `F` | Frame selection (whole chunk when nothing is selected) |
| `Shift A` | Add |
| `Delete` / `Ctrl D` | Delete / Duplicate selection |
| `Ctrl Z` / `Ctrl Shift Z` | Undo / Redo |
| `Ctrl S` | Save |
| `Space` `,` `.` `←` `→` `Home` `End` | Timeline transport (existing `animation-shortcuts.ts`) |
| `Ctrl Space` | Maximise panel under pointer |
| `1`–`5` with `Alt` | Switch workspace |
| `Esc` | Close search/menu, cancel drag, then deselect |

Shortcuts never fire while typing in a field. Every shortcut also has a visible control or a
search entry.

## Checklist for new editor UI

- Does the scene keep its space? New UI goes into an existing dock tab or the inspector.
- Is there exactly one primary action in the region?
- Does every colour used carry one of the meanings above?
- Is the help one line or less, with the rest behind `ⓘ`?
- Is a long list searchable, and are generated IDs hidden?
- Does a mode or temporary preview look different from saved editing?
- Is the setting edited in one home, with links from elsewhere?
- Is it configurable and saved through ComposerModel, not only shown?
