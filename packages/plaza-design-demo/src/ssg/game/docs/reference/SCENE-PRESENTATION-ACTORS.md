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
