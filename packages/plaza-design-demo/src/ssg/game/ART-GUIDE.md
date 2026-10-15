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
  than every 5 s. Anything further only gets the edge arrow. (`game.ts`: `nudgeTo`, `NUDGE_*`.)
- **Popups** (`engine/popup.ts`, `POPUP_PLACEMENT`): a tapped device's actions open as a row along
  the bottom, where the thumbs are; on a phone the row takes the action buttons' place (the walk
  arrows stay). The device gets a ring and a thin connector to the row:
  `[NAME] [action] … [⌁ jack in] [⌁ hack it] [✕]`, at most three everyday actions, touch targets
  at least 44 px. Kept for comparison: a row along the top, and beside the device. Each placement
  is one function in `POPUP_LAYOUTS`, so a new one drops in.
- **The player's character speaks only for itself** (arriving somewhere, a thought), never to
  narrate what a device did.

## 12. Before you call a scene done

- [ ] Squint, silhouette and phone tests pass.
- [ ] Every sign and text is mounted on something visible.
- [ ] The player knows where the exits are and what can be used.
- [ ] Colours follow their jobs.
- [ ] Back bands are calmer than the play band.
- [ ] Section 11: nothing you trigger plays under a popup, a caption or the HUD.
- [ ] Section 10: people with variety, something to do that fits the place, live screens, a dystopian detail, a surprise.
