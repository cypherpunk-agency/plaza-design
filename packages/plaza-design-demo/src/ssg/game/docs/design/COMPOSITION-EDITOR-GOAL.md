# Composition-centered editor: finite goal contract

Authorized 2026-10-26. ROADMAP.md is the sole milestone/status overview. This document defines
acceptance, preservation and boundaries for E1–E6; it is not another priority roadmap.

## Objective

Make compositions the editor entry point, with chunks/assets edited in one persistent world
workspace, optional sequence direction, authored preview checkpoints and storyboard navigation.
Use the actual pending source, existing runtime and single renderer throughout. Complete all six
milestones without requiring the designer to settle the opening's final geography or timing.

## Agreed assumptions

- A composition arranges one or multiple chunks. A standalone chunk is accessible in the same
  workspace without a manually maintained duplicate source wrapper.
- Chunk sources may be referenced by multiple compositions. Edits affect that source everywhere;
  the editor identifies the source. Decorative visuals are assets/asset instances.
- Checkpoints are authored preview starting situations extending existing Play fixtures, not
  captures of campaign history. Sequence time is scrub-able; arbitrary gameplay is not.
- Storyboard links organize navigation. The existing conditions/triggers/commands execute gameplay.
  Planning notes and actual executable transitions remain distinguishable.
- Leaving sequence editing only changes editor context. It executes no completion/cancel command.
- Retain Harbor while surrounding membership changes. No automatic entity/state migration or
  chunk replacement transaction is introduced. Existing lifecycle safety/deferral remains internal.
- Keep editor pan/zoom independent of directed cameras. Playback restores paused after reload.
- Public editing is browser-local; protected source Save stays loopback-only. Private Play stays
  isolated from campaign state. No new publication permission is inferred.

## Acceptance gates

E1: Terminology/contracts/UI distinguish Composition, Chunk, Asset definition/instance, Sequence,
Timeline, Checkpoint and Storyboard beat. Old overlapping source-type aliases are removed within
scope; persisted content retains identity and behavior. Singleton access creates no duplicate source.

E2: Browse/open a named multi-chunk composition or a standalone interior; select/edit assets from
all visible members through source identity; find/focus chunks without replacing the workspace;
inspect membership separately from residency. Reload restores composition/framing/selection.
History, bundle and protected Save preserve cross-chunk changes and reject invalid edits atomically.

E3: Select a sequence in that composition, reveal its bottom timeline, edit base values or keys
explicitly, scrub, inspect camera and return to ordinary editing without losing framing. Director
membership does not silently replace authored composition membership. Standalone cutscenes remain
supported. Game/editor/sequence use renderWorldFrame and the existing timeline evaluator.

E4: Create/edit/select checkpoints through typed controls for fixture state, composition membership,
player location and optional sequence position. The preview and native private Play consume the
same reconstruction inputs. Loading establishes trigger baselines without firing arrival/once effects.
Malformed references and impossible player starts reject; campaign saves are untouched. Bundle,
history, protected Save and native reload retain the checkpoint.

E5: A storyboard beat can reference a composition, checkpoint and optional sequence; selecting it
opens the corresponding workspace/context. Existing story notes/status/teaching information remain.
Branches are navigation links, while actual transition references identify existing commands and
triggers. No second condition evaluator or progression scheduler is introduced. Broken links reject
atomically and the UI distinguishes planning-only content from playable starting points.

E6: Provide direct local review entry points for launch, glide, Harbor arrival, first quest and regular
world membership. Demonstrate persistent Harbor identity while opening-only membership leaves and
regular membership arrives. Test actual engine transitions, independent player/camera residency,
sequence completion/skip, fixture isolation and source roundtrips. Remove replaced scene/sequence
navigation and duplicate starting-state/storyboard controls; update current guidance. Preserve the
approved 24 scene snapshots plus focused sky/opening consistency checks without replacing expected
images to hide a regression. Package tsc and homepage build pass. No remaining required gate work.

## Verification and stopping rule

Record concrete checks and honest limitations in the final report and ROADMAP.md. A source panel,
reachable page or green build alone does not establish authoring completion. Mechanical testing is
agent-owned; subjective geography, pacing and appeal remain future designer/user work. Preserve
existing uncommitted work and check interactions with it. No campaign playthrough or unrelated CI,
performance campaign, content expansion, historical fixtures or compatibility engine is included.
Do not declare the goal complete until every gate is met; a decision-dependent blockage must name
the exact affected behavior and continue independent work where possible.
