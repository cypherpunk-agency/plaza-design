# ACCESS DENIED: prologue and Act I encounter plan

Milestone 1 design deliverable, 2026-10-16. Read with the
[concept](./PROGRESSION-CONCEPT.md) and [roadmap](../../ROADMAP.md).
This is a proposed buildable sequence, not implemented content or a player-tested solution.
Working defaults below make the design concrete; they remain revisable with Tommi.

## Working decisions for this pass

- The player works harbor transport/logistics. The boss guides a small night shift; one
  coworker provides warmth and a recurring personal connection. Names and dialogue are pending.
- The prologue begins at dusk and ends after dawn travel, home routines and rest. Act I
  begins at the first morning denial. Time follows authored beats, not a speed test.
- Deletion removes administrative recognition. The body remains human and acquaintances
  remember the player. The visual representation should support that meaning.
- Home permits emergency egress. Household service and re-entry permissions fail. The
  player can reach help on foot before receiving any hacking capability.
- Kessel has a small Downtown treatment room, reached through the fixer. His existing
  Neon Market clinic can remain a later location; this plan does not move an entire district.
- Kessel's augmentation enables direct local device interaction first. Moth supplies the
  investigative thread, not an immediate unlock of the full hacking interface.
- Act I's required curriculum ends at simple information/access and known connections.
  Scanning, net-map navigation, TIMER, SWITCH, trace and watchdogs move to Act II.
- The local investigation earns a specific departure lead. A harbor return is the working
  finale option; the robot incident is a separate unresolved narrative decision.

## Reading the matrices

Each row is an encounter, not necessarily a new scene. Several rows can share a location,
with a breather or independent activity between them. “Evidence” is an observable player
action we could examine in later testing, not proof that the game has measured understanding.

Only the stated controls are introduced. Previously learned controls remain available.
Story conversation and save/pause access are always available where appropriate. Optional
details never hide a required prerequisite. Failure/recovery and saved consequences are
specified in the companion tables to keep the scene matrices readable.

## Prologue matrix

| Beat / place | Objective and story contribution | New concept / prerequisite | Available actions and presentation | Evidence of understanding |
| --- | --- | --- | --- | --- |
| P0 · glide → harbor | See the city, settle beside the workplace at sundown | Ambient priming only | Cinematic, then a clear handover; no faction/name lesson | No comprehension gate |
| P1 · work bay | Walk to the supervisor; establish hierarchy | Movement; none | Walk, pause, one visible destination cue | Reaches supervisor without repeated direction |
| P2 · supervisor desk | Receive a work tag and first delivery assignment | Talk/interact; P1 | One interaction prompt; short instruction naming visible crate and receiving counter | Starts the task after conversation |
| P3 · bay → counter | Carry a labelled parcel to the coworker | Pick up, carry, give; P2 | Contextual actions on one parcel and recipient; carried item visibly acknowledged | Gives the correct object and notices completion |
| P4 · counter → trolley | Return the coworker's empty transport case to its rack | Independent item practice; P3 | Same verbs, no repeated control lesson; short task request | Completes a changed delivery without a procedural prompt |
| P5 · trolley bay | Release a trolley wheel clamp, then move it to the marked loading spot | Observation and ordinary machine state; P4 | Read clamp indicator, release clamp, push trolley; no puzzle timing | Explains why trolley would not move and sees it stay in the new position |
| P6 · checkout | Return work tag, check out, inspect pay statement | Combine familiar actions; P3–5 | Give tag; use checkout; read optional wage detail | Completes work and identifies the homeward route |
| P7 · platform/train | Take the homeward train and leave at Downtown | Guided travel; P1–6 | Board/exit using familiar interact; destination shown; optional passenger conversation | Selects the named stop without needing network geography |
| P8 · Downtown route | Collect the usual breakfast at the fixer's stall, then go home | Practice orientation and exchange; P7 | Existing movement/interact; ordinary identity authorisation; simple route view if needed | Finds stall and building; recognises the fixer later |
| P9 · Capsule 7B | Make a drink, greet Pixel, then rest | Practice household state and deliberate transition; P5/P8 | Kettle use, optional blinds/Pixel detail, explicit rest action after the short routine | Independently uses home objects; chooses to end the day |

The boss's pressure is delivered through content: an unpaid minute on a statement, an
impersonal productivity notice, an order to prioritise cargo. The tutorial itself waits.
The coworker can offer a short response to the same pressure. Introduce the Registry first
through working badges and transactions; avoid delivering its history in the shift dialogue.

### Prologue access, recovery and persistence

| Beats | Access and recovery | Persistent consequence |
| --- | --- | --- |
| P0–2 | Work bay and supervisor visible; public port exploration is outside the assigned route. Repeat the instruction on request, not on a nag timer | Arrival and assignment stage; resume at a safe position |
| P3–4 | Wrong recipient gives a useful response and returns the item. Required objects cannot be lost or consumed elsewhere | Item ownership and handover completion; no duplicate deliveries/rewards |
| P5 | Clamp has a readable state; ineffective pushing changes nothing. No timed hazard or restart | Clamp/trolley state and completed task |
| P6 | Checkout explains any unfinished task. Fictional pay deductions never depend on real completion speed | Shift completed; pay statement/ordinary balance recorded once |
| P7 | Homebound boarding only; Downtown exit remains available until used. No missed-train penalty or surprise destination choice | Harbor known, Downtown arrival, commute complete |
| P8 | Short route with optional nearby looks. Ordinary identity opens the building; advanced interiors stay outside this episode | Fixer met, service recognition and home arrival |
| P9 | No meal economy or survival requirement. Rest follows the short required routine; optional details remain optional | Familiar household states and prologue completion; deletion begins only after transition |

## Revised Act I route (2026-10-22)

Agreed with Tommi: Act I is about being stripped of identity, wanting it back and learning
hacking to circumvent the obstacles. It shows a different Downtown place at each step and ends
with an emergency transfer into a DLV-9 robot body (see STORY.md, "Decided 2026-10-22").
The teaching spine below is kept; the encounters move to the new places. The matrix after this
section is the earlier version and is to be reworked to this route; its access, recovery and
dependency rules still apply.

| Step | Place (✓ scene exists · ○ new) | What happens | Teaches (from the matrix) |
| --- | --- | --- | --- |
| 1 | Capsule 7B ✓ | The door panel refuses: identity not found | A1 changed circumstance |
| 2 | Capsule lobby ○ | CONCIERGE will not help; the emergency exit works; locked out | A2 recovery through ordinary action |
| 3 | Street and noodle stall ✓ | The fixer remembers you; the till refuses payment; referral to Kessel | A2 |
| 4 | Registry service point ○ | The official route: ticket, queue, "Please hold", an appointment in 90 days | Motive: wanting it back |
| 5 | Kessel's room, behind the fixer's kitchen ○ | The implant; the privacy shutter's `open` | A3 direct hacking |
| 6 | Capsule lobby ○ | Back in through the service latch, `release` | A4 independent practice |
| 7 | FRESHCO supermarket ○ or the corner shop ✓ | Food without identity; the self-checkout accuses you; event → action wire | A5 (and A6 at home) |
| 8 | Shop or supermarket back room ○ | A faulty sensor; cut the wire | A7 |
| 9 | The back yard ✓ | Moth's parcel: cut and rewire | A8 |
| 10 | Moth's stairwell ○ and flat ✓ | The note's phrase opens the door; the desk; a first known connection | A9–A11 |
| 11 | The library ✓ | A public terminal: the deletion was deliberate; there is a list | A12 |
| 12 | The substation ○, then the dark Registry back office ○ | The combination challenge: cut the block's power at the substation, then break into the dark Registry and restore the record by force at the node; the backup power trips the alarm (decided 2026-10-22) | A13 |
| 13 | A Downtown street at night ✓ (sweep variant ○) → Kessel's room ○ | A sweep collects unregistered persons; Kessel's emergency transfer into DLV-9 | Narrative only; no new mechanic |

Optional places that can carry breathers or side errands: the 24h diner, the billboard catwalk
and Downtown roofs, the police precinct. The harbor finale is not part of this route; it may
return as Act I's or the final act's finale. Whether Moth is met in Act I is open.

## Act I matrix (earlier version)

The sequence alternates instruction with independent action and story. Familiar places
change meaning instead of being replaced by new districts at every step.

| Beat / place | Objective and story contribution | New concept / prerequisite | Available verbs and interfaces | Evidence of understanding |
| --- | --- | --- | --- | --- |
| A1 · home | Read the familiar resident-service panel after it refuses the usual account check; discover identity denial | Changed circumstance; P9 | Ordinary use/read only; one clear denial followed by a readable explanation | Connects rejection to identity status rather than broken controls |
| A2 · home → fixer | Leave via emergency egress and ask for help; fixer remembers yesterday | Recovery through ordinary action; A1 | Exit/talk; local route cue; Kessel referral | Reaches help without hacking or payment |
| A3 · Kessel's room | Receive augmentation; open the treatment-room privacy shutter through its exposed actuator | Direct hacking, ACT verb, visible state; A2 | Inspect one device, invoke `open`, close hacking view; no board/LOGIC/NET | Can identify the affected object and predict `open` |
| A4 · home entrance | Restore physical entry using the building's accessible service latch | Independent direct-action practice; A3 | Same inspect/use flow, `release`; no password or wiring yet | Applies the action model to a different object without a step-by-step instruction |
| A5 · shop counter | Help a merchant hear collection requests while working at the back | Event → action wire; A4 | Guided view of collection button event and bell `ring`; draw one wire, press button | Predicts and observes bell ringing after the event |
| A6 · home | Arrange a visible ready signal for the kettle | Independent wiring practice; A5 | Kettle `ready` → counter lamp `on`; same wiring view, no timer tool | Builds and triggers the connection without an endpoint prescription |
| A7 · shop service alcove | Stop a faulty service sensor from repeatedly extinguishing the merchant's work light | Reading/cutting an existing wire; A6 | Inspect source/target, cut; ordinary button can generate the sensor event on demand | Identifies the cause and confirms the unwanted response has stopped |
| A8 · fixer's yard | Retrieve Moth's parcel: stop the misplaced beam signal locking the pickup hatch and route it to its ready lamp | Independent cut/replace; A7 | Known sensor, latch and lamp verbs; small multi-device board introduced for this need | Cuts the harmful connection and builds the useful one; no camera/TIMER requirement |
| A9 · parcel / Moth's doorway | Read Moth's short note and use its explicit access phrase on the local lock | Information → GUARD; A8 | Read, enter/use phrase, open; no cryptogram or guess penalty | Associates the note with this specific lock |
| A10 · Moth's room | Use a nearby labelled service note to open a desk compartment containing a contact endpoint | Independent clue/access practice; A9 | Read another record, unlock compartment; no transformations or multi-fragment crafting | Locates and applies the second clue without being told its value |
| A11 · Moth's desk | Reach a known building message service and read a notice associated with the deletion | LINK and known connection; A10 | Select one named endpoint, connect, read; current connection clearly labelled | Distinguishes the local desk from the connected service |
| A12 · library desk | Independently contact the named public manifest service from a library terminal | Known-connection practice; A11 | Connect to the supplied endpoint, read record; no scanning or access timer | Uses the same connection model from another physical place |
| A13 · Downtown service room | Recover a held dispatch record that identifies where Moth can be reached | Combination only; A8–12 | Clue opens cabinet; cut false sensor→latch close; wire request event→latch open; read record | Solves with taught actions and explains each consequence |
| A14 · fixer / departure point | Compare evidence, arrange a specific journey and decide to follow Moth | Narrative synthesis; A13 | Talk/read/ordinary item handover; grant one clear destination permission | Understands where to go and why |
| A15 · optional harbor finale | Return to the workplace under changed circumstances and reach Moth | Familiar skills in a changed context; A14 | A simplified access encounter, then dialogue; no new security/logic mechanic | Recognises the contrast and uses established skills independently |

The morning denial concerns the resident account and re-entry; the kettle retains a manual
local control for A6. Automated household authorisation need not disable every physical switch.

A3's shutter is a safe treatment-room demonstration, not a reason the player must already
hack to receive treatment. A4 restores physical access only; the Registry record remains
revoked. A6 uses a single readiness event, not a hidden recurring schedule or timing puzzle.
At A8 the player must already know cutting and wiring; the board only makes familiar
relationships visible together. At A13 all triggers can be repeated and the latch remains
open after success. No narrow interval or background watchdog changes the solution.

### Act I access, recovery and persistence

| Beats | Access and recovery | Persistent consequence |
| --- | --- | --- |
| A1–2 | Emergency exit always works. Fixer and clinic are walkable without credentials, currency or hacking. A human explains the next step if the player returns | Deletion state, referral, home entry currently denied |
| A3–4 | Kessel provides a safe replay of the action. Publicly exposed local service actuator is the fiction for the latch; no global Registry override. Wrong action can be reversed | Direct-use capability, demonstration done, physical home entry restored |
| A5–6 | Shop task is offered through the fixer's local introduction. Wrong wire has visible harmless results; endpoints stay usable; delete/retry freely | Wire capability and useful configurations; practice completion |
| A7–8 | Repeat the sensor event on demand; reset only the local task if desired. Parcel cannot disappear. Yard's advanced current rules are absent from this variant | Cut capability, board introduction, parcel and Moth lead acquired once |
| A9–10 | Incorrect phrase gives a relevant response with no lockout. Notes remain readable after use. No optional purchase or puzzle supplies the only clue | Moth's place known, desk access and endpoint information |
| A11–12 | Connect/disconnect freely; endpoint supplied before use. Library public desk is physically accessible and does not require the current P16 puzzle | Known-connection capability; records and visited services remembered |
| A13 | Every required clue is in the room or a retained record. Stable states, repeatable events, local reset and contextual hints; no resource cost | Dispatch evidence recovered; local combination complete |
| A14–15 | Departure permission names destination and method; pre-departure review of the lead is available. A15 depends on selecting the finale variant | Limited travel permission and Moth contact; exact end-of-act/body-transition flags deferred |

## Teaching dependency check

| Concept | Guided introduction | Independent practice | Combination / boundary |
| --- | --- | --- | --- |
| Movement/interact | P1–2 | P4, P8–9 | Everyday travel and morning recovery |
| Carried items | P3 | P4 | P6 checkout; later parcel use |
| State and cause/effect | P5 | P9 household use | A3 turns familiar effects into hackable actions |
| Direct hacking | A3 | A4 | A5 and later tasks |
| Event/action wire | A5 | A6 | A8 after cutting practice |
| Cut existing wire | A7 | A8 | A13 uses already practised cut/replace |
| Clue/access relationship | A9 | A10 | A13 cabinet |
| Known connection | A11 | A12 | Retrieving and interpreting records for A14 |

P1–P9 → A1–A4 → A5–A8 → A9–A12 → A13–A14 is the required learning spine.
Optional activity can occur between these blocks. Completion conditions establish encounter
availability; they do not claim to measure comprehension. If later testing shows a missed
concept, adjust the encounter and feedback before adding more mandatory lessons.

STORE is first experienced as an ordinary readable record; ACT as an action; SENSE as an
event source. Characters such as CONCIERGE can appear early without teaching DAEMON as
a technical category. GUARD and LINK acquire formal meaning in A9 and A11 respectively.
No Act I requirement depends on TIMER, SWITCH, recurring CLOCK, sequence SEAL, LOG or WATCH.
Jumping, camera scopes, code transformations and free-text terminal commands are also outside
this required curriculum. Use ground-level/service access for required Downtown scenes.

## Interface and scene availability

| Stage | Interfaces | Places and travel |
| --- | --- | --- |
| Prologue work | Movement, contextual actions, task reminder, pause/save | Assigned harbor bays; surrounding city remains scenery |
| Commute/home | Same controls; simple home-route view if needed | Homebound train, short Downtown route, home |
| A1–2 | Ordinary actions and local orientation | Home egress, fixer, Kessel; ordinary local services can offer flavour |
| A3–4 | Single-device inspect and invoke | Clinic and home service latch |
| A5–7 | Limited event/action wiring and then cutting | Shop counter/alcove and home practice devices |
| A8 | Small multi-device board | Yard parcel; optional basic practice can reopen locally |
| A9–12 | Clue access and named connections, staged separately | Moth's room, library public desk; no city-wide network browser |
| A13–14 | Previously taught interfaces only | Downtown service room, departure arrangement |
| A15 if chosen | Same capabilities | One authorised trip to the harbor finale; wider districts remain later |

The prologue harbor visit marks it known but does not grant later free return. After deletion,
public interdistrict services reject the revoked identity; the special departure is earned
through a contact. Apply the same permission to stations, taxis, street corridors and quick
travel. In particular, the Galleria mall service corridor cannot bypass the Act I boundary.
Opening a local map does not expose all transport layers, unknown networks or future objectives.

Keep doors meaningful: provide a short in-world reason for unavailable places. Once a local
place is opened, generally keep it available for revisiting. Hide advanced optional puzzle
interfaces until their teaching stage; scenery may foreshadow them. Do not teach by displaying
an overwhelming screen of disabled controls.

## Existing puzzle disposition

These are proposed destinations, not deletions of existing implementation. Preserve the old
route while building the new chapters; switch integration deliberately.

| Existing puzzle / material | Decision for revised sequence |
| --- | --- |
| P01 router schedule | Reuse direct-use and cut-wire ideas in A3–7; defer the full schedule combination |
| P02 concierge/rent | Keep administrative refusal and character; rewrite egress/re-entry dependency. First wire is a simpler visible local relationship |
| P03 kettle/blinds/Pixel | Keep domestic relationships; A6 teaches one wire. Defer the full multi-hop cat/router solution |
| P04 handle | Optional identity expression after meeting the fixer; do not require terminal typing to continue |
| P05 noodle till | Preserve stall and ordinary recognition; reuse a simple clue guard later. Remove token farming/paid hints as teaching prerequisites |
| P06 VERIFY/jump upgrade | Defer riddle transformation, controlled-node reward and jumping. No required roof is gated by an untaught ability in this plan |
| P07 yard parcel | Simplify to A8 cut/replace; keep Moth parcel motivation. Defer camera, TIMER and daemon-permission combination |
| P08 relay/trace | Act II material after separate security and information lessons |
| P09 FRIENDNET/Moth access | Reuse Moth/contact fiction; A9–12 use local clues and explicitly known endpoints. Defer network hopping/scanning |
| P10 song seal | Act II after TIMER, SWITCH and security practice. Keep journal content through a simpler Act I access route |
| P11 bank | Later optional investigation; no Act I prerequisite |
| P12 DLV-9 gate | Keep robot personality/ambient encounter; defer multi-system gate puzzle. It no longer forces entry to Neon Market during Act I |
| P13 laundromat | Act II time/constraint chapter; remove jacket/pass dependency from the Act I route |
| P14 emergency train stop | Act II combination after timing lessons. A14 travel is arranged through a contact, not an untaught brake hack |
| P15 stacks/Moth | Reuse place and meeting for possible A15; remove watchdog/thermal/timing demands from that version. Preserve full machinery challenge for later |
| P16 library | Reuse place and public terminals for A12; defer timer/guard/software-lending combination and scan reward to Act II |
| O01/O02 practice machines | Only offer already taught subsets in Act I; camera scopes and sealed extras later |
| O03–O11 advanced/other-district options | Retain as catalogue; place after their concepts and districts open. Simple flavour can remain without puzzle interfaces |

## Finale boundary and open decisions

Milestone 1 establishes a complete local learning arc through A14 and a constrained A15
candidate. It does not invent a settled cause for the body transfer. Before milestone 6's
ending is implemented, choose between a Downtown finale and the harbor excursion, determine
what Moth reveals, and connect that event causally to Kessel and the incident.

Recommended narrative order: local success → useful evidence/contact → chosen departure or
intervention → consequence leading into Act II. Do not surprise the player with new puzzle
mechanics during the transfer. Establish the existence and limits of transfer technology
before it becomes the rescue. The human body's location, Kessel's possible abduction and
whether the player is transferred or copied require later story decisions.

## Implementation handoff and completion record

Milestone 2 can build P1–P6 now from this plan without resolving the finale. Prototype a
work bay, receiving counter, trolley spot and checkout using existing harbor scenery.
Keep controls consistent with ordinary game interactions. Dialogue wording, names and exact
layout are implementation choices to refine within this encounter structure.

The integration will need distinct story-stage, capability, scene-permission and completed-task
state. Existing opening flags and blanket hacking unlock do not provide this sequence.
Keep required item transactions idempotent and preserve a valid resume point. Decide migration
for existing saves before replacing the main opening; this document introduces no save reset.

Design checks completed for this pass:

- No required hack precedes augmentation; physical egress and clinic access remain available.
- Each required foundational mechanic has an introduction and independent practice before
  the final combination; advanced current puzzles are explicitly reassigned.
- Home, item, clue, travel and currency dependencies have recoverable paths.
- Scene access and map knowledge are distinguished, including the prologue harbor exception.
- The first implementation slice is specified independently of unresolved later-act fiction.

These are desk checks of the design. No playthrough, player test or gameplay implementation
has been performed as part of milestone 1. Review pacing and comprehension with players at
the separately agreed checkpoints in ROADMAP.md.
