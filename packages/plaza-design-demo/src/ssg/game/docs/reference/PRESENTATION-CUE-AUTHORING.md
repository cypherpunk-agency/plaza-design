# Presentation cue authoring

The Scene inspector can add, remove and rebind a scene's presentation cues.
Each binding connects a declared gameplay event to a registered native artwork
target. Targets come from the scene's presentation contract; they are not a
second list maintained by the editor. Adding a cue opens its inspector section.

The existing gameplay event handler and native presentation state consume the
pending bindings. This adds no new renderer, script evaluator or persistent
state owner. Registering new procedural artwork still requires code. Ordinary
event-to-artwork bindings are source content.

Run `pnpm exec tsx scripts/scene-system/check-presentation-cue-crud.mts` from
the demo package. It exercises the actual typed controls, duplicate-pair and
unknown-target rejection, committed Game events reaching native artwork inputs,
unbound events, history, portable bundles, protected grouped Save, fresh shipping
imports and byte-exact source Undo. The latest focused proof is
`.scene-system/presentation-cue-crud-5Q7PHv/evidence.json` at repository root.

This proof covers the Harbor cue contract. It does not establish full controller
authoring or all-scene visual preservation; those remain separate acceptance work.
