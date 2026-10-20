# Stacks and Downtown motion source

The registered native controllers retain the existing crane/cargo trajectories and Downtown
delivery vehicle simulation. Their timings and endpoint/state references now come from the
scene's device document `controller` block. Logic's scene device settings expose these as typed
controls; unsupported references and nonpositive timings reject atomically.

Stacks exposes the four lift phases, return duration, scanner device and cargo state roles.
Downtown exposes the gate/vehicle endpoints, inside/outside offsets, signal duration, location
state and speed tuning reference. These are inputs to the existing physical implementations,
not a second state owner or expression evaluator.

Stacks lift-start and scanner responses execute ordinary source commands after the native
controller reports a physical milestone. Native trajectories and their clock remain registered
code. The authored command/event layer owns the resulting reply and ordinary state mutation.

This closes this configuration slice. Camera-panel bindings and the final complete controller
inventory remain separate acceptance work.
