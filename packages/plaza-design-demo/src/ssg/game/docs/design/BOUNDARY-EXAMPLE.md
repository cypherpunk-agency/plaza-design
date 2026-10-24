# Compact chunk-boundary example

B1–B6 of [the consolidated roadmap](../../ROADMAP.md). Built on the existing Game, SceneModel,
Circuit movers, registered character/vehicle artwork and renderWorldFrame. No new renderer,
adapter, runtime or scene-specific controller. The Harbor commute also uses these contracts; its passengers continue up the Metro stairs.

## Open

Published release:

- [Play the boundary example](https://cypherpunk.agency/?play=boundary-west&sudo).
- [Edit west](https://cypherpunk.agency/editor/#scene=boundary-west).
- [Edit east](https://cypherpunk.agency/editor/#scene=boundary-east).
- [Test District](https://cypherpunk.agency/?demo): choose **Chunk boundary**.

### Local preview

With the current build served on port 64422:

- [Play the boundary example](http://127.0.0.1:64422/index.html?play=boundary-west&sudo&probe).
- [Edit west](http://127.0.0.1:64422/editor/#scene=boundary-west).
- [Edit east](http://127.0.0.1:64422/editor/#scene=boundary-east).
- [Test District](http://127.0.0.1:64422/index.html?demo): choose **Chunk boundary** in its review navigator.

The local links above use port 64422; other servers use the same paths.
In either editor scene, **Show joined scenes** and **Fit joined** show the neighbor; **Play scene**
starts the existing isolated native game with the boundary fixture. The scene selector lists both
under VEHICLE LAB. No campaign journey or long walk is required.

## What is here

Two 320-unit chunks meet at west X=320 / east X=0. The player starts 50 units west of that seam.
One seeded character flow walks east every seven seconds; its authored spawn and sink are visible
so there is no hidden journey to wait through. A single van runs a 12-second round trip through
both chunks on an ordinary Circuit mover and two route legs. The west-owned CROSSING sign
straddles the boundary. The east-owned foreground post should cover moving artwork only where
it actually overlaps it. Floors line up; labels identify each chunk. There are no puzzles/rewards.

The walker is executed by the existing SceneModel people system; the vehicle uses its actual
Circuit mover. Their source model/session can outlive source scenery/UI. Registered mobile artwork
and its attached pieces stay in the common layer stack; switching the active chunk changes neither
identity nor draw order. Static overhangs remain resident for actual visible bounds. Only explicit
clips cut objects; joined background layers retain their chunk coverage and shared backdrops paint once.

## Quick review

1. Watch for about 12 seconds: walker and van cross the seam; the van returns. Is the example
   small and clear enough to judge disappearing, clipping or wrong ordering at a glance?
2. Walk right for about two seconds, then left. Does the seam feel like continuous ground?
3. Watch the sign and foreground post during the crossings. Distinguish intended occlusion from
   artwork vanishing at a chunk edge. Report the object and direction if something looks wrong.
4. In the editor select **overhang**, change **X position**, then Undo/Redo. Select east's
   **foreground-post** to move the occluder. Play the pending scene to inspect the actual result.
   Appearance → Visibility at chunk boundaries adds a numeric clip rectangle (orange selected outline).
   Select crossing-walker → Appearance → People to edit spawn, speed, waypoint chunks and Leave sink.
   Vehicle/Devices still own route geometry and mover timing. Private Play shows Live mobile locations
   from the actual models, including the current chunk and whether source scenery is hosted.

Feedback should concern readability, useful test layout and visible defects. Mechanical checks
belong to agents. B2–B6 acceptance also uses the real Harbor commute, source persistence and approved scene images.

## Source and verification

- `scenes/authored.json`: ordinary composition/scene/gameplay/device entries for the two chunks.
- `world/zone-graph.json`: one normal walk seam; `world/city.json`: developer-place membership.
- `demo/coverage.json`: catalogue membership in Test District; review-stations holds the shortcut.
- `authoring/play-fixtures.json`: boundary start with fixed daytime and no campaign progress.

Focused checks: `boundary-example` verifies actual walker/cart continuity, current checkpoints,
shared layer order/foreground slot, explicit clips and clipped selection, overhang residency,
pending graph rejection, history, bundle round-trip, protected scratch Save/undo and fresh native
compilation. `zone-unload` verifies the real host releases listeners/nodes while the exact model
and session survive detach/reattach, then dispose when irrelevant. `seamless-commute` verifies the
rider across four tunnels, source UI eviction, carried position/reload, alighting and passengers
climbing the Metro stairs into Downtown. `one-render-path` prohibits alternative frame renderers.

Isolated browser checks exercise player crossing/return, Test District navigation, typed clip and
people-route controls, pending native Play and actual detached Metro core pause/resume. Approved
scene pixels and opening seek/pause/resize comparisons cover visual preservation; expectations
are not regenerated for this work. The live links show the published release; local links use the running checkout preview.
