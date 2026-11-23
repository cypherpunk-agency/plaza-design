# ACCESS DENIED: Act I redesign

Agreed with Tommi on 2026-11-22. This file owns the Act I story and beat order. It supersedes
the "Revised Act I route (2026-10-22)" in [PROLOGUE-ACT-I-PLAN.md](./PROLOGUE-ACT-I-PLAN.md),
whose teaching spine, access rules and puzzle dispositions still apply where they do not
contradict this file. Names and lines are placeholders. Nothing here is built yet; the hacking
capability stages it relies on are (`engine/hack-stages.ts`).

Act I is four story chapters in Downtown, played in free-running city time. You lose your
identity, learn to get by, find out you are one of 407 people deleted on purpose, and lose
your body trying to undo it. Hacking appears in 10 of 22 beats; the rest is people, places and
time passing.

## Principles

- **Story and emotion lead.** Each chapter has an emotional shape: loss, adapting, discovery,
  defiance. Lessons attach to needs the player already feels.
- **Hacking is one component**, used where it serves the moment.
- **Time runs freely; the story does not pin it** (see Time).
- **Room to explore.** Each chapter leaves optional places and people open. Optional content
  never hides a required step.
- **Familiar places change meaning**: home, the noodle stall, the street, the metro stairs.
- **The list has faces before it has a name.** You meet other deleted people before you learn
  there is a list.
- **Kept from the earlier plan:** Act I stays in Downtown; every skill is practised before it is
  combined; mistakes are harmless; no deadlock (emergency exits always work).

## Time

- The city clock runs continuously from the intro glide and is never pinned to a quest. The HUD
  shows the weekday with the time.
- Beats trigger on place and story progress, at whatever time the player arrives.
- Time windows only where the fiction needs them: Moth's meeting at the stall (10:00), Kessel's
  room (after dark), the Registry service point (office hours, 08:00 to 18:00), the substation
  break-in (night). Arriving early offers a wait (bench, stool, leaning on a wall) that runs the
  clock to the window.
- Sleep at home skips to morning; invited, never required.
- Arriving late never breaks a beat ("You missed nobody. Moth never came.").
- Lines avoid hard dates; a weekday is fine, "Day 3" is not.

## Cast

| Who | Role in Act I | Arc |
| --- | --- | --- |
| You, a harbor worker | Deleted overnight; wants the life back | From "fix my account" to "this was done to us" |
| Moth | Coworker at receiving (prologue); absent from Chapter 1 on | A presence on the shift, a missed meeting, a trail, a tape, an empty flat. Leads Act II |
| The fixer | Noodle stall; local help | Feeds you without asking; hides you during the sweep. Owes Moth a favour |
| Dr. Kessel | Ripperdoc behind the fixer's kitchen | Fits the implant out of guilt; makes the copy; dies in the sweep |
| DLV-9 | A lost delivery robot with one glove | A stray you help in Chapter 2, a friend by Chapter 3, gives up its body in Chapter 4; something of it survives inside |
| Ines Varga | Another deleted person, at the Registry daily for three weeks to get her daughter's school place back | Hopeful, then on the list, then taken in the sweep |
| CONCIERGE | The building's door daemon | Polite refusal in Chapter 1; lies to the sweep's inspectors for you in Chapter 4 |

Pixel stays at home throughout.

## Prologue setup (built 2026-11-22)

Moth replaces Mara at receiving, slips away mid-shift ("cover for me") and comes back quiet,
then calls on the ride home: "Noodles at ten. I've got something to show you." A photo of you
and Moth is on the fridge. In Chapter 1 Moth never comes; looking back, the mid-shift absence is
the first clue (the list was stolen that night).

## Chapter by chapter

### Chapter 1: Loss

| # | Place | Story and feeling | Hacking |
| --- | --- | --- | --- |
| 1 | Capsule 7B | Wake to refusals (see The refusals) | None |
| 2 | Capsule lobby | CONCIERGE cannot verify you; the emergency exit works and locks behind you; a neighbour still says good morning | None |
| 3 | Downtown street | Scanner arch, turnstile, ads: the street looks through you | None |
| 4 | Noodle stall (10:00) | Moth does not come; the call goes dead; the till refuses you; the fixer feeds you anyway | None |
| 5 | Registry service point (office hours) | Ticket, queue, "Please hold". Meet Ines. An appointment in 90 days | None |
| 6 | Noodle stall | The fixer names Kessel: "Come back after dark" | None |
| 7 | Kessel's room (after dark) | Kessel, guilty and gentle; robot shells on the shelves; the implant; open the privacy shutter | Inspect and one verb |
| 8 | Capsule lobby | Back home through the service latch down the areaway; Pixel is waiting | Same, alone |

**Built 2026-11-22 (M4), alongside the old campaign; `?play=act1`.** Story data is in
`story/opening.json` (flags `act1:*`, phases `ch1-wake` to `ch1-home`, triggers `ch1-ten` and
`ch1-home`, card `wait-ten`); start checkpoint `new-run-act1` (day 2, 08:00); play profile `act1`.
New folder scenes `scenes/block7` (lobby, beats 2 and 8), `scenes/registry` (beat 5) and
`scenes/kessel` (beat 7), each with a README. Each scene's `phases.ch1-*` holds its goals,
refusals and pings. The fixer's Act I talk is in Downtown's `gameplay.json` (`a1-*` nodes).
Kessel's is in Kessel's.

- Time: ten o'clock fires wherever you are. Waiting at the stall uses the `wait-ten` card.
  Office hours and "after dark" are barriers with time conditions, plus a stool to wait on, so
  the clock is never pinned.
- Hacking: the `ch1-shutter` phase onward grants stage `inspect`. The shutter and the service latch
  are first used through their device verbs. Native `reads` turn device state into
  `act1:shutter` and `act1:latch`.
- Pixel stays home: the companion `when` excludes `act1:on`.
- Engine additions (generic):
  - Devices, uses and text heights may sit down to 400 below the street.
  - An exit can stand on an upper level floor (`SceneExit.h`).
  - `piece()` takes a `live` hook, so a level visual field (`opened`, `raised`) changes the
    picture.
- Joined 2026-11-23 (Tommi): the places are one walkable street with Downtown, no cuts
  (`world/zone-graph.json` seams `registry-block7`, `block7-downtown`, `downtown-kessel`):
  - Registry, then Block 7, then Downtown, west to east. Block 7 and the Registry sit west of
    Downtown rather than at the old CAPSULES door: the metro platform and its berthed train lie
    under Downtown's east end, and the train is drawn over anything joined there.
  - Kessel's rooms are under the noodle stall: a ladder down a hatch beside the stall (Downtown
    x 705), then the cellar door (after dark, after the referral) and the stairs down. Kessel's art
    set no longer carries its own copy of the street; the stool to wait on is Downtown's.
  - The prologue walks home the same way: off the metro, west past the stall to Block 7, where
    CONCIERGE welcomes you at the front door (phase `home`, milestone `flat`), then up the
    stairwell to 7/F.
  - Engine fixes this needed (generic): a shut barrier in a building's doorway also holds the
    door (no stepping round it with up or down); a level barrier's lines stand at the barrier;
    loading a save into the scene the game starts "in" (Downtown) now arrives properly, so its
    neighbours join; door prompts name the building, not `zone/building`.
- Open:
  - Downtown's building fronts are hidden behind a grey haze whenever Downtown is drawn as part
    of a joined level. This predates Act I (it shows after the prologue's metro stairs on main);
    not investigated to the end.
  - The lift prompt reads the engine's "OUT OF ORDER".
  - Saves resume at a scene's spawn, not where you stood (Kessel's spawn is this side of the
    cellar door).
  - ~~PHASES is at 15 of its 16-row limit, so M5 must raise it.~~ Raised in M5.

M5 (Chapters 2 and 3), built 2026-11-23 from `?play=act1`:

- Phases: `ch2-freshco`, `ch2-kettle`, `ch2-shop`, `ch2-stall`, `ch2-yard`, `ch3-door`,
  `ch3-moth`, `ch3-library`, `ch3-registry`, `ch3-stall`, `ch3-night`, each opened by one flag
  (`act1:morning` … `act1:plan`). Sleeping in the capsule after Chapter 1 waits to 08:00 and
  opens Chapter 2. `ch3-night` is the end of what is built; its goal says Chapter 4 is not.
- The street now runs walk-up | FRESHCO | Registry | Block 7 | Downtown, west to east (new zones
  `freshco` and `walkup`, seams `walkup-freshco`, `freshco-registry`).
- Beats and their hacking:
  - FRESHCO: the stacker talks you through it; wire the self-checkout's `verify` result into
    the till's `approve` (guided wire). IDENTITY NOT FOUND on the way.
  - Capsule: wire the kettle's ready signal to a new counter lamp (wire, alone).
  - Corner shop: the shelf light's sensor keeps killing the tube; cut its cable, switch the tube
    on, the relay latches it after a few seconds (cut). Lines from the shopkeeper.
  - Downtown: notices, the van, the pigeon; DLV-9 "say hi" (sets `act1:dlv9`). The fixer hands
    over Moth's parcel, which opens the yard.
  - Yard: Moth's box only opens on a signal and its lock trips on the same bell; cut the lock
    cable, wire the ready lamp to the bolt, and the box gives the door phrase (cut and rewire
    alone; the board).
  - Walk-up: the phrase on Door 4C's guard opens Moth's flat. Inside: the tape, the tank lid
    (SPRAT · HATCHED 04.12), the desk drawer guard `sprat0412`, a jack with a known connection to
    `mothcache`. Reading it names the deletion.
  - Library: public terminal 3, known connection to `regmirror`: the list of 407 (you, Moth,
    Ines). Sets the shared world state `act1.inesGone`.
  - Registry: Ines's place in the queue is empty (she is no longer drawn).
  - Noodle stall: the fixer, DLV-9 and Kessel; ends on the plan for the night.
- Engine additions (generic): `furniture.strip-light` takes `lit` and `steady` from the scene;
  `character.resident` takes `present`. Story PHASES limit 48, PHASE_RULES 64, scene phases 48,
  conversation entries 64. Node state from a connection is read by native triggers through
  observation aliases (`nodeConnected`), not through `reads`.
- Engine fix (generic): a joined zone whose only on-screen artwork is its sky no longer counts as
  visible. Every place draws an unclipped sky, so before this every joined place was drawn and
  ticked every frame wherever you stood; adding FRESHCO and the walk-up dropped Block 7 below the
  frame rate the prologue's stair climb needs. Block 7's frame time went from about 43 ms to 22 ms
  in the headless check (main was 33 ms). It does not explain the grey haze over Downtown.
- FRESHCO and the walk-up carry no parallax skyline of their own (the joined street shares one).
- Open (M5):
  - The shop, yard, library and Moth's flat are still separate interiors behind doors, not joined
    to the street.
  - DLV-9 does not visibly follow you after you meet it.
  - Downtown's old door to Moth's building still exists; in Act I it is refused and points west to
    the walk-up.
  - The shop's back room is the shop floor for now.
  - The grey haze over Downtown (above) is still open.

### Chapter 2: Getting by

| # | Place | Story and feeling | Hacking |
| --- | --- | --- | --- |
| 9 | FRESHCO | Food without an identity; the self-checkout accuses you; a shelf-stacker looks away on purpose | Wire (guided) |
| 10 | Capsule 7B | The routine rebuilt by hand: the kettle's ready signal lights the counter lamp | Wire, alone |
| 11 | Shop back room | A faulty sensor kills the shopkeeper's light; fixing it earns a meal and a friend | Cut |
| 12 | Alley by the stall | DLV-9, lost for 41 days, insists it is not lost; you help it; it follows you | Optional |
| 13 | Downtown | Wandering. Notices: "Unregistered persons will be collected." A van passes. Diner, roofs, precinct, billboard pigeon | Optional |
| 14 | Noodle stall | Moth left a parcel with the fixer "for you, if Moth went quiet" | None |
| 15 | Back yard | Cut the wire locking the hatch, wire it to the ready lamp; Moth's note and a door phrase | Cut and rewire alone; the board appears |

### Chapter 3: Looking for Moth

| # | Place | Story and feeling | Hacking |
| --- | --- | --- | --- |
| 16 | Moth's stairwell and flat | The phrase opens the door. Empty. Sprat, Fern, the answering-machine tape. A desk compartment gives one named machine | Clue and lock; known connection |
| 17 | Library | A public terminal: the deletion was deliberate. A list of 407: you, Moth, Ines | Known connection, alone |
| 18 | Registry service point (office hours) | Ines is not in the queue today | None |
| 19 | Noodle stall | With the fixer and DLV-9: fight back, restore the record by force. Kessel admits copies are possible but rarely survived | None |

### Chapter 4: Forcing the door

| # | Place | Story and feeling | Hacking |
| --- | --- | --- | --- |
| 20 | Substation (night) | Cut the block's power | Combination |
| 21 | Dark Registry back office | The record flickers back (the ads greet you by name), then the backup power trips the alarm and it is revoked again, flagged | Combination |
| 22 | Street, Kessel's room | The sweep (below) | None |

## The refusals

The deletion speaks in many voices: "RENT: PENDING" then "RESIDENT: NOT FOUND" at the door;
"KETTLE: no account. no water."; "BLINDS: privacy mode. account: not found."; a plain "ACCESS
DENIED." at the lift; "subject: unknown. please step aside." at the scanner arch; "FARE
ACCOUNT: NONE" at the turnstile (why you cannot leave Downtown); "CUSTOMER UNKNOWN. HAVE WE
MET?" at the till; "UNEXPECTED ITEM: YOU." at FRESHCO; "IDENTITY NOT FOUND. YOU DO NOT EXIST.
PLEASE HOLD." saved for the Registry kiosk; "PAYEE CLOSED" for last night's wages; the street
ads stop greeting you. People contrast with machines: the neighbour, the fixer and the
shelf-stacker still know you.

## Hacking curriculum

| Stage | Guided | Alone | Combined |
| --- | --- | --- | --- |
| `inspect` (one verb) | Kessel's shutter (7) | Service latch (8) | 20, 21 |
| `wire` | Self-checkout (9) | Kettle to lamp (10) | 15, 21 |
| `cut` | Faulty sensor (11) | Yard hatch (15) | 20 |
| `board` | Yard hatch (15) | Optional practice | 20, 21 |
| `guard` (clue and lock) | Moth's door phrase (16) | Desk compartment (16) | 21 |
| `link` (known connection) | Moth's desk (16) | Library terminal (17) | 21 |

Not in Act I: scanning and the net map, TIMER, SWITCH, trace, watchdogs, sequence seals,
jumping, camera scopes, typed terminal commands, paid hints.

## Climax and transfer

1. The break-in works briefly, then fails (beat 21).
2. At dawn the sweep closes the block. Unregistered bodies are city property. Ines is led away.
3. Inspectors check the capsule tower. CONCIERGE lies for you: "No unregistered persons on the
   premises. I would know. I keep forms." It seeds the machines taking sides later.
4. The fixer hides you with Kessel. No shell has a working core. DLV-9 offers its body ("ROUTE
   SET. DESTINATION: YOU.").
5. Kessel **copies** your mind into DLV-9's frame as the sweep breaks in. He dies in the sweep.
   Your human body is taken with the original you still in it.
6. Act II opens in DLV-9's frame, its one glove on your hand.

Set-ups required earlier: robot shells in Kessel's room (7), sweep notices and vans (13),
DLV-9's loyalty (12 onward), Kessel on copies (19).

Act II consequences: the original you is alive in the city's hands; you, the copy, share a
frame with what survives of DLV-9; getting your body back means meeting the person who is also
you; Kessel, who could undo it, is gone. Still open, before Act II: where the city takes the body.

## Reusing old content

The new Act I is built alongside the old campaign and switched over in one go.

| Old piece | New beat | Change |
| --- | --- | --- |
| Capsule devices, CONCIERGE (P01 to P03) | 1, 2, 8, 10 | Refusals instead of the rent-receipt fix |
| Fixer and noodle stall | 4, 6, 14, 19 | He knows you; the naming moment (P04) is dropped |
| Noodle till (P05) | 4, optional | Getting fed as a simple clue and lock; no tokens or paid hints |
| Billboard pigeon | 13, optional | One wire, kept as a joke |
| DLV-9 (from P12) | 12 onward | A character, not a gate puzzle |
| Back yard parcel (P07) | 15 | Cut and rewire only; no camera or TIMER |
| Moth's flat (P09) | 16 | Kept; FRIENDNET and the song seal move to Act II |
| Library (P16) | 17 | Public terminal only; `scan.so` moves to Act II |
| `dt-*` style frames | 2, 5, 7, 9, 16, 20, 21, 22 | Lobby, Registry, Kessel's room, FRESHCO, stairwell, substation, Registry at night, sweep |

Waits for Act II: junction box 0x2F and `legs.so`, rooftop relay 0x31 and fragment 1/7, the
DLV-9 gate puzzle, laundromat, metro brake and siding, old harbor, stacks and Moth's reefer,
beach. Retired at switch-over: the old deletion-morning trigger (Moth's `uplink.so`), the old
END OF TRANSMISSION card and the old Downtown objectives.
