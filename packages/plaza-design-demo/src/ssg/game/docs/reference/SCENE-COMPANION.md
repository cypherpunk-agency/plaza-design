# Scene companion authoring

The companion itself (look, speaker, default unlock flag, modes, popup avoidance, greeting, follow tuning, default pet recipe) is the document `engine/gameplay/companion.json`; the game loop holds no companion literals. This page covers the per-scene policy.

All 19 native scenes declare `scene.json` companion policy: Capsule is home, eight scenes permit following, and ten are off. The source manifest compiler projects this into the existing native `SceneDef.pixel`/`perch` API and resolved companion inputs. Scene factories no longer duplicate the policy or Capsule perch mapping. Runtime `WARM` is removed.

`companion.mode` is home/along/off. Along mode reads its configured saved unlock flag (`pixel` in the original scenes); home mode remains visible without that flag. Warm resting places and home perches bind existing composition instances/anchors plus offsets through the shared manifest point resolver. Their rest modes are sleep/sun/sit. Home mapping reads one existing native string state and falls back to its declared default perch for unknown values. It adds no companion puzzle state. Capsule rules continue owning the warmth preference in `pixelAt`; rebind the controller and companion home-state references together if that state identity changes.

The six original warm points match exactly: Downtown (754,30)/(330,70), Yard (200,14)/(724,24), Moth (402,50), Beach (466,44). They derive from the noodle stall, device box, spool table, dumpster, tank and jukebox placements. Capsule's three original perch markers can be rebound and deleted; no required-marker fallback remains. Source-derived Capsule compatibility exports remain views of the same declaration.

Pet interaction contains a prompt and conversation references for sleep recurrence, sun, movement and idle recurrence. All eight original responses live once in `engine/gameplay/companion-gameplay.json`, an ordinary shared GameplayDefinition. The native Companion retains its purr effect, pose selection and local recurrence index; it selects a graph ID. The game opens that graph through the existing ConversationSession/GameplaySession and uses its authored speaker/pages/completion, or the existing panel for choices. No separate dialogue pages schema or persisted pet cursor exists. Scene-local graphs can be referenced as well. Shared graph identities cannot collide with scene-owned identities; shared libraries cannot own scene-specific native bindings.

Scene editor Companion controls expose mode, unlock flag, home state/default, perch CRUD/anchors/offsets/rest, pet enablement/prompt and graph recurrence lists. Shared conversation content uses the ordinary gameplay editor. Whole prospective registry validation checks references against the edited shared library and local graphs. Removing referenced geometry, state or conversation content fails atomically. Older editor scene sources omitting the entire companion section inherit the registered canonical source policy; explicit off/empty configuration is honored. Player saves need no new fields.

Movement, hopping, stretching, follow distance, random naps, purr timing and frame units remain native and unchanged. Arrival resets placement/motion/nap state as before; the local pet recurrence index is not reset by placement and is not saved. Reload creates a fresh companion. Source edits do not redefine these lifecycle rules.

Verification:

These scoped checks do not claim all specialized controllers or the final all-game browser/raster gates complete.
