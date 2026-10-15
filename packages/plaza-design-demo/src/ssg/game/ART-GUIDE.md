# ACCESS DENIED: art and readability guide

How the game should look, so a player understands a scene at a glance. Every
scene, prop and sign follows these rules. When a rule and a cool idea collide,
the rule wins unless the idea is the point of the scene.

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
| Green | success, freed, open |
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

## 11. Before you call a scene done

- [ ] Squint, silhouette and phone tests pass.
- [ ] Every sign and text is mounted on something visible.
- [ ] The player knows where the exits are and what can be used.
- [ ] Colours follow their jobs.
- [ ] Back bands are calmer than the play band.
- [ ] Section 10: people with variety, something to do that fits the place, live screens, a dystopian detail, a surprise.
