# W1: current content classification

2026-10-25. Read against the shipping SCENES registry, folder sources and scenes/authored.json.
This is a design inventory, not a second runtime registry or a historical fixture. IDs stay unchanged.

Coverage: **42/42** entries classified exactly once: 22 gameplay spaces, 5 transport entries,
10 examples and 5 cinematic entries; 19 folder sources and 23 catalogue sources. The categories
below are audit descriptions, not new editor filters, engine classes or source flags.
Separate editor proposals, the artwork library and inline sequence contents are not SCENES entries.

| Source ID | Source form | Current role | W1 disposition |
| --- | --- | --- | --- |
| `downtown` | folder | Gameplay space | Retain content and existing access; placement/connection changes require an explicit design. |
| `tower` | folder | Example | Retain as an example; no campaign geography implied. |
| `warehouse` | folder | Gameplay space | Retain content and existing access; placement/connection changes require an explicit design. |
| `shop` | folder | Gameplay space | Retain content and existing access; placement/connection changes require an explicit design. |
| `library` | folder | Gameplay space | Retain content and existing access; placement/connection changes require an explicit design. |
| `mall` | folder | Gameplay space | Retain content and existing access; placement/connection changes require an explicit design. |
| `market` | folder | Gameplay space | Retain content and existing access; placement/connection changes require an explicit design. |
| `laundromat` | folder | Gameplay space | Retain content and existing access; placement/connection changes require an explicit design. |
| `stacks` | folder | Gameplay space | Retain content and existing access; placement/connection changes require an explicit design. |
| `galleriaStation` | folder | Gameplay space | Retain content and existing access; placement/connection changes require an explicit design. |
| `harborStation` | folder | Gameplay space | Retain content and existing access; placement/connection changes require an explicit design. |
| `moth` | folder | Gameplay space | Retain content and existing access; placement/connection changes require an explicit design. |
| `harbor` | folder | Gameplay space | Retain content and existing access; placement/connection changes require an explicit design. |
| `sandbox` | folder | Example | Retain as an example; no campaign geography implied. |
| `yard` | folder | Gameplay space | Retain content and existing access; placement/connection changes require an explicit design. |
| `capsule` | folder | Gameplay space | Retain content and existing access; placement/connection changes require an explicit design. |
| `beach` | folder | Gameplay space | Retain content and existing access; placement/connection changes require an explicit design. |
| `metro` | folder | Gameplay space | Retain content and existing access; placement/connection changes require an explicit design. |
| `train` | folder | Transport content | Retain shared vehicle/route ownership. |
| `tower-annex` | catalogue | Example | Retain as an example; no campaign geography implied. |
| `tower-deck` | catalogue | Example | Retain as an example; no campaign geography implied. |
| `harbor-station` | catalogue | Gameplay space | Retain content and existing access; placement/connection changes require an explicit design. |
| `harbor-quay` | catalogue | Gameplay space | Retain content and existing access; placement/connection changes require an explicit design. |
| `harbor-checkout` | catalogue | Gameplay space | Retain content and existing access; placement/connection changes require an explicit design. |
| `harbor-yard` | catalogue | Gameplay space | Retain content and existing access; placement/connection changes require an explicit design. |
| `harbor-shed` | catalogue | Gameplay space | Retain content and existing access; placement/connection changes require an explicit design. |
| `glide-beach` | catalogue | Cinematic content | Retain explicitly as cinematic content; geography pending designer. |
| `glide-downtown-west` | catalogue | Cinematic content | Retain explicitly as cinematic content; geography pending designer. |
| `glide-downtown` | catalogue | Cinematic content | Retain explicitly as cinematic content; geography pending designer. |
| `glide-galleria` | catalogue | Cinematic content | Retain explicitly as cinematic content; geography pending designer. |
| `glide-spire-bay` | catalogue | Cinematic content | Retain explicitly as cinematic content; geography pending designer. |
| `vehicle-lab` | catalogue | Example | Retain as an example; no campaign geography implied. |
| `vehicle-routes` | catalogue | Example | Retain as an example; no campaign geography implied. |
| `line-harbor-1` | catalogue | Transport content | Retain shared vehicle/route ownership. |
| `line-harbor-2` | catalogue | Transport content | Retain shared vehicle/route ownership. |
| `line-harbor-3` | catalogue | Transport content | Retain shared vehicle/route ownership. |
| `line-harbor-4` | catalogue | Transport content | Retain shared vehicle/route ownership. |
| `metro-siding` | catalogue | Gameplay space | Retain content and existing access; placement/connection changes require an explicit design. |
| `boundary-west` | catalogue | Example | Retain as an example; no campaign geography implied. |
| `boundary-east` | catalogue | Example | Retain as an example; no campaign geography implied. |
| `boundary-door` | catalogue | Example | Original access-reader presentation; accesses a named world-state binding. |
| `boundary-door-blue` | catalogue | Example | Alternative access-reader presentation with the same state binding; mounted through ordinary commands. |


## Content decisions that this classification does not make

- All five glide chunks are accounted for: retain their existing artwork and explicitly cinematic
  use for now. None is automatically deleted, declared the canonical gameplay district, or promoted
  into ordinary gameplay residency. Designer input decides later use, distances and landmarks.
- glide-beach and beach are distinct current sources; similarly glide-downtown and downtown.
  Galleria's exterior and Mall's interior may legitimately be different spaces. Names do not imply
  that sources must merge or that a new copy of the same live entity should be created.
- harbor, harborStation and harbor-station are distinct existing sources with different current
  routes and purposes. The new prologue's five Harbor chunks are not interchangeable with the
  older Harbor source merely because their names are similar. Do not silently retarget doors,
  story triggers or metro berths while importing world compositions.
- A transport entry may own a vehicle while its geometry is elsewhere. train is the existing
  Line 0 vehicle owner; harbor-station owns the separate prologue service. They are not one entity
  merely because both are trains. No fleet/timetable redesign is part of W1.
- Example status follows actual purpose/content, not sudoOnly alone. Some level/vehicle examples
  are registered without that flag. Conversely glide sources are currently sudoOnly but remain
  cinematic content, not generic engine tests.
- Gameplay space is not a claim of global adjacency, new region bounds or automatic arrival.
  Existing explicit travel, interiors and separate spaces remain legitimate.

## Existing sequence contents

| Sequence | Current contents | Disposition |
| --- | --- | --- |
| title | Referenced world chunks and shared coast artwork | Launch-coast presentation retained; W5 rebuilds its lifecycle. |
| glide | Referenced world chunks and shared coast artwork | W5 rebuilds direction/lifecycle; designer chooses its geography and content. |
| intro | Directly composed cinematic artwork | Review after the opening; no mandatory live-world migration. |
| act2 | Directly composed cinematic artwork | Review after the opening; no mandatory live-world migration. |
| taxi | Directly composed travel picture | Review after the opening; keep explicit travel semantics unless deliberately changed. |

W1 changes no geography, source IDs, artistic seeds, timer rules, saves or gameplay behavior.
See WORLD-COMPOSITION-CONTRACT.md for the proposed format and source-backed boundary example.
