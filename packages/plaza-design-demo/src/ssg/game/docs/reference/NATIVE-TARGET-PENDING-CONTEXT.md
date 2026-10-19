# Pending native target metadata

The registered Capsule, Beach, Sandbox, Moth and Yard target bindings now validate and edit against the same assembled pending scene used by private Play. Their shipping source documents have not changed.

`NativeTargetValidationContext` describes two dependency stages:

- `structural`: validate JSON shape, stable target identity/order, registered placement anchors, ordered fallbacks, exit references and primitive reset permissions. Source text/state/key foreign references wait for assembly.
- `assembled`: resolve those foreign references against the actual pending SceneData, GameplayDefinition and explicit EngineNetworkContext. A provided network vocabulary replaces the shipping vocabulary. Scene identity must agree with the registered primitive.

`contentContract` forwards this context per call. No global validation context, mutable shipping catalogue, source alias or second evaluator is introduced. Default shipping factories still perform full validation. Pending scene assembly first constructs the registered geometry/controller with structural validation, applies the pending devices once, and then performs the full reference check before returning. The final exit-key validation remains in the assembly path.

The same stages cover registered source descriptors and complete prospective Save validation, pending destination metadata, the actual editor validation callback, Scene inspector edits and native preview adapters. Inspector pickers use assembled state declarations, source text keys, current network keys/programs and registered executable modules/effects/panels. Descriptor validation continues returning a SceneDocument.

Presentation cue output vocabulary is exposed as frozen readonly `content.presentationTargets` and optional readonly `SceneDef.presentationTargets`. Harbor and Beach forward the existing authoritative registered lists. This is primitive output metadata, not a second copy of source cue bindings.

## Verification

- `scripts/scene-system/check-native-target-pending.mts`: all five scenes with newly added shared state, label/response keys and a network key; actual typed Scene inspector callbacks; native preview pending definitions; runtime visibility/grants/replies; invalid state/text/key/anchor/reset rejection; readonly cue metadata.
- `scripts/scene-system/check-native-target-context-save.mts`: the typed outputs across 16 registered documents; portable bundle; protected grouped Save and invalid Save atomicity; exact provided-key vocabulary; source descriptor return shape; fresh saved-JSON shipping imports; exact byte Undo.
- Package `tsc -b` and existing Yard full typed-form regression.

## Follow-up

The subsequent NATIVE-TARGET-CRUD.md slice adds source collection and ordered route/step/action editing and removes the historical target identity/order floor. Registered placement-anchor expansion and reset permission expansion remain engine capabilities. Native simulation/controller behaviour and source defaults are unchanged.
