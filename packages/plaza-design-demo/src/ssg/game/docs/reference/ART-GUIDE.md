# ACCESS DENIED: art and readability guide

Working visual and readability principles, so a player understands a scene at a glance.
The art and the game are still being designed together. These are current intentions to
evaluate and revise, not fixed rules that override the user's direction. README.md maps the
other documents; ROADMAP.md tracks implementation status.

## 1. Read the scene in three seconds

A new player should answer, without moving: where am I, where can I go, what
can I use. Test every scene with:

- **Squint test:** blur your eyes (or view it in grayscale). The play layer and
  the things you can use still stand out; the background melts into one mass.
- **Silhouette test:** fill every object black. You can still tell the stall
  from the building behind it, the door from the wall, the player from the crowd.
- **Phone test:** at the smallest scale the game runs, text is still readable
  and nothing important is a single pixel wide.

## 2. Three depth bands

| Band | What | Contrast | Size |
| --- | --- | --- | --- |
| Far | skyline, ships, sky | lowest: dim, desaturated, thin lines | small |
| Middle | building walls behind the street | medium | large, past the top of the view |
| Play | the street, stalls, machines, people, the player | highest: brightest outlines, lit fills | at the player's scale |

Never let a back band compete with the play band: no bright outlines or lively
animation behind the player unless it is a landmark on purpose (the antenna).

**People and vehicles in depth (Tommi, 2026-10-19).** The game is a strict side view: the
player never walks toward or away from the camera. People and vehicles still sit at one of four
named depth bands (`art/core/depth.ts`), chosen with one **Depth** field instead of tuning pixel
size, parallax and dimming by hand:

| Band | People (pixel size) | Vehicles (scale) | Parallax | Dimming | Use |
| --- | --- | --- | --- | --- | --- |
| Far | 2 | ⅔ | 0.55 | 0.55 | across a square or a hall (Mall's far crowd) |
| Back | 2 | ⅔ | 0.9 | 0.5 | just behind the play band (Market's back crowd) |
| Play | 3 | 1 | 1 | 0 | the player's band; everything the player can use |
| Near | 5 | 1⅔ | 1.3 | 0.78 | in front of the play band, a dark silhouette (Market's foreground) |

**One vehicle kit (2026-10-20).** Ground (`vehicles.ts`), air (`air-traffic.ts`), water (`boats.ts`)
and rail (`rail.ts`, `train-car.ts`) vehicles live in `art/vehicles/` and share `kit.ts`: lane motion,
depth-band painting and fleet liveries (stripe, number, QR plate; autonomous fleet cars and craft
carry a roof sensor puck and a status light bar). Scenes draw boats, taxis, vans, chassis, forklifts
and straddle carriers through these kernels rather than their own copies; the port scenes, drawn
below true scale, place them with `PORT_SCALE`.

People change size only in whole pixels, so Far and Back share pixel size 2 and differ in
parallax and darkness. Vehicles scale smoothly but use the same factor, so a back-band bus
matches back-band people. Something the player can use belongs in the play band. "Custom" is
still allowed for special framing (people seen through a window).

## 3. The player is the unit

Measure everything against the player sprite:

- doors about 1.2× the player; a storey 1.6–2×; a counter at waist height;
- a building on the street is far taller than the player and usually leaves the
  top of the view;
- small houses only exist in the far band.

## 4. Separate things from what is behind them

Dark on dark disappears. Every play-band object needs at least one of:

- a **rim**: a 1–2 px outline at least two steps lighter than the background;
- a **lit fill**: its body a step lighter than the wall behind it;
- a **gap**: a strip of darker shadow between it and the wall;
- its **own light**: a lamp, a screen, neon that lights the object and the
  ground under it.

Big shapes first (stall body, awning, counter), detail second.

## 5. Nothing floats

Every sign, screen and line of text hangs on something, and you can see what:

- neon tubes sit on a backing plate, a bracket, a pole or a wall, with a
  visible mount or cable;
- painted or printed text sits on a surface: a window, a board, a sticker, a
  door plaque;
- a light source lights its surroundings: glow on the wall behind a sign,
  reflection in the wet street below.

Jokes belong on real objects ("OPEN 24/7/365.25" is a sticker on the shop door
or a plate under the shop sign, not text in the air).

## 6. Colour has a job

| Colour | Means |
| --- | --- |
| Orange | the world's structure: walls, frames, outlines |
| Cyan | technology you can use: machines, screens, prompts |
| Pink | the hacking layer: schematics, hack vision, things you crafted |
| Green | success, yours (a controlled node), open |
| Red | denied, danger, recording |
| Warm white / paper | text you read, people's faces, paper |

Don't spend cyan or pink on decoration that does nothing; players learn that
those colours mean "this is for you".

## 7. Things you can use look usable

- One consistent tell: a cyan accent (LED, screen edge, handle) and a slow idle
  motion (blink, flicker, steam).
- Leave space around them: no clutter of the same brightness right next to an
  interactable.
- The prompt (`[E] …`) appears above the thing it belongs to, never where it
  could belong to two things; keep interactables at least 40 units apart.

## 8. Light explains the scene

- Every bright surface has a reason: a lamp, a sign, a screen.
- Neon reflects in the wet street directly below it.
- Interiors behind glass are lit; exteriors at night are not, except where a
  light falls.
- **Light follows the city clock** (TIME.md "Light"; `world/light.ts`,
  `art/environment/sky.ts`, `art/atmosphere/lighting.ts`; paths are relative to the game root).
  A scene paints itself as it always did (the night look); the engine adds the hour on top. A
  scene declares, as data on its `SceneDef`:
  - `facing`: the compass direction the view looks (the sea is east, 90). It decides where the
    sun and moon stand in the sky and which way shadows fall. Interiors: where the window looks.
  - `ambient.sky` (and `horizon`, its height over the ground) for the engine's sky; or call
    `drawSky` / `drawPane` yourself. Never paint a fixed sun or a fixed sky colour again; water
    takes `seaCols` and `sunPath`.
  - `lights`: its lamps, lit windows, neon and screens (`SceneLight`: x, h, kind, col, r). They
    glow on the light layer, weak by day and full at night; lamps throw the night's shadows.
    Something that moves adds its light to the supplied frame (`addLight(view, …)`).
  - `casters`: key props that cast a shadow (people, robots and animals do it themselves).
  - `shade`: the buildings between the street and the sun (`back`, `front`, with their gaps).
  - Windows with a room light: ask `windowLit(seed, view.lighting)` (on at dusk, some off after
    midnight). Use the selected frame inputs; painting must not read or install a global light frame.
- Interiors are not graded; they get the outside through their windows (`drawPane`,
  `windowShaft`) and grade what the window shows (`drawGrade(…, true)` inside its clip).

## 9. Text in the world

- At least 7 px at scale 1, short, uppercase for signs, IBM Plex Mono.
- One message per sign. Dry and plain: no puns or jokes in the world's own text (section 10).

## 10. A place is alive (Tommi, 2026-10-15)

Empty scenes read as unfinished. "A bunch of boxes and text labels" is the failure mode.

- **People, real ones.** Every public place has people who belong there, each a distinct
  character: a different sprite, colour, pose and job (vendor, guard, kid, courier, drunk,
  tourist, maintenance drone). No identical silhouettes, no faceless ghosts, no person
  pasted into every window. At least a few move or do something (haggle, sweep, smoke, argue).
- **Some of them talk.** Several people per scene have a line or two, and one has something
  that matters (a rumour, a clue, a favour).
- **The place behaves like what it is.** A mall sells things and has shops you can enter or
  use; a market haggles; a shop has a shopkeeper and a till; a bar serves drinks. Give each
  place at least one thing to *do* that fits it, not only things to read.
- **Variety over repetition.** No row of identical stalls or boxes. Every repeated element gets
  variants (size, colour, damage, what is on it, who stands at it).
- **Screens and signs build the world.** Displays everywhere: ads, Registry notices, credit
  scores, surveillance feeds, departure boards, propaganda, tickers. Let them move (scroll,
  flicker, cycle). Signs say something about how the city works.
- **The world is dry; the people are funny** (Tommi). Signs, ads, notices and labels are
  deadpan and bureaucratic, never punny: "IDENTITY CHECK AHEAD", "QUEUE 4: UNREGISTERED
  PERSONS", "SERVICE DENIED · SCORE BELOW THRESHOLD". The dystopia is in what they plainly say.
  Humour belongs to characters: what people say, their attitude, how they react.
- **Dystopia in the details.** Cameras on poles, ID scanners at doors, a drone checking
  someone's papers, a queue for water, ads that address you by name, a broken thing nobody fixes.
- **The city is always there.** Wherever a window or opening exists, the skyline shows
  through it. Places connect: you should see where you are in the city.
- **Robots of all shapes and sizes live here, and each has a job you can see** (Tommi):
  cleaning, carrying, delivery, security, repair, serving, advertising, assisting. A robot is
  placed where its job makes sense and is mostly busy doing it.
- **Animals can always be interacted with** (Tommi: "people will always want to interact with
  it"). Every cat, dog, bird or pet in a scene answers E: petting, shooing, a reaction line.
- **One surprising detail per scene**, something you notice late: a human touch, not a sign gag.

## 11. UI never covers a consequence (Tommi, 2026-10-15)

UI never covers a consequence: captions high above the action with a leader to the reacting thing,
paced so you can read them, pings for attention, the device's actions in a row at the bottom, the
character speaks only for itself.

- **Everyday actions close their popup at once.** The scene is free when the reaction plays.
- **Captions** (`engine/feedback.ts`): a device's reply is about the thing that *reacted*, not the
  thing you tapped (the plug's "switch on" makes the router answer about the router), in the
  device's dry voice: green worked, red denied, paper otherwise. Effects name who reacted:
  `w.say(line, 'router')`. The terminal (the phone's HUD line) keeps the full history.
- **The caption lane** (Tommi, 2026-10-15): captions sit high above the action, in a lane a gap
  over the tallest thing on screen (devices, people's heads, the player), never under the HUD. Each
  is a small box with a thin leader down to the exact thing it describes; the leader bends once
  rather than cross another box. Boxes are measured and spread sideways in the lane (a second row
  when two cannot sit side by side, or the newer one waits), so they never overlap each other, and
  they never cover the player or the player's speech bubble. A thing off the view: its caption pins
  to that edge, with an edge arrow.
- **Pacing: never more than you can read.** At most two captions at once; the rest queue. Each
  stays about 2.6 s plus 60 ms a character, then fades (0.3 s); the next comes in only when its
  space is free (a fading caption still holds its place). A thing that speaks again changes its own
  caption in place (old words out, then the new ones in) instead of stacking. Red lines jump the
  queue; a long queue keeps only the first sentence of its oldest lines. Only the captions are
  paced: the world reacts at its own speed. The numbers are constants at the top of `feedback.ts`.
- **Pings**: an expanding ring where something happened (green, red, cyan), at once, so the eye
  goes there while the caption waits its turn; an arrow at the edge when it happened off the view.
- **The camera nudge** (a test, 2026-10-15): when a device reacts (a green or red line) just off
  the view and near enough to show together with the player, the camera leans that way for about
  1.6 s, gently, then eases back to the player. Walking, a conversation, the deck or a panel cancel
  it; reduced motion has none; each thing's line draws the eye once a visit, and not more often
  than every 5 s. Anything further only gets the edge arrow. (`runtime/game.ts`: `nudgeTo`, `NUDGE_*`.)
- **Popups** (`engine/popup.ts`, `POPUP_PLACEMENT`): the plate ("5B", Tommi 2026-10-15). A thin
  cyan stalk grows straight up from the tapped device (which gets a ring) to a small plate with its
  name (orange on dark) in the caption lane, clear above the player and the scene. Its everyday
  actions (at most three) are cyan chips on the plate's row, joined by short arms, split left and
  right (balanced; all to one side when the other would leave the view); `⌁ jack in` and
  `⌁ hack it` sit above the plate in pink, on a short pink arm. Touch targets at least 44 px. It
  stays put while open; arrows move spatially (left/right along a row, up to hacking, down back).
  An open popup wins the lane: captions step aside for it. Kept for comparison: a row along the
  bottom, a row along the top, and beside the device. Each placement is one function in
  `POPUP_LAYOUTS`, so a new one drops in.
- **The player's character speaks only for itself** (arriving somewhere, a thought), never to
  narrate what a device did.

## 12. Build scenery once, reuse it everywhere (Tommi, 2026-10-15)

The same things show up in more than one place: the Spire and STS-2 in the opening glide and
at the harbor, LINE 0's cars in the glide, the train and the stations, Downtown before and
after you are deleted. A change to one of them must reach every place it appears.

- **Artwork belongs in `art/`, including pieces used once.** Reuse `art/architecture/spire.ts`,
  `art/machinery/crane.ts`, `art/vehicles/train-car.ts` and the other subject libraries. Scenes
  and sequences call the same kernels; do not copy drawing bodies into runtime or controllers.
  Seeded variety in `art/assemblies/construction.ts` and `art/characters/appearance.ts` stays seeded.
- **`art/index.ts` is the typed element registry; `art/catalog.ts` describes the catalog.**
  Expose meaningful props, physical bounds, anchors and validated visual fields. Scene composition
  JSON owns placements and attachments, while scene adapters own gameplay/state bindings. Distinct
  furniture and machines should be selectable pieces; screws and individual pixels need not be.
  Broad light washes/reflections may sit outside physical selection bounds. Viewport-dependent
  geometry uses `BoundsContext` rather than a blind box shared by unrelated pieces.
- **Animation uses the same artwork path.** `art/sequences/` contains the opening and cinematic
  pieces; `story/title/` and `story/cutscenes/` supply prepared actors, timing and handoffs from their
  composition/timeline JSON. Ordinary scene kernels receive time and environment in `View` and
  immutable visual state from the adapter. Animation is not a reason to advance gameplay while
  painting, measuring bounds or seeking in the editor.
- The [local composer](../../authoring/README.md) previews scene and sequence source through their
  shipping renderers. Before replacing a drawing implementation, preserve original pixels across
  the relevant camera, time, environment, state and pass cases recorded in the scene-system plan.
  An editor-visible element or passing build alone is not an appearance-preservation gate.
- **Signs come from the sign kit.** `art/signage/kit.ts` holds the shared plate, neon plate
  (horizontal, vertical, printed; dead letters, test sweep), bare scroll, printed paper sign
  (dark board or official paper with a red header, optional cyan tell) and station nameplate;
  `art/signage/screens.ts` holds the mounted screens (ads, the Registry's slogan screens with REC,
  registry board, score, menu, odds, wanted, lottery, broken), tickers, blades, hanging boards,
  icons, billboards, cameras and taped notes. `art/signage/kit-elements.ts` registers them as
  scene-independent `sign.*` elements (`sign.plate`, `sign.blade`, `sign.screen` with a `kind`,
  `sign.ticker`, `sign.paper`, `sign.hanging`, `sign.icon`, `sign.billboard`, `sign.camera`,
  `sign.taped`, `sign.nameplate`) that any composition can place from the Library; the Signs viewer
  lists them as *Kit*. Scene-specific element ids (`downtown.neon-sign`, `station.screen`,
  `metro.sign`, …) stay and call the same code. To extend the kit, add an option to the shared
  function (never a copy in a scene), expose it as a field on the `sign.*` element, and keep
  `mask` on anything that can sit over Downtown's storey windows. Unique, state-driven signs (the
  departure board, the hackable VERIFY sign's logic, kiosks, corkboards, the skyline's tower
  signs) keep their own kernels but draw their plates and letters with the kit.
- **A scene that changes with the story is one scene with states,** not a copy: Downtown
  before and after is `downtown` with a `before` state from a save flag; the train home and
  P14's train are the same train. The state switches lines, colours and what works, never the
  layout.

### Building kit (2026-10-20)

Building exteriors have one configurable kit in `art/buildings/`, like the character and vehicle kits.
So far it is used only by the editor-only `downtown-next` proposal; shipped scenes keep their own pieces.

- **`building.front`**: a street front at the player's scale (storey 66, ground floor 76 by default).
  Seeded: every field left on `auto` (skin, windows, roof, gear, bays, fire escape, balconies) comes
  from the seed, so a row of fronts varies on its own. Skins `brick`, `concrete`, `tenement`, `panel`,
  `glass`; windows `punched`, `framed` (blinds, Downtown's), `curtained` (curtain, TV, someone at the
  window, the Market's) or `none`; roofs `flat`, `parapet`, `cornice`, `stepped`, `ledge` (a climbable
  annex edge); gear `tank`, `vent`, `dish`, `ac`; bays `door`, `glass` (shopfront with awning), `shutter`,
  `tagged`, `sealed`. **Retrofit density** adds AC units, pipes, cable runs with a junction box, fire
  escapes, balconies with laundry and plants, a screen bolted to the wall, ID scanners by the doors.
  Room lights follow the city clock (`windowLit`) and lit windows and screens join the light layer.
  Anchors: `roof`, `ground`, `fascia`, `storey1`…, `bay0`… (centre of each ground-floor opening, where
  entrances attach), plus `origin`, `top`, `right`, `topCenter`.
- **Signs hide windows**: anything with a `mask` ([left, right, bottom, top] in its own units) attached
  to a front, directly or through other pieces, hides that front's windows there (`art/buildings/masks.ts`,
  `frontMasks`); the scene adapter merges the result into the environment state (the proposal adapter does
  this). `clear` on the front keeps an area free by hand.
- **`building.row`**: buildings at a distance with their own parallax, drawn by the Downtown tower
  generator (`architecture/downtown-towers.ts`) at a small storey from the same skins.
- **`building.attachment`**: one retrofit piece (AC, pipe, fire escape, balcony, screen, scanner, cable run,
  planter, tank, vent, dish) to hang on any anchor, e.g. a custom balcony on `storey3`.
- **Library › Buildings** shows a lineup of skins at true scale beside the player, one front with every
  choice, and rows at three distances.

To extend it, add the name to the list at the top of `art/buildings/front.ts` (or `ATTACHMENTS` in
`elements.ts`), give `shapeOf` its seeded default and draw it in `paintFront`; the editor fields read the
lists. Shared drawing bodies live in `art/buildings/parts.ts`: Downtown's window, bays and trim, the
Market tenement's windows, balconies and shutter, the yard's fire escape, AC unit and wall textures.
Those scenes call the same functions, so a change there reaches them too; check them when you edit a part.

## 13. Before you call a scene done

- [ ] Squint, silhouette and phone tests pass.
- [ ] Every sign and text is mounted on something visible.
- [ ] The player knows where the exits are and what can be used.
- [ ] Colours follow their jobs.
- [ ] Back bands are calmer than the play band.
- [ ] Section 11: nothing you trigger plays under a popup, a caption or the HUD.
- [ ] Section 10: people with variety, something to do that fits the place, live screens, a dystopian detail, a surprise.
