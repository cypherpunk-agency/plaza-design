# ACCESS DENIED: time and weather

> The [progression concept](../design/PROGRESSION-CONCEPT.md) (2026-10-16) extends the proposed opening from a harbor shift at dusk through night, dawn travel and morning deletion. Existing opening timestamps below describe current code, not fixed timing for that redesign.

Working design (Tommi, from 2026-10-15): the city runs on a **fast clock**; game logic can be
**time-sensitive** to the minute ("only between 06:00 and 07:00"); **weather is dynamic**, with a
**weather report** you can read. This file is the design; the numbers are first guesses to tune.

All of this remains open to redesign. The "Built" sections describe the current iteration;
other sections include proposals. README.md maps the documentation; ROADMAP.md tracks status.

## The clock

- **One city clock**, saved: day number and time of day (`day`, `min` 0–1439).
- **Speed:** 1 game hour = 2 real minutes (a day is 48 minutes). One constant, `CLOCK_RATE`.
- **It runs** while you are in a scene, hack vision and the board included (the city doesn't wait
  for you to wire). **It stops** in the menu, city/net maps, talk panels, toys and cutscenes.
- **Puzzle scene time** also stops in the menu, city/net maps, title/cutscenes and when leaving
  the game: clocks, watchdogs and delayed signals/actions resume with their remaining time.
  Lockout deadlines use wall time, so those still expire while paused or away.
- **Travel costs time:** a metro ride is the ride; quick travel adds a fixed hop (15 min); the
  sky taxi 10 min.
- **Waiting:** a bench, a bar stool or your bed offers "wait until…" (next hour, dusk, night,
  morning). Sleeping is the long one. Nobody has to sit through 40 real minutes for night.
- **Scripted time:** a story beat can pin the clock (the opening: 05:41 → 06:04 → sleep →
  09:40) and release it after. While pinned it doesn't run.
- **The footer** shows game time in game mode (now: real UTC).

## Time-sensitive logic

Anything in a scene's data can carry a time window:

```json
{ "when": { "from": "06:00", "to": "07:00" } }
{ "when": { "from": "22:00", "to": "04:00", "days": ["odd"] } }
```

- On **people** (where they stand, whether they're there), **lines** (what they say now),
  **exits** (the shop's door), **verbs** (the till only takes cash before 08:00), **goals** and
  **story beats** ("meet Lux at VOID after 23:00").
- **The city clock as a noun:** a CITY CLOCK device in hack vision with events at the hour
  (`clock:06:00`, `clock:hour`), so a cable can fire at a time. The existing CLOCK nouns stay for
  device-local rhythms.
- **Schedules** of devices become real: the smart plug's "schedule: night" switches at 22:00, the
  laundromat's opening hours are opening hours.
- **No softlocks:** a puzzle never needs a window you can't get back to: windows repeat daily,
  and there's always a way to wait. A window closing mid-puzzle resets that puzzle step with a
  dry line, never the whole puzzle.

## Light

Light follows the clock continuously, not in phases.

- **Sky:** one shared set (`sets/sky.ts`): the sun's arc (the slatted sun at dawn and dusk), the
  moon, stars, the sky gradient by minute. Every outdoor scene and the map use it.
- **Grade:** a colour grade over the scene by minute (cool night, gold dawn, flat grey noon,
  pink dusk), weather-tinted.
- **Light layer:** windows, neon, screens, lamps and headlights are registered light sources,
  drawn on their own layer: weak at noon, full at night. Windows switch on one by one at dusk
  (seeded), and off again after midnight. Interiors get the outside light through their windows.

## Life

- People, robots and animals have **schedules** (data): the market is busiest at night, the
  laundromat has a morning crowd, dockers work shifts, cats come out at night, gulls by day,
  the fixer's stall opens at 18:00.
- **Lines by time and weather:** a person's lines can carry `when` and `weather`; the fallback is
  the plain line. Writing these is most of the work, and most of the life.

## Weather

- **States:** clear, cloudy, rain, storm, fog, smog (and heat at the beach). Each district has its
  own **climate** (weights): Downtown rains, the harbor fogs, the Galleria is under a roof, the
  Spire is above the weather, the Undercity is always wet.
- **The forecast is real:** the weather is generated **ahead**, seeded by day, so a report can
  tell the truth (mostly: the report is the Registry's, so "showers likely" may be optimistic).
- **The weather report:** on public screens, the radio in shops, the `weather` terminal command,
  and as a dry broadcast ("RAIN 21:00–02:00. THE REGISTRY REMINDS YOU THAT UMBRELLAS ARE
  REGISTERED."). The people comment on it.
- **Weather is logic, too:** rain shorts some devices and makes others work (puddle sensors);
  storms ground drones and stop cranes; fog blinds cameras (a way past one); heat drains
  batteries. Like time windows, a puzzle that needs weather must have a way to wait for it.
- **Looks:** rain, puddles that reflect neon, fog layers, wind on palms and signs, lightning; per
  scene, through shared sets.

## Sudo

The sudo time control gets the city clock: set the time (slider), the speed (stop, 1×, 10×,
60×), the day, and the weather (override per district). So any scene can be looked at at any
hour in any weather.

## What it implies

1. **Every scene needs a lighting pass** (sky, grade, light sources), about 15 scenes; most of it
   comes from sets and kits, done once.
2. **Every person needs schedules and more lines.** The biggest writing job.
3. **The data format grows** (`when`, `weather`, the city clock noun) and the build's check
   learns it.
4. **Act I stays fair:** its puzzles keep working at any hour (or pin the clock while they run).
   Time windows become a tool from Act II on.
5. **Saves** carry the clock, the day and the weather seed.
6. **Sound** follows too: traffic by day, rain, distant bass at night.

## Build order

1. The clock (save, speed, pause rules, travel cost, waiting, pinning), the footer, sudo clock
   controls.
2. The sky set, the grade and the light layer; Downtown and the harbor first.
3. Weather: states, climates, the seeded forecast, the report, rain and fog visuals.
4. `when` / `weather` in the data; the city clock noun; schedules for people and devices.
5. Lines by time and weather across the scenes; the capsule's night schedule on the real clock.

## Built (steps 1 and 3, with first hooks of 4)

- **The clock:** `clock.ts` (`city`, `CLOCK_RATE` 0.5 game min per real second, `TRAVEL` quick
  15 / taxi 10, `WAITS`, `WAIT_CARD`). Saved as `save.clock = { day, min, seed }` (old saves: day 1,
  09:40). It runs in a scene (hack vision and the board too) and stops in the menu, the map, a taxi
  or quick trip, talk (speech bubbles, daemon panels, toys), cutscenes, the title and the glide
  (game.ts `clockRuns`). The opening pins it to `OPENING_TIME` and lets go after uplink.so, from
  09:42 (`pinStory`). The HUD, the header and the footer (`DAY 3 · 21:40`) show it.
- **Waiting:** a scene's `rests` (benches on the three platforms, the market's stool, your bed)
  offer "wait until…" in the popup plate; a fade and a time card, the clock jumps. Not while the
  clock is pinned (the opening's bed is still its own sleep).
- **Weather:** `weather.ts` (climates, 3-hour blocks fading over 40 min, a city-wide front,
  `weatherAt(climate, day, min)`, `forecast`, `reportLines`, `screenLine`, sudo overrides).
  Drawn by `sets/weather.ts` in every scene with `ambient.weather`. Dawn before you are deleted
  stays dry. The `weather` terminal command; the report on Downtown's new ticker, the harbor's
  ferry ticker and every default ticker's WEATHER item.
- **Logic:** `weather`, `hour`, `day` in conditions; `when` time windows on cases, steps and
  dialogue variants (GAME-DATA.md); `when` and `lines` on people.
- **Sudo:** the time control's second mode in a scene (transport.ts `ClockBar`): day, time
  slider, speed (■, 1×, 10×, 60×), weather override per climate or the whole city.
- **Not yet:** the CITY CLOCK noun and schedules; sound. (The sky, grade and light: step 2, below.)

## Sun, moon, shadows (decided, Tommi 2026-10-15)

- **Every scene faces a real compass direction** (`facing`, degrees: the sea is east). The sun's
  and moon's place on screen comes from where they really are; a sun behind you is not drawn,
  but its light still is. Sunrise ~06:00 over the sea, sunset ~19:30 behind the city. The fixed
  suns painted into scenes (the beach's sunset, the metro skyline's) are replaced.
- **The moon has phases** by the day count.
- **Interiors get the sun through their windows** (shafts whose colour and angle follow the clock).
- **The slatted sun: A, slats when low** (drafts: https://claude.ai/artifact/RFj9FzGtGvsq9yfVRXVqSx): a big slatted
  retrowave sun near the horizon; as it climbs the slats close up and it becomes a small pale disc in haze.
- **Shadows: A + C**: long hard cast shadows along the ground (very long at dawn and dusk, short at
  noon; at night short ones away from street lamps), plus building shade: buildings throw bands of
  shade across the street and whoever walks into it goes darker; contact shadows under everything.

## Built (step 2: sky, grade, light; sun, moon, shadows)

- **Sun and moon** (`light.ts`): `sunAt(min)` (rise 06:00 east, set 19:30 west, height `el` −1..0.95,
  azimuth), `moonAt(day, min)` and `moonPhase(day)` (a `MOON_DAYS` = 16-day cycle; day 1 is a waning
  crescent before dawn; it rises later each day, full at sunset). `lightAt(day, min, facing, weather,
  outdoor)` makes the frame's `Light` (daylight, night, golden hour, the weather's cover, direct sun,
  the light layer's strength, the sunlight's colour, the shadow vector); the game sets it once a
  frame (`setLight`), characters and sets read it (`light()`). `windowLit(seed)`: windows on one by
  one 17:30–21:00, about half off 23:00–03:30, early risers 05:30–09:00, a few all day (more under
  a dark sky); cached per game minute.
- **Facing** (`SceneDef.facing`, compass degrees; the sea is east). Downtown 80 (the street runs
  north–south, you look east over the towers toward the bay: the opening's dawn rises behind them);
  harbor, beach, stacks, harborStation 90 (over the water: the sun comes up out of the sea);
  the metro platform 270 (west over the city: the sunset); the market 0 (the sun always behind
  you); warehouse 270; yard 90; the train car 110 (the train home rides into the dawn).
  Interiors, where their windows look: capsule 90 (the morning sun), Moth 270, laundromat 180,
  library 270, shop 270 (the street's east side), mall 180, galleriaStation 180.
- **The sky** (`sets/sky.ts`): gradient night → dawn → day → dusk, greyer under cloud; the twilight
  glow toward the sun; stars; the moon with its phase (a pale ghost by day); the slatted sun A
  (big and slatted near the horizon, slats closing as it climbs, a small pale disc high up); cloud
  softens it, rain and fog swallow it to a bright patch. Every `ambient.sky` scene gets it from the
  engine (horizon: `SceneDef.horizon`); the beach and the train draw it themselves. Replaced: the
  beach's permanent sunset (its tints now follow the clock), the metro skyline's banded sun
  (`skyline.ts` `over`), game.ts `drawSky`/`drawDawn` (the opening's dawn is the clock's: pinned
  05:41 … 06:04). Water takes the sky's colour (`seaCols`) and the sun's (or moon's) path follows
  its screen x (`sunPath`). The cloud deck (sets/weather.ts) goes grey by day.
- **Grade and light layer** (`sets/lighting.ts`): the grade (multiply cool at night, screen lift
  gold at dawn, flat grey at noon, pink at dusk; greyer under cloud, darker in rain) over outdoor
  scenes; then the light layer: `SceneDef.lights` (lamps with a pool on the ground, windows,
  neon, screens, headlights) plus `addLight` for this frame (Downtown's lit windows), drawn
  additively, weak by day, full at night. Downtown, harbor, beach, market, warehouse and the metro
  declare theirs.
- **Shadows A + C**: `castShadow` under every person, robot and animal (characters.ts), the player
  and the street NPCs (game.ts) and `SceneDef.casters`: hard, along the ground, length from the
  sun's height (up to 7× at dawn and dusk), direction from its azimuth against the facing; softer
  under cloud, none in rain; at night short ones away from the nearest lamp; a contact shadow
  always. Shade C: `SceneDef.shade` (`back`: the row behind you, `front`: the facades, each with a
  height and the gaps where light gets through): bands across the floor and up the walls, laid
  over whoever stands in them; warm stripes where the gaps let the sun through; no cast shadow in
  the shade. Downtown (front and back), the market (back), the harbor (back), the warehouse (front).
- **Interiors**: `drawPane` (the window's own sky, sun or moon in it if that way, towers across the
  way with clock windows, a grey veil in weather) and `windowShaft` (the sun's shaft and floor patch,
  its colour and angle from the sun; a soft daylight glow round the window by day; nothing at
  night: the lamps then). Capsule 7B (the shaft when the blinds are up, and the light leaking
  through the slats; the opening's 06:04 is low gold sun), Moth, the laundromat, the library, the
  shop, the mall's skylight, the train's windows; what the windows show takes the grade.
- **Sudo**: everything follows the clock bar live; its status shows the moon's phase.
- **Reduced motion**: nothing in the light moves on its own (the windows switch on the clock).
- **Perf** (844×390 at DPR 3, CPU ×4): a steady 60 fps on Downtown by day and in rain at night;
  ×8: about 30. Glows are cached sprites, shadows one polygon each, the grade two full fills.
- **Not yet**: lights for the stacks, yard and stations; headlights on vehicles (`addLight`
  is there); the title and the glide (their own scripted light; another branch).
