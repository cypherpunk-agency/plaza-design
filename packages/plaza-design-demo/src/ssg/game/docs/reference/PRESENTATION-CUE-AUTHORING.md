# Presentation cue authoring

The Scene inspector can add, remove and rebind a scene's presentation cues.
Each binding connects a declared gameplay event to a registered native artwork
target. Targets come from the scene's presentation contract; they are not a
second list maintained by the editor. Adding a cue opens its inspector section.

The existing gameplay event handler and native presentation state consume the
pending bindings. This adds no new renderer, script evaluator or persistent
state owner. Registering new procedural artwork still requires code. Ordinary
event-to-artwork bindings are source content.

This proof covers the Harbor cue contract. It does not establish full controller
authoring or all-scene visual preservation; those remain separate acceptance work.
