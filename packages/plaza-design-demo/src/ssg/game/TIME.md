# ACCESS DENIED: time and weather

Decided (Tommi, 2026-10-15): the city runs on a **fast clock**; game logic can be
**time-sensitive** to the minute ("only between 06:00 and 07:00"); **weather is dynamic**, with a
**weather report** you can read. This file is the design; the numbers are first guesses to tune.

## The clock

- **One city clock**, saved: day number and time of day (`day`, `min` 0–1439).
- **Speed:** 1 game hour = 2 real minutes (a day is 48 minutes). One constant, `CLOCK_RATE`.
- **It runs** while you are in a scene, hack vision and the board included (the city doesn't wait
  for you to wire). **It stops** in the menu, the map, talk panels, toys and cutscenes.
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
- **Not yet:** the sky, grade and light (step 2: the sun still sits where each scene drew it);
  the CITY CLOCK noun and schedules; sound.

## Sun, moon, shadows (decided, Tommi 2026-10-15)

- **Every scene faces a real compass direction** (`facing`, degrees: the sea is east). The sun's
  and moon's place on screen comes from where they really are; a sun behind you is not drawn,
  but its light still is. Sunrise ~06:00 over the sea, sunset ~19:30 behind the city. The fixed
  suns painted into scenes (the beach's sunset, the metro skyline's) are replaced.
- **The moon has phases** by the day count.
- **Interiors get the sun through their windows** (shafts whose colour and angle follow the clock).
- **The slatted sun** and **shadows**: options in https://claude.ai/artifact/ (Sun and Shadow
  Drafts); waiting on Tommi's pick.
