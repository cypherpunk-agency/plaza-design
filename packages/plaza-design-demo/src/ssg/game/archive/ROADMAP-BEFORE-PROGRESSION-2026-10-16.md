# Archived roadmap before progression consolidation

Historical implementation and design record. Not the active build order. See [current roadmap](../ROADMAP.md) and [progression concept](../docs/design/PROGRESSION-CONCEPT.md). Relative references in the preserved text refer to the parent game directory.

# ACCESS DENIED: roadmap

> New design direction (2026-10-16): [PROGRESSION-CONCEPT.md](../docs/design/PROGRESSION-CONCEPT.md). The harbor night-shift prologue and Downtown-centred Act I are not implemented. The opening and act sequences below record the previous iteration; their dated decisions do not override the newer concept.

Working status and proposed sequencing, not a fixed plan. Everything is still being designed
together; implemented does not mean final. Historical decisions and dated notes below remain
context for revision. See README.md for the documentation map.

One list for the story levels (LEVELS.md, PUZZLES.md, STORY.md) and the new places
(SCENES.md). Story first: Act I has priority, and the places come in when the story or the
city needs them. Built places are marked ✓.

The current city structure is city → district → place → scene (CITY.md). The map redesign is
implemented; new places can be placed in their districts. Both structure and map can evolve.

## Current reliability work (2026-10-16)

- Pause menu, city/net maps, title/cutscenes and leaving the game hold puzzle scene time and
  delayed actions together; wall-clock lockouts still expire.
- NET blocks movement and city time. Continue restores the autosave's scene, with a fallback
  for older saves; it does not restore exact player coordinates or the train's timestamp.
- Documentation and game agent guidance distinguish current implementation from proposals.
- Playthrough scope and regression-suite/CI work await discussion with Tommi. No playthrough
  is implied by these fixes or by a successful build.

## Now: the engine and the screen

1. Popup feedback: everyday actions close the popup; captions in a lane with a leader line and a
   paced queue; pings; max 3 everyday actions; the popup as a plate on a line up from the thing
   (5B, engine/popup.ts). ✓
2. One kind of place, called **scene**: every place is a scene (`SceneDef`, scenes/index.ts),
   hosted one way on the engine (engine/). ✓ (The people kit is now the **character kit**,
   characters.ts: done.)
3. The camera nudge (test): when something reacts off-screen, the view leans toward it, or an
   edge ping points there. ✓
4. A tone pass over older content (the world is dry, the characters have the humour), and the
   small known issues. ✓
- The **sandbox** (sudo only): REGISTRY QA BAY 3, one bench per engine feature, for testing
   and showing the engine off outside the story (GAME-DATA.md, **Sandbox**). ✓ Open: add a bench
   when the engine learns something new (the items agent's data format, the lighting pass).

## Then: the city

5. The city in code (districts → places → scenes, CITY.md: city.ts `DISTRICTS`, `PLACES`,
   `SCENE_PLACE`) ✓, then the map redesign as a vertical cross-section with two zoom levels ✓
   (citymap.ts), revealed as you travel (the Spire a mystery at first) ✓. Open: the district
   crop on a landscape phone, whether TAB opens your own district.

## The opening: intro and tutorial (decided, Tommi 2026-10-15)

The game opens on the night you are deleted. Exposition by showing: the city works for you
once, then stops.

1. **The glide (title + intro).** Launching the game shows a sunrise over the sea (retrowave
   palms, water, parallax); the main menu appears over it. NEW GAME: the menu fades and the same
   shot starts moving, no cut, no flicker, not skippable. The camera glides west: beach → harbor
   (STS-2, the stacks) → the Spire's foot as a nameless silhouette → the Galleria → Downtown's
   towers swallowing the sun → it catches LINE 0 diving into its tunnel. CONTINUE / LOAD: a cut
   straight into the save.
2. **The train home (teach walking, talking).** Dawn, the end of your night shift as a courier.
   Passengers, news, ads. Nothing else to do. Get off at Downtown. ✓
3. **Downtown, before (the full working street).** The turnstile hesitates ("verifying… ok"),
   the till takes your key, doors open, CONCIERGE greets you by name. Scenes take a `before`
   state from a save flag. ✓
4. **The flat, the breather (teach everyday actions).** Kettle, blinds, Pixel. You sleep. ✓
5. **Morning: deleted.** The door says "rent: pending"; everyday actions don't help. Moth's
   message brings `uplink.so`: hacking unlocks as the first quest. Then Capsule 7B's puzzles. ✓

**Title beach (Tommi, 2026-10-15, after the drafts):** water = the mirror sea combined with the
pixel swell; the scene = "the bar at the edge": SALT with string lights, a DJ bot, people
partying, the bonfire; add parasols and sun loungers. When the glide starts west, a pier is the
first transitional piece. **Glide feedback:** the seams between regions break the illusion (the
ground jumps), the cranes cross each other, the Spire reads as a weird T, the Galleria floats,
and there is no life (people, vehicles, robots, flying traffic). Redesign: one continuous coast
(drafts: https://claude.ai/artifact/Jm78v7Z47o92QYtkx5CHmt; title beach: https://claude.ai/artifact/5ZyckEFhebVnW87KWp5DPg).

**Glide, second pass (Tommi, 2026-10-15, after playing it): built.** About 78 s now (was 54),
calmer and stretched out ("easy, but also kind of stressful"). Beats (sudo time control, keys 1–9):
BEACH 0 · PIER 10.4 · INLET 17.1 · HARBOR 27.3 · SPIRE 44.4 · GALLERIA 54.8 · DOWNTOWN 61.5 ·
LINE 0 62.4 · UNDER 73.0 (`title/path.ts` holds the map and the camera).
- Leisure and industry never touch: the beach ends at rocks; an INLET (footbridge, the breakwater's
  light) and the port's fenced BUFFER (double fence, signs, cameras, floodlight, the staff gate) come
  before the quay. The pier got planks, bracing, benches, a kiosk (BAIT · ICE · TEA), its lantern.
- Ships lie behind the quay; far boats are kept clear of the harbor (never in front of a crane).
- The Spire: bigger, its docking decks, corporate shuttles coming and going, a Registry patrol on its
  loop; the camera eases off over a quiet bay bridge (no pylons mid-span, no other lanes near it).
- The sky's kinds (sets/air-traffic.ts, `title/air.ts`): pods, sky taxis (one landing on the public
  pad by the Galleria), Registry patrols on fixed loops, the delivery-drone stream from LOGISTICS
  HUB 3, corporate shuttles, a slow cargo hauler, a medevac, a dropship with two escorts, the blimp.
- One road from the port's TRUCK GATE west: trucks out of the gate, cars and bus 7 from Downtown's
  side streets, denser toward the city (`title/traffic.ts`); nothing drives on the pier or the quay.
- One scale (the player 1.8 m): vehicles, boxes (`BOX40`), the cranes (1.7× their scene frames), the
  ship, the 20 m LINE 0 cars (`drawMetroCar`: a warm inside, seated and standing riders, empty seats,
  reflections). The platform scenes keep their own car (`drawTrainCar`).
- LINE 0 has its own way: the viaduct from the Galleria's station (people waiting, DOWNTOWN 2 MIN),
  under THE RING (sets/ring-highway.ts: columns, lamps, gantry, its own traffic), never across the
  road. The train comes out of a portal in a glass tower (the canyon line from the harbor), overtakes
  the camera, runs down its ramp and dives under the street.
- The ending: the camera follows it down into a cutaway of the ground (sets/cutaway.ts: asphalt,
  pipes, piles, LINE 0's lit bore with the same train in it), then lower, a glimpse of the Undercity:
  a flooded canal under a brick vault, a boat with a lantern, someone in it. Then the dark; the
  handover to the train home is unchanged, the glide stays a function of time, reduced motion works.
- Towers (sets/downtown-towers.ts): every one different (skins, setbacks, crowns, roof gear, grime)
  and signs of six kinds (plate, neon blade, stacked letters, ticker, holo ad, rooftop billboard),
  flickering, dead letters, their colour in the wet street. Four skyline rows behind Downtown,
  thickening toward the tunnel.
Open: the length (78 s, not skippable); the ride home still starts "from the harbor's closed stop"
(the glide shows it coming out of the canyon line's tower, which agrees); whether the platforms
should take `drawMetroCar`'s inside.

Guidance: the scene leads (one way on, people facing it, signs), the GOAL line, and an **idle
ping** on the next goal target after ~20 s standing still, in the opening scenes only for now. ✓

Built (2026-10-15): parts 2–5 and the idle ping, as states of the existing scenes (train,
Downtown's platform with its new exit turnstile, Downtown, Capsule 7B), driven by save flags
(`opening:home` → `:street` → `:flat` → `:slept` → `:uplink` → `:jacked`); everything per state
is data in `opening.ts`. Hacking is locked until `uplink.so`. NEW GAME now plays the glide
before handing over to the train; sudo LEVELS has OPENING · TRAIN HOME and
OPENING · MORNING, DELETED. Open: CONCIERGE greets you without a name (the courier has none
yet; the handle comes from the fixer after you are deleted).

## Act I: where is Moth?

| # | Level | Puzzle | Place (district) | Status |
| --- | --- | --- | --- | --- |
| 1 | Capsule 7B | P01–P03 | your flat (Downtown) | ✓ |
| 1b | The library | P16 (scan.so, the NET button) | the public library (Downtown) | ✓ |
| 2 | Downtown I–III | handle, till, 0x2F, relay, the market gate (P12) | the street (Downtown) | ✓ |
| 3 | The back yard | the parcel | the fixer's yard (Downtown) | ✓ |
| 4 | Moth's place | P09, P10 | flat 4C (Downtown) | ✓ |
| 5 | Washer 3 | P13 | the laundromat (Neon Market) | ✓ |
| 6 | The stop that isn't on the map | P14 | the metro line (TRAIN-0, the old siding) | ✓ |
| 7 | **NRLU 404 0451** (Act I finale) | P15 | the harbor stacks, STS-2, and the **warehouse** (Harbor & Shore) | ✓ |

**The net (NET.md, built 2026-10-15):** Act I runs Capsule 7B → the library → Downtown's net
puzzles. After the capsule the GOAL line points to the library (Moth's message and Capsule 7B's last
line say it still lends scan.so); P16 gives `scan.so`, NET shows in hack vision's bar (N), and LINKs
scan from then on. Networks and reach are net.json's; "freed" nodes are `controlled` nodes now.

**Decided for the rest of Act I (Tommi, 2026-10-15):**
- **The harbor is locked until P14.** LINE 0 passes the harbor station (STATION CLOSED) and the
  sky taxi won't fly there; the only way in is pulling the brake at the siding. After that the
  harbor station (and the taxi) open for good. Downtown ↔ Galleria runs as now.
- **Moth's jacket (P13)** holds the maglev pass (`maglev.pass`) and the right glove. The pass is
  what makes the brake accept your pull: the emergency is registered in Moth's name, the pass
  says you're the friend. Without it: "emergency registered to another passenger."
- **The finale is the stacks:** find NRLU 404 0451 with STS-2's camera, get it lifted past the
  scanner, Moth answers from the reefer. The **warehouse** is built now as a locked place by the
  stacks; its evidence locker is Act II (fragment 3).
- **The ending:** a short talk with Moth at the container (deleted on purpose; the list is split
  into seven root fragments; the Registry knows Moth has it), an ACT II card, Moth joins your
  deck as a contact, and the Spire gets its name on the map (`heard:spire`).

Built (2026-10-15): the stacks are a second scene of the harbor's place (terminal 2, a gate from the pier);
warehouse 4 is its own place with a locked door; the ending plays the ACT II card, puts Moth on your deck
(`contacts`, `msg moth`) and sets `act1:done`, `heard:spire`, `contact:moth`. See PUZZLES.md, P15 "As built".

Optional puzzles that sit on Act I's way: O05 the market billboard cipher, O07 the metro
junction cabinet, O08/O09 the mall lift and the **rooftop garden**, O10 the music box (metro
LOST+FOUND), O11 the wishing fountain. The beach (✓) and its locked boat lead into Act II.

## Act II: seven fragments (an open hub)

The city opens. Each fragment sits with a faction and a place; Moth helps from your deck.

| Fragment | Place (district) | Faction |
| --- | --- | --- |
| 1 | rooftop relay 0x31 (Downtown) ✓ | the Registry |
| 2 | J's penthouse, O04 (Downtown) | the Registry, an insider |
| 3 | the **warehouse**'s evidence locker (Harbor & Shore) | the Tide / the Registry |
| 4 | **club VOID**'s back room (Neon Market) | the Ghosts, Lux |
| 5 | the **Church of the Algorithm** (Galleria) | the Church |
| 6 | NEOBANK's vault of dead accounts (the net) | PENNY |
| 7 | Sorel's office in Plaza Central (the Spire) | Plaza Holdings |

Places that open with Act II: **the canals** and the **sewer market** (the Undercity, the Ghosts'
home), Moth's boat at the beach (inside), the **bridge** (Harbor ↔ the Spire), the **sky-taxi
depot** and the **dropship** (travel to the Spire), the **ripperdoc clinic** and the
**arcade/karaoke** (Neon Market), the **billboard catwalk** (Downtown's roofs), the **flooded
server basement** (the Undercity).

## Act III: the antenna

The **Registry office** (a bureaucracy maze, the watchdog's home), Plaza Holdings HQ floor by
floor, the antenna, and the server room where you were revoked: `> free` or `> take` (and the
Daemons' third way).

## Side places, any time they fit

The Fringe (a dead automated factory, the data cemetery, the recycling plant), a capsule hotel,
a food court, a hospital ward, a police checkpoint.
