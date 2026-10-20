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

- check-beach-actor-role-source.mts PASS: .scene-system/beach-actor-role-source-4MPOcw.
  Actual mounted role fields and Remove actor buttons, singleton reassignment, inherited group role,
  removed reference cleanup, green/danger native poses for non-prefix and unbound old-prefix actors,
  explicit absence/no backfill, invalid edits atomic, history/bundle/protected Save/fresh shipping/byte Undo.
- check-actor-entities.mts PASS all19: .scene-system/actor-entities/run-5XGdEn. Source creation,
  duplicate/removal/rebinding, dialogue/identity, invalid refs, portable/grouped protected Save and Undo.
- check-market-editable.mts PASS: .scene-system/market-editable/run-Uty2SN; shared flag presentation remains.
- Beach60 original Canvas-command comparisons and512 immutable timed model/session histories PASS.
- Package TypeScript and both builds PASS. Public package97 documents /128 source references.
- Source sha256:a7aee7d9c0d0708946beef4f4ea029059027eb93b92d518b5800bbb0cc9e1dc6:
  all173 browser raster comparisons have zero differences/max delta/errors, independently verified.
- Actual packaged Beach native Play/Stop PASS with no warning/error logs. Actual inspector exposes the
  bartender selector and seven checked shore roles. Local app-FF7NIB2Q.js / play-QWVCKLJH.js /
  play-50286159fd53559c.html. Not a campaign playthrough or whole-goal G4/G8/G9/G10/G12/G13 signoff.

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

check-shop-source-roles.mts PASS (`shop-actor-role-source-p3asuo`) covers actual typed controls,
replacement/removal, scaled clips, source singleton/group reassignment, invalid refs/dimensions,
optional absence, model history, bundles, protected Save, fresh shipping import and byte Undo.
Original Shop drawing/purchase/refusal checks and both builds PASS. Source04c1aa71e826 passes
173 browser raster comparisons with zero differences/errors and actual packaged Shop Play/Stop.
Next native identity consumers include Mall's adaptive floors, escalator riders and booth actors.

## Mall slots, phases and embedded bodies

The same actor-reference contract now supports maps from actor IDs to explicit numeric slots or
phases. Mall far entries select the adaptive floor slot; gallery entries name the original artwork
height from which the gallery-slab offset is measured; rider entries select the escalator phase
between0 and1. Typed membership/number fields sit under Actor presentation. Duplicate inherits the
exact value; removal prunes only that actor, preserving every other actor's slot/phase. Single
vendor roles use the existing actor pickers. An actor attached to a booth with the corresponding
registered vendor visual binding is painted inside the booth once; neither booth nor actor needs
its historical ID. Unbound/absent inputs never recover old prefixes or names.

check-mall-actor-roles.mts PASS (`mall-actor-role-source-IhzrYe`) proves actual forms, newly named
actors, reassignment, old actor/booth removal, unchanged slots after deletion, real native outputs,
invalid edits/absence, bundle/protected Save/fresh shipping/byte Undo. All19 actor helper regression
PASS (`actor-entities/run-WyCTmf`). Beach/Shop source role regressions PASS. Original Mall77 body and
interaction/booth/tall-floor pose checks and both builds PASS. At source2992ba89a94c, all173 browser
raster rows have zero differences/errors; all19 actual packaged native editor Play/Stop pass without
warning/error logs. This is bounded presentation evidence, not whole-goal acceptance.

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

check-harbor-actor-roles.mts PASS (`harbor-actor-role-source-1mLI7X`) through actual typed controls,
new IDs/clipping/group inheritance, motion/clip/vendor/guard effects, unbound former prefixes,
removal, absent/invalid source, history/bundle/protected Save/fresh shipping/byte Undo. All19 actor
helper checks, all19 inspector mounts, Mall/Shop role proofs and Harbor original drawings/content/
weather/current-save/flight/bounds suites PASS. Both builds/tsc and173 zero-difference/error raster
rows PASS at source648c38e100b2; all19 actual packaged native Play/Stop pass without warning/error logs.

## Stacks terminal actors

Optional stacks presentation refs select craneOperator and rescuedPassenger. The operator follows
the existing trolley, with authored position/elevation offsets and a matching cab clip; the passenger
follows the existing reefer reveal condition. Unselected actors use ordinary presentation regardless
of their IDs. Shared creation/duplication supplies terminal.clip.<actor>; removal prunes refs.
No separate state or conversation evaluator. Actual forms/native behavior/absence/Save/fresh import/
Undo: check-stacks-artwork-roles.mts (`stacks-actor-role-source-442wyn`). All19 actor/inspector and
actual native Play/Stop checks pass at source6c855527c33d, with173 zero-difference raster rows.
