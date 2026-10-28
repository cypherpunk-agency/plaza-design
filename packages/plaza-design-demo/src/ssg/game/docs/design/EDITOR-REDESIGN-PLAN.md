# Editor redesign: migration plan

Plan agreed in direction 2026-10-28; not yet started. Target rules: [Editor UI](../reference/EDITOR-UI.md).
Phases 1–6 are governed by the [goal contract](./EDITOR-REDESIGN-GOAL.md); phase 7 is parked
with [notes](./EDITOR-PHASE-7-NOTES.md).
[ROADMAP.md](../../ROADMAP.md) owns priority. Each phase is a separate, reviewable change that
leaves the editor fully usable; the user reviews each in the browser before the next starts.

## Why

Measured on the local composer at 1600×950 (2026-10-28):

- 112 visible controls with nothing selected; 264 with a sequence open.
- The scene preview gets 27% of the window with the timeline open.
- `--accent` teal is used 65 times in the styles for selection, primary buttons, toggles,
  chunk borders and the timeline, so it no longer means anything.
- Control borders are 1.4:1 against panels; buttons are 1.1:1 against panels.
- Four font sizes between 10 and 13 px with no heading level.
- Library, World data and Developer tools replace the whole screen; three levels of tabs.
- Explanations sit between fields; "Attach to" lists hundreds of generated anchors unsearchable.
- "Prepared for editing" is shown on every chunk; 12 per-row Focus buttons in sequence mode.
- Almost no editor shortcuts besides timeline transport and preview toggles.

## Ground rules

- Presentation and navigation only. ComposerModel, history, validation, bundles, protected Save,
  the shared renderer and private Play keep their ownership. No second state owner: workspace,
  dock and section state are view preferences stored like today's panel widths and view memory.
- Workbench mounts (`entry.ts` workbench and inspector-section configs, `createFrame`) keep their
  contracts. The shell changes where they mount, not how they edit.
- The public editor uses the same shell.
- Each phase removes what it replaces (old tabs, duplicate entry points, superseded styles).
- Each phase is verified as AGENTS.md describes: complete the affected editor task in the
  browser (find, select, change, preview, commit or reject, Undo), `tsc -b` from
  `packages/plaza-design-demo`, `pnpm build:homepage`, and the focused editor checks that cover
  the touched area. Report usability and verification separately.

## Phase 1 · Tokens and type (look only)

Smallest visible step; no layout change.

- `authoring/styles.ts`: replace the token block with the neutral grey tokens from the spec.
  Split today's `--accent` uses by role into `--select`, `--primary`, `--key`, `--changed`,
  `--draft`, `--play`; replace `--warn`/`--danger` with `--key`/`--error` where they mean that.
  Add `--separator` and `--control-line`.
- Hard-coded colours in editor chrome (`event-inspector.ts`, `controls.ts`, `selection-overlay.ts`,
  `spatial-handles.ts`, `source-viewer.ts`) move to tokens. Art-preview colours in
  `style-frames.ts`, vehicle/building/character workbenches stay: they depict game content.
- Type scale: 11/12/14/18 with sentence-case 600 headings; mono only for values and IDs.
- Control heights 26/28/24, radius 3/6/10.

Done when: every screen renders in neutral grey; teal is gone; selection, primary, keyed and
error states are distinguishable in a side-by-side check of Layout, sequence editing, a staged
inspector and Play.

## Phase 2 · Shell: header, status bar, docks

- New `authoring/shell.ts`: header (brand, workspace tabs, search placeholder, Undo/Redo,
  unsaved count, Save, `⋯` menu holding Reload, Import/Export, Discard all, Reset layout) and
  status bar (mode chip, checkpoint, selection count, grid, save state). The existing
  status/notice line moves into the status bar and toasts.
- New `authoring/docks.ts`: left/right/bottom docks with tabbed panels, resize, collapse to tab
  strip, `Ctrl Space` maximise, remembered per workspace. Builds on `panelHandles()` and
  `frame.ts`; `createFrame` becomes a dock arrangement rather than a separate grid.
- `app.ts`: the scene outline, inspector, timeline and viewport mount into docks instead of the
  fixed `workspace` grid. Top-level `World / Library / World data / Developer tools` tabs are
  replaced by workspaces; the `Layout / Logic` pill and the mobile Outline/Inspector switch go.
- Workbench registry: map `area`/`mode` to a workspace and dock (see the spec's workspace table).
  Library galleries become Library dock tabs.

Done when: all existing workbenches are reachable from a workspace without the old top tabs;
URLs with `panel=` still open the right panel; panel sizes and dock state survive reload; the
scene keeps ≥60% of 1600×950 in Layout.

## Phase 3 · Scene toolbar and overlays

- Toolbar: Select/Move tools, Add, Snap, selection breadcrumb, Play from here.
- Preview-only bar inside the scene from the environment controls already flagged `quick`
  (time of day, weather, hack vision, interiors), dashed and labelled.
- Bottom-left zoom/Frame; bottom-right Camera and Show menus absorbing chunk borders, chunk
  status, object outlines, neighbours, Locate/Follow camera.
- The three option rows above the scene (checkpoint, workspace/compare, preview settings) move:
  checkpoint and sequence context to the status bar and Animate workspace; compare to Show.
- Mode frames: `--key` banner and frame in sequence editing; `--play` in Play.
- Overlap cycling on repeated click; `Alt`-click lists objects under the pointer.

Done when: the seven P3 authoring tasks listed in ROADMAP.md still complete; no
preview-only control is outside the dashed bar.

## Phase 4 · Inspector

- Shared identity block and Properties · Behaviour · Rendering tabs for every selection kind.
- Sections collapsed by default except changed or overridden ones; heading summaries.
- Changed/overridden marker and reset from the existing effective-value/provenance resolution;
  inherited values rendered as inherited with one Override link.
- Help text: move paragraph notes into `ⓘ` popovers or a single footer line.
- Searchable, grouped picker component for any option list over 15; hide generated anchors
  behind "Show internal". Replace `select` uses in field controls where lists can grow.
- Staged forms (mount, connection, sequence rendering) share the draft footer and `--draft`.

Done when: the light, connection, character, barrier and chunk inspectors follow the anatomy;
no inspector shows explanatory paragraphs before its first control.

## Phase 5 · Outline and Library panel

- Status badges only for problems; remove "Prepared for editing" labels.
- Row actions (visibility, focus) on hover; double-click or `F` frames; remove per-row Focus
  buttons.
- Library as a dock tab with search, filter chips and drag into the scene; kit presets inside.

## Phase 6 · Command search and shortcuts

- `Ctrl K` dialog over a command registry: objects in the open composition, editor commands,
  settings (with their location path) and library entries.
- Shortcuts from the spec; registered with the commands so search shows them.

## Phase 7 · Workspace content

Larger feature work, each its own change after the shell exists:

- Logic: sentence rule view (WHEN / IF / DO) over existing interaction and trigger sources,
  objective chain, dimmed scene strip.
- Conversations: graph view over the existing conversation graphs.
- World: city map workspace consolidating City map, Districts, Travel, Variables, Networks and
  Game settings.
- Review: private Play with run configuration, live state with run changes marked, events log
  and "save this moment as a checkpoint".

Each follows the feature rule: every control edits and saves through ComposerModel.

## Decided

- The public editor gets the same shell and workspaces; only the existing save/download
  difference remains.
- Desktop only (1280×800 minimum); the narrow-screen layout is removed.
- Work stays local until the whole goal passes; review stops after phases 1 and 2.
- Which phase-7 workspace comes first is decided after the goal; see the phase 7 notes.
