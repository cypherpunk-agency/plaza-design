# Existing-game content acceptance

2026-10-20. **G8 PASS**. Inspected implementation source:
`sha256:84a9e3b52d0540a2f4ca3a0dffe322b8e425da843b08f05feaada2bbce33c2fc`.
This identifies the verified code/data before the acceptance-only matrix update below.
G9 controller/network contracts, G10 complete authoring and G12 preservation retain their own gates.

## Corpus and source ownership

The exact19 native IDs are capsule, downtown, library, yard, moth, beach, harbor, stacks,
warehouse, market, laundromat, shop, mall, metro, galleriaStation, harborStation, train,
sandbox and harborShift. All19 have composition, scene, gameplay and device source documents.
`authoring/device-document-ids.ts` maps their physical IDs, including harbor-shift and Sandbox.
Shared city, transport, opening, network and cinematic documents have separate G11 evidence.
Controllers live in the applicable device/composition/transport source; a scene without an
independent simulator uses the common actors/device engines rather than an invented controller.

The19 scene factories compile ordinary uses/readables/rests/exits through
`engine/gameplay/manifest-content-compiler.ts` and `scene-document.ts`. Actor recipes and their
appearance, motion and dialogue bindings come from `actors.ts`, `actor-content.ts` and the shared
conversation compiler. Intro/touch lines, objectives and clock rules read scene documents.
Declared native targets use `native-targets.ts` and existing engine conditions/actions; their
placement/reset capabilities are explicit registered primitives. Art and continuous simulation
remain code implementations, not competing ordinary-content evaluators.

The factory review found and removed Downtown's last `hideDevice` callback. Gate proximity now
uses `DeviceData.targetQuery` and the shared `downtown.gateTarget` query. This affects only E
prompts: world spots, hack/board availability and pointer access remain unchanged. Sandbox's
station-card display names retain a deterministic presentation adapter over authored station
number/title; an explicitly edited readable name takes precedence. Its ordinary interactions,
conditions and effects execute the shared compiler and command engine.

Registered SceneRules were reconciled separately:49 callables across19 scenes, zero ordinary
gaps. Train's wording selectors and Sandbox night are shared queries; native effects retain
physical observations, simulation and presentation. See ORDINARY-CONTROLLER-CONSOLIDATION.md.
This bounded callable inventory alone would not establish all-scene content acceptance.

## Verification

| Requirement | Actual observed evidence |
| --- | --- |
| All19 pending ordinary-content changes | `check-scene-batch.mts`, `.scene-system/scene-batch-check/run-Z18G1h/evidence.json`: add and rebind uses/readables/rests/exits in every scene; actual compiled use refuses without permission and grants exactly3 tokens/flag with permission; remove and Undo all added entities |
| Source transactions reach native definitions | Same check:38-document portable import, grouped Undo/Redo, invalid-edit/Save atomic rejection, protected Save/reload, fresh shipping JSON imports executing all19 native compiled uses, exact-byte transaction Undo |
| Actor content remains editable | `check-actor-entities.mts`, `.scene-system/actor-entities/run-52fMfP/evidence.json`: all19 actor create/duplicate/remove/attach/detach/dialogue/identity, dangling-reference rejection, history/bundle/protected Save/native reload/byte Undo |
| Layer integration | Actor creation now selects playfield in layered compositions; duplication retains the source layer. Current actor test and packaged app-6KSYTFGG.js Library creation/visible layer selection/Undo pass. Existing artwork is unchanged; `check-scene-layers.mts` retains five Library paint comparisons |
| Source device availability | `check-general-device-sources.mts`: all19 support added artwork-bound ordinary devices and real engine reads; no per-scene TypeScript registration required for ordinary catalogue devices |
| Former native prompt rule | `check-device-presence.mts`, `.scene-system/device-presence-WQgckx`: actual Game target list matches the untouched original callback for end false/true, unchanged world geometry and pointer access, typed query rebinding/deletion, pending/bundle/protected Save/fresh shipping/byte Undo; disposed provider fails closed |
| Actual integrated control | Packaged app-E2EL6CNE.js gate interaction-target selector accepts removal and Undo restores downtown.gateTarget; no alerts or warnings/errors |
| Exact source corpus | `check-migration-progress.mts`:19/19 scene documents,58 actor/17 bot bindings, zero legacy conversation rows; G3 separately owns full conversation acceptance |
| Native callable boundary | `check-controller-inventory.mts`, `.scene-system/controller-inventory-O8JiW9`:19 resolved rule surfaces,49 callables, zero ordinary gaps |
| Integration | Package TypeScript and both builds pass; homepage packages98 documents/129 source references. The last helper-only actor fix was followed by TypeScript, layer/actor checks and a fresh homepage build |

The matrix marks only `content` PASS for this gate. Device/controller, Layout/Logic/Wiring/Play,
save/persistence, raster/outcome and final cleanup columns retain their independent requirements.
This G8 signoff does not sign G4/G7/G9/G10/G12/G13; current gate status lives in the execution
ledger. No campaign playthrough or new story/remote mechanics are claimed.
