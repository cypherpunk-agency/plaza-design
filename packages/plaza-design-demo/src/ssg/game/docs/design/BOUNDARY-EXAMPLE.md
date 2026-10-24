# Compact chunk-boundary example

B1 of [the consolidated roadmap](../../ROADMAP.md). Built on the existing Game, SceneModel,
Circuit movers, registered character/vehicle artwork and renderWorldFrame. No new renderer,
adapter, runtime or scene-specific controller. The normal campaign scenes/artwork are unchanged.

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

This is intentionally current-engine content. The walker remains registered flow artwork, and
the cart still has its existing source-scene owner. It does not establish independent mobile
lifetime after the spawn chunk unloads. That is B2, followed by bounds/order and editor contracts.

## Quick review

1. Watch for about 12 seconds: walker and van cross the seam; the van returns. Is the example
   small and clear enough to judge disappearing, clipping or wrong ordering at a glance?
2. Walk right for about two seconds, then left. Does the seam feel like continuous ground?
3. Watch the sign and foreground post during the crossings. Distinguish intended occlusion from
   artwork vanishing at a chunk edge. Report the object and direction if something looks wrong.
4. In the editor select **overhang**, change **X position**, then Undo/Redo. Select east's
   **foreground-post** to move the occluder. Play the pending scene to inspect the actual result.
   Edit route/timing through the existing Vehicle/Devices controls; no replacement preview exists.

Feedback should concern readability, useful test layout and visible defects. Mechanical checks
belong to agents. B2–B6 acceptance is in the roadmap; this example alone cannot close those steps.

## Source and verification

- `scenes/authored.json`: ordinary composition/scene/gameplay/device entries for the two chunks.
- `world/zone-graph.json`: one normal walk seam; `world/city.json`: developer-place membership.
- `demo/coverage.json`: catalogue membership in Test District; review-stations holds the shortcut.
- `authoring/play-fixtures.json`: boundary start with fixed daytime and no campaign progress.

Focused checks verify source/graph validation, one actual mover-owned cart crossing and returning,
continuous route position, prospective registry and pending Test District scene identity. Existing
review-station checks cover navigation and protected source persistence. Real-browser checks cover
native player crossing/return without exceptions, source selection, typed sign movement, Undo/Redo
and private native Play crossing. Package TypeScript and both builds pass.
