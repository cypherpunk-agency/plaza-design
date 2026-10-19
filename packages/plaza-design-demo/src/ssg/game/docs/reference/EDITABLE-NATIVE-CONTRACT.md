# Editable gameplay contracts and real native inputs

The fully editable `validateNativeContract` path validates the current gameplay
schema rather than preserving its shipping inventory. Original vocabulary,
commands, command permissions, scalar declarations and fixed starting cables may
be removed or changed once current references have been rebound. Restricted
contracts retain their explicit policy. A cable's `fixed` bit still prevents
player cuts; it does not prevent source authors from changing their initial map.

Native scalar dependencies use the existing `SceneRules.needs.state` contract.
A string requires a current starting value. A typed `{key,type}` role additionally
requires the corresponding nonnullable declaration and materialized primitive
value. The single pure normalizer/checker is used at prospective device validation
and fresh shipping assembly. It neither restores declarations nor copies baseline
schema/defaults. Common state declarations remain the sole scalar owner.

The inventory records actual code consumers: Yard camera/parcel presentation,
Downtown DLV location and camera feed, Moth's fed/fern/tape drawing, Laundromat's
washer/breaker drawing, Stacks cargo/scope presentation, Beach's native visual
fields and Sandbox's finite snapshot fields. Capsule continues to validate its
source-configured controller mappings. Fields used exclusively by shared commands,
conditions or queries have no native identity floor. Further parameterization of
conditional native artwork consumers remains separate work; this slice does not
claim those snapshot interfaces are entirely source configurable.

Physical input IDs remain validated against actual `SceneRules.inputs`. Inputs
and deadlines require system-only commands. Authored command permission changes
cannot weaken those current consumers. Native query output contracts, current
references, readonly observations and model-level invocation checks remain active.

Library now projects only graph IDs requested by current native talk actions.
The shipping bootstrap and scene factory use the same pure projection. A talk
step can choose an existing graph through a finite typed selector. Shared graph
controls can create a blank graph or copy a current graph and remove an unused
graph. The old catalog ID and renewed read mapping are not restored or consulted
when source authors replace them.

`check-editable-native-contract.mts` covers typed orphan vocabulary/state removal,
author-owned permissions, strict current system consumers, and actual Library
state/read/action/status/flag/graph rebinding. Referenced removal rejects before
mutation. Pending native renewal, repeat handling and dialogue selection match
the current sources. Paired source Save, fresh shipping import and exact history
and byte Undo complete the proof. `check-rebound-command-removal.mts` separately
covers replacing a real Capsule route and deleting the original command.

Remaining custom content restrictions are explicit follow-up work: Shop's fixed
rotation/invoice rules, Laundromat's soap purchase rule, Harbor Shift's original
command/vocabulary/choice inventory and hardcoded projections in other registered
scene factories. This change does not remove those unrelated contracts or add
save aliases, fallback declaration owners or another evaluator.
