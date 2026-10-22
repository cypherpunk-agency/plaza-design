# Stacks and Downtown motion source

The crane's lifts and Downtown's delivery van are Circuit movers (engine/movers.ts) and zones, declared
in the scene's device document: `sts2.trolley` and `port.beam` in the stacks, `dlv9.chassis` and `gate.beam` in
Downtown. Their stops, legs, timings (the scene's `tuning`: `liftOverMs`, `liftHoistMs`, `liftTravelMs`,
`liftLowerMs`, `returnMs`, `dlvSpeed`, `dlvSignalMs`), offsets (the stops' `plus` from the gate's spot) and
milestones are typed mover and zone controls in Logic › Devices, validated by data/check.ts (unsupported
references and nonpositive timings reject atomically). The `controller` block only names things: the
scanner device, the gate and vehicle devices, the mover, and the state roles. These are inputs to the
physical implementations, not a second state owner or expression evaluator.

Stacks lift-start and scanner responses execute ordinary source commands after the Circuit's parts report a
physical milestone (a leg's end, a zone crossing). The only code is the two orders that start a path
(`sts2.lift`, `port.return`, `dlv.inward`, `dlv.outward`); scene time, through the model's tick, moves the
movers. The authored command/event layer owns the resulting reply and ordinary state mutation.

This closes this configuration slice. Camera-panel bindings and the final complete controller
inventory remain separate acceptance work.
