# Editor redesign: finite goal contract

Authorized 2026-10-28. Covers phases 1–6 of the [redesign plan](./EDITOR-REDESIGN-PLAN.md),
building to the rules in [Editor UI](../reference/EDITOR-UI.md). Phase 7 is outside this goal;
its notes are at the end and in [EDITOR-PHASE-7-NOTES.md](./EDITOR-PHASE-7-NOTES.md).

## Objective

Move the composer to docked task workspaces in the neutral grey look so that the scene keeps
most of the window, only the relevant thing stands out, every setting has one home and the
editing mode is never in doubt. Editing behaviour, source ownership and saved data stay as they are.

## Agreed assumptions

- **Desktop only.** Minimum supported window 1280×800; design and measure at 1600×950. The
  narrow-screen layout (the `max-width: 760px` single-panel switch) is removed, not redesigned.
- **Public editor.** `cypherpunk.agency/editor/` runs the same code with a published document
  snapshot and no save service. It gets the same shell and workspaces. The existing difference
  stays: no Save to source or Reload source, and edits leave as downloaded bundles. No new
  public/local split is introduced.
- **Presentation only.** ComposerModel, history, validation, bundles, protected Save, the shared
  renderer, private Play isolation and workbench mount contracts keep their ownership. Workspace,
  dock and section state are per-browser view preferences, like today's panel widths.
- **Local until done.** Work stays in this worktree; nothing is pushed to main until the whole goal
  passes and the user approves. Commits within the worktree are fine for checkpoints.
- **One review at the end.** The user started the goal as a single run (2026-10-28), so the
  phase 1 and phase 2 review stops are folded into the final report, which includes before/after
  screenshots of the look and the docks.
- Mockups in the [layout canvas](https://claude.ai/artifact/2rJZRN6SeUisTKoTatZ9ZD) show intent,
  not pixel specs. The spec wins where they differ.

## Measurement

Measured in the local composer at 1600×950, Downtown chunk, base editing, unless stated.

- **Visible controls:** buttons, selects, inputs and tabs whose box intersects the viewport.
- **Scene share:** scene canvas area ÷ window area.
- **Contrast:** WCAG ratios of the tokens against the surfaces they sit on.

Baseline 2026-10-28: 112 visible controls with nothing selected, 264 with the glide sequence
open; scene share 27% with the timeline open.

## Acceptance gates

| Gate | Phase | Passes when |
| --- | --- | --- |
| G1 Look | 1 | No `--accent`, `--warn` or `--danger` remain in editor styles; colour roles from the spec are the only meaning colours in editor chrome. Text ≥4.5:1 and control borders ≥3:1 on their surfaces. Type uses the 11/12/14/18 scale; no editor text below 11 px. |
| G2 Shell | 2 | Header, status bar and docks replace the old top tabs, `Layout / Logic` pill and option rows' hosting. All 23 panels are reachable from a workspace or dock tab: `assets`, `world-map`, `conversations`, `game-settings`, `story-logic`, `play-profiles`, `world-variables`, `network`, `scene-connections`, `review-stations`, `manifest-pilot`, `scene-logic`, `gameplay`, `device-config`, `events`, `play`, `demo-world`, `characters`, `style-frames`, `storyboard`, `vehicles`, `buildings`, `signage`. Existing `#scene=`, `#composition=`, `#checkpoint=`, `sequence=`/`time=` and `panel=` links open the same context. Dock sizes and arrangement survive reload per workspace; Reset layout restores defaults. |
| G3 Scene | 3 | Scene share ≥60% in Layout and ≥45% in Animate with the timeline open. Preview-only controls exist only inside the dashed Preview only bar. Sequence editing shows the key banner and frame; Play shows the play banner and frame. Repeated click cycles overlapping objects; Alt-click lists them. |
| G4 Inspector | 4 | Light, connection, character, barrier, device and chunk inspectors use the shared anatomy. No explanatory paragraph appears before the first control. Changed and overridden values are marked with reset; inherited values show their source and one Override link. Every option list over 15 entries is searchable; generated anchors are hidden by default. Staged forms share the draft footer. |
| G5 Outline & Library | 5 | No status badge on healthy chunks; no per-row Focus buttons; double-click and `F` frame. Library is a dock tab; dragging a library piece into the scene places it through the existing add path. |
| G6 Search & keys | 6 | `Ctrl K` finds objects in the open composition, editor commands, settings with their location, and library pieces, and runs or opens each. Spec shortcuts work, never fire while typing, and show in search. |
| G7 Focus | all | ≤50 visible controls with nothing selected; ≤90 with the glide sequence open and the timeline expanded. |
| G8 Nothing lost | all | The seven P3 authoring tasks in ROADMAP.md complete with selection, typed controls, preview, commit or rejection, Undo, protected Save and reload. A staged Apply/Cancel, a rejected placement, numeric scrubbing, keyframing at the playhead and private Play start/stop all still work. The public editor build loads and can download a bundle. |

## Verification and stopping rule

Each phase: browser walk-through of the affected tasks (find, select, change, preview, commit or
reject, Undo), `tsc -b` from `packages/plaza-design-demo`, `pnpm build:homepage`, and these
focused `pnpm test:game` checks: `composer-model`, `composition-workspace`, `editor-hit-targets`,
`editor-validation-snapshot`, `editor-view-memory`, `editor-visibility`, `keyframe-editor`,
`numeric-scrub`, `preview-checkpoints`, `play-startup`, `play-profiles`, `public-document-bundle`,
`public-editor-build` and `world-composition-authoring`. Approved
visual snapshots of game rendering must not change; editor chrome snapshots may be updated only
for the deliberate look change, with before/after shown to the user.

Report editor usability, measurements and automated checks separately for each phase.

Stop and ask the user when:
- a gate cannot pass without changing editing behaviour, source formats or ownership;
- a workbench cannot be placed in a workspace without redesigning its content (that belongs to
  phase 7);

- the whole goal passes: then report against every gate, list remaining limitations, and
  **highlight phase 7 as the next decision** with a pointer to its notes.

## Phase 7 (not in this goal)

Logic rule view, conversation graph, World workspace and Review workspace content. Design notes,
mockup references, existing sources and open questions are kept in
[EDITOR-PHASE-7-NOTES.md](./EDITOR-PHASE-7-NOTES.md). The goal's final report must point to it.
