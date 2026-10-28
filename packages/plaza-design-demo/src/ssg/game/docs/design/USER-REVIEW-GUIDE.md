# Pending user review

This is the review queue for the current world/editor and prologue work. Mechanical acceptance
is recorded in [Prologue and authoring acceptance](./PROLOGUE-AUTHORING-ACCEPTANCE.md).
Agent verification does not count as your approval of the experience. Earlier positive feedback on
purchases, objectives/access, conversations and devices stands; wiring details can wait for a
specific report. Previously approved artwork changes do not need another blanket review.

The items below have no recorded final user acceptance after the latest fixes. Start with 1–4;
5–8 cover the remaining editor workflows. You do not need to repeat source persistence or
validation tests already covered by the focused checks.

## Before starting

Use the current local build at **http://127.0.0.1:64422/editor/**. These links depend on the local
server running; pushing main alone does not update production. Reload once before reviewing.
Download any edits you want to keep before discarding them or changing builds.

Each editor link opens a named starting situation. Use **Play** for the actual game and **Stop**
to return to editing. Private Play uses isolated memory storage, not your normal campaign save.
Use **Full game** in its Run configuration when reviewing campaign settings. Switching a
checkpoint stops the previous private run. Timeline playback previews direction; private Play
is the place to judge interactions and progression.

During private Play, the game fits the preview area and the editing timeline is hidden. Run
configuration, checkpoint controls and diagnostics appear in the right inspector. Stop restores
the paused editing view. Harbor arrival intentionally references glide at second 68; the first-task
and morning-platform checkpoints have no sequence and therefore no editing timeline.

The Play starting-point picker distinguishes **current preview** (selected sequence/time,
or base editing) from **checkpoint start** (its authored sequence/time). Play looks through the
game camera; Workspace is your independent editing view. Both start from checkpoint world state.
The context line makes those values explicit; choosing a sequence does not edit the checkpoint.

Undo each temporary source edit before the next item. Cancel leaves a staged inspector form
unapplied. Do not use repository Save for temporary experiments. Public/static editors offer
downloads; repository Save requires the protected local source service.

## 1. Opening picture and arrival

Open [City glide](http://127.0.0.1:64422/editor/#checkpoint=review-glide).

1. Switch to Camera preview to see the player picture. Play at 1×; inspect the final approach
   around seconds 55–68. Pause/scrub if something looks wrong.
2. Open [Harbor arrival](http://127.0.0.1:64422/editor/#checkpoint=review-arrival), then private Play.
   Move after direction completes. Judge the framing, visibility of your character and train,
   and whether it is clear that control has returned.
3. If you want the entire title/opening context, use
   [Launch coast](http://127.0.0.1:64422/editor/#checkpoint=review-launch) and private Play.

Feedback: Is the landing comfortable? What deserves more time or attention? Are vehicles,
people and landmarks readable? Final districts, landmarks, geography, spacing and pacing remain
open design decisions with your designer. The current route is an integration example.

## 2. Harbor learning and task guidance

Open [First task](http://127.0.0.1:64422/editor/#checkpoint=review-first-task), then private Play.
This starts beside the supervisor; no approach walk is required.

1. Use E to advance the arrival line and talk to the supervisor.
2. Follow the parcel/delivery/return assignment, then the trolley/clamp assignment.
3. Notice when you look for the goal, whom you should talk to, and what the task expects.
   You can stop as soon as you have enough feedback; checkout mechanics were agent-verified.

Feedback: Does each instruction teach one manageable thing? Are prompts, pings, dialogue and
the goal easy to notice without being intrusive? Where do you become confused, bored or rushed?
Please judge the experience rather than repeat pass/fail reward checks.

## 3. Morning commute and Downtown arrival

Open [Morning platform](http://127.0.0.1:64422/editor/#checkpoint=review-world), then private Play.
The shift is already complete and the player starts on the boarding platform.

1. Wait for the service, approach its doors and use the boarding prompt.
2. Ride to Downtown/Metro and use the step-off prompt there.
3. Pass the turnstile and climb to Downtown. Observe the morning narration and the goal
   directing you home to 7B. Continue toward home only if you want to review that pacing too.

Feedback: Are boarding, destination and alighting clear? Does the journey feel continuous and
appropriately paced? Does Downtown establish the next intention? This checkpoint avoids replaying
the shift. Agent browser acceptance reaches Downtown; it does not certify the rest of the campaign.

## 4. Everyday editor feel, selection and animation

Return to [City glide](http://127.0.0.1:64422/editor/#checkpoint=review-glide).

1. In Workspace view, zoom out and select a person, prop, sky group and Camera. Group selection
   is intentional for grouped assets. Check that the compact selection label identifies each one.
2. Toggle Scene borders and Object outlines. Select a chunk and inspect residency information;
   source membership and native Play loading are separate facts.
3. Drag an ordinary movable prop, change facing, move it between layers and Undo. Scrub a numeric
   value by dragging it horizontally; click to type an exact value. Judge drag and release latency.
4. Select a camera/property track and a keyframe. Change its typed value, inspect the preview,
   then Undo. Try the inspector keyframe diamond and previous/next-key controls.
5. Play/pause with Space, step frames with comma/period and jump seconds with Left/Right
   (outside text fields). Home/Pos1 and End go to the start/end. Switch to base editing and back:
   the sequence should resume its previous playhead. Try a playback speed. Workspace navigation should remain independent
   of the animated camera; Camera preview shows the finished shot.
6. Reload after settling on a scene, zoom and timeline time. Check whether the restored editing
   context feels right. This remembers editor preferences, not arbitrary live gameplay history.

Feedback: Can you find what you see? Are the camera, source controls and keyframes understandable?
Which operation still feels slow? Include the object and operation; the FPS readout measures editor
renders, not GPU presentation or edit latency. Full commit validation still has a synchronous pause.

## 5. World construction and constraint recovery

Open [Boundary example](http://127.0.0.1:64422/editor/#composition=boundary-example).

1. Select a chunk border label or a member under Chunks and groups. Change its Member X/Y or
   drag its label. Use the independent display member for an unconstrained move; Undo afterward.
2. Try moving a connected street member. If refused, read the inspector warning and follow
   Select connection / Select containing group, or Shift-drag the connected members together.
   A refused change should never remain as a misleading visual preview.
3. Select the walk connection in the viewport. Inspect its From/To endpoints beside the world.
   A nonzero Y offset can demonstrate a rejected draft; restore it or Cancel.
4. Open Mount chunk / group, browse the picker and Cancel. If you want to try Apply, choose
   an available source, mount it and Undo. Unmount retains its source; deleting source is separate.

Feedback: Can you understand what is connected and how to fix a blocked move? Are mounting,
unmounting and grouping understandable? Does the inspector explain what happened without a modal?
Do not break Harbor's connected geography just to test an independent chunk move.

## 6. Tasks, characters and conversations in context

Open [First task](http://127.0.0.1:64422/editor/#checkpoint=review-first-task).

1. Select `use-boss` → Behaviour → Edit conversation definition. Change the first line,
   run private Play to read it, Stop and Undo.
2. Select the chunk → Scene → first Objective. Change its text; private Play shows the pending
   goal. Stop and Undo. The visible `boss` body separately exposes appearance/actor properties.
3. Browse Library → Conversations, inspect usages and use a context link. Try the same navigation
   from a robot or animal if those are part of your current authoring work.

Feedback: Is it clear whether you are editing appearance, an interaction or shared dialogue?
Can you get from the world to the relevant graph and back without hunting through unrelated screens?
Does the body/interaction-marker separation need a clearer UI connection?

## 7. Transport and starting situations

Open [Morning platform](http://127.0.0.1:64422/editor/#checkpoint=review-world).

1. Select Service → Vehicle. Inspect route/stops and door settings. Try a small valid change,
   then private Play, Stop and Undo. Route editing currently uses typed numeric controls rather
   than a graphical route drawing tool.
2. Select Passengers → Passengers. Try a modest interval change, preview the actual passengers
   in private Play, Stop and Undo.
3. Open Starting state and change the checkpoint's tokens, then private Play. Decide whether
   the relationship between checkpoint, membership, direction and Run configuration is clear.
   Stop and Undo.

Feedback: Can you configure a test situation and understand what it will run? Are the transport
properties named and grouped sensibly? Mechanical rejection, persistence and reconstruction have
focused coverage; you need not deliberately exercise every invalid number.

## 8. Remaining navigation and configuration

In the [Editor](http://127.0.0.1:64422/editor/), inspect these only as relevant to your work:

| Home | Review question |
| --- | --- |
| Library → Storyboard | Can you navigate the opening beats/checkpoints and reach their actual editable context? |
| World data → City map | Are places, district membership, travel and preview conditions understandable together? |
| World data → World variables | Can you find a declaration and its usages, and distinguish defaults from live state? |
| World data → Game settings | Are Launch, Player, Guidance & time, Contacts and Ending grouped sensibly? |
| Library → Story logic / chunk Story phases | Is the distinction between global rules and a chunk's phase behavior clear? |
| Developer tools | Are explicit test overrides separate enough from normal game configuration? |

These are usability reviews of the reorganized tools, not a request to edit every setting.
The network screen remains intentionally retained for later network-authoring work.

## Not ready for acceptance in this batch

- Structured asset properties still needing typed controls: tower roof gear/setbacks/signs,
  skyline rows, shed column/light positions, traffic/air-lane lists and sign/window masks.
  These are known implementation debt, not tasks you should solve through JSON.
- Final opening geography and new story/teaching pacing need design agreement. Revised deletion,
  first hacking lessons and later acts remain future roadmap content, not newly completed gameplay.
- Full-campaign behavior beyond the reviewed Downtown arrival has no new end-to-end acceptance.
- Normal on-foot Continue restores the saved chunk's arrival spawn, not exact walking coordinates.

## Giving feedback

Send one batch using: **item number · object/checkpoint · action · what you saw · what you wanted**.
For animation issues add the timeline second; for performance say whether the delay happens during
dragging, on release or when opening the inspector. A screenshot helps but is not required.
“Good as is” is sufficient for an item. Report new faults if encountered; reproducing mechanics
already covered by automated checks is not your review responsibility.
