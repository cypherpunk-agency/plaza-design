# Scene presentation actor references

2026-10-20. Extends the existing flag presentation contract; no new gameplay evaluator or state owner.

Beach's native bartender body and ashore visibility now select actors through scene.json presentation.
The source explicitly names a bartender and an ashore actor list. The existing Beach visual controller
still supplies the one danger predicate. Neither an old actor ID nor an ID prefix selects behavior.
Missing optional bindings do not restore the old actors. Actor references are validated against the
current scene actor collection; unknown, duplicate or wrongly shaped references reject atomically.

Scene inspector Actor presentation offers a bartender selector and per-actor shore membership.
Group membership follows the shared Duplicate actor action. Singleton roles remain assigned until
explicitly changed. Remove actor prunes singleton/group references in the same source transaction.
This applies through the existing actor helpers and UI rather than an extra per-scene removal path.
The chosen bartender uses the existing native bar artwork when it has no custom character appearance.

Removed the unused LIME alias and old standalone drawing/mutable GULL path. The preview adapter no
longer maintains a fallback gull state; the real scene's existing PresentationSignals supplies both
Game and preview. Art implementations, danger logic, callbacks and current save shape stay unchanged.

## Evidence

Commands run from packages/plaza-design-demo:

Next apply these same stateless artwork and actor-reference contracts to other native identity-based
consumers, starting with Shop's window/counter and keeper/outside group. Audit actor artwork binding
helpers alongside consumers so a new actor ID receives the same clipping capability as an old one.

## Shop continuation

Shop now uses keeper (single actor) and outside (actor group) through the same inspector/CRUD
contract. The optional window/counter artwork roles drive scaled native clipping and offscreen
culling. Missing roles do not restore canonical artwork. New and duplicated Shop actors receive
registered clip bindings; only outside members use the clipping rectangle. Clearing an old outside
actor's membership immediately removes its clip and cull policy, irrespective of its ID.
The old window/counter may be removed after actual dependent artwork has been reanchored.
Shop lighting kernels are registered presentation-only consumers; no game logic is unlocked by
removing them. The common manifest/source validators retain real references.

## Mall slots, phases and embedded bodies

The same actor-reference contract now supports maps from actor IDs to explicit numeric slots or
phases. Mall far entries select the adaptive floor slot; gallery entries name the original artwork
height from which the gallery-slab offset is measured; rider entries select the escalator phase
between0 and1. Typed membership/number fields sit under Actor presentation. Duplicate inherits the
exact value; removal prunes only that actor, preserving every other actor's slot/phase. Single
vendor roles use the existing actor pickers. An actor attached to a booth with the corresponding
registered vendor visual binding is painted inside the booth once; neither booth nor actor needs
its historical ID. Unbound/absent inputs never recover old prefixes or names.

## Harbor assignments and clipping

Harbor exposes operator0/operator1, driver, watchman, guard, fishVendor/teaVendor and denGuests
through the same single/group actor controls, plus the bribed flag picker. Current source geometry
roles select attachment owners. Assigned operators/driver follow their existing motion primitive;
watchman/operators receive per-actor clips; attached vendor bodies paint once within their booth;
den membership controls culling; the selected flag drives guard/fence presentation. Missing optional
presentation stays absent. Names and prefixes never select these policies.

The existing shared actor helper now registers Harbor's clip prefix, so new/duplicate actors get
exactly the same capability. Old role clip aliases are removed. The preview no longer runs a
fallback over default global actors/signal reads; the native scene's own PresentationSignals feeds
both Game and editor. No state owner, old-save bridge or new animation implementation was added.

## Stacks terminal actors