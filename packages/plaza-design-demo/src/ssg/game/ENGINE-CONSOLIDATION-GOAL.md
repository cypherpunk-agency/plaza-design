# Autonomous delivery: unified game and full editor coverage

2026-10-18. Parent priority/status owner: [ROADMAP.md](./ROADMAP.md).
Status: COMPLETE2026-10-20. Authorized by the user on2026-10-18.
All G0-G13 and nineteen per-scene rows accepted; see ENGINE-CONSOLIDATION-STATUS.md and
docs/reference/FINAL-INTEGRATION-ACCEPTANCE.md. The requirements below remain the frozen scope.
User correction 2026-10-19: old-save-format compatibility was an agent-added assumption, not a
requested deliverable. Do not build compatibility layers or retain per-scene state adapters to
satisfy that assumption. Use one common runtime state and shared actions. Preserve current game
behavior, visuals and normal current-format persistence; historic/injected save-format support
is not a completion requirement. This correction supersedes older compatibility wording below. The expanded scope below supersedes
the previous three-batch proposal. The user separately authorized pushing a reasonable stable
checkpoint to main and production on2026-10-19. Publication does not imply goal completion.
Existing ENG-01–08 and story M1–M9 keep their identities. Communication is ENG-09.
User decision 2026-10-20: G0 may be accepted through a verified retrospective audit against the
untouched captured baseline. Do not assert that every fixture/producer ledger existed before
migration; retain that timing limitation and the captured-subtree diff scope explicitly. This
supersedes pre-migration chronology wording below. All preservation requirements remain unchanged.


User decision 2026-10-20: retain the upstream `e8cf05f` walk-turn pose as an approved
actor-animation change. The unchanged original raster comparison records one Mall frame with
282 differing pixels (maximum channel delta82); a diagnostic removing only the new turn branch
matches all173 fixtures exactly. Keep both raw reports and the immutable baseline unchanged.
This exception permits that specific newer animation, not unrelated visual differences.

## Goal condition

All 19 existing registered scenes run through one shared scene/content system. Every existing
scene's composition, interactions, conversations, objectives, access conditions, devices/wiring,
controller configuration, transitions and world connections can be edited, saved and played in the
editor. New ordinary scenes can be created and connected without per-scene TypeScript registration.
Specialized mechanics and procedural art remain registered code implementations with typed editable
parameters; opaque adapters that hide ordinary content do not satisfy full authoring coverage.

Preserve world pixels, actor presentation, animation timing, simulation/puzzle outcomes and current gameplay behavior, except the explicitly approved communication overlays, persistent-conversation policy and upstream walk-turn pose recorded above.
Remove replaced implementations after migration. Complete only when G0–G13 all PASS with source-bound
evidence, all 19 scene rows are complete and no mandatory editor hook or legacy content path remains.
A green build, source viewer, JSON dump, registered document or wrapper around an unchanged content
closure does not by itself satisfy migration or editor support. Appeal feedback remains separate.

## Exact corpus and execution sequence

Frozen scene IDs: capsule, downtown, library, yard, moth, beach, harbor, stacks, warehouse, market,
laundromat, shop, mall, metro, galleriaStation, harborStation, train, sandbox, harborShift.
Include their existing device vocabularies, specialized controllers, opening/story/cutscene handoffs,
transport/map links and existing network behavior. Demo scenes are examples, not substitutes for these
19. Existing sequence/timeline authoring stays supported. No new story chapter or remote ability.

1. **G0 baseline and inventory:** retain original snapshots, enumerate source-owned content and
   controllers per scene, freeze behavior fixtures and map every row to its shared destination.
2. **Communication/conversations:** batches A/B below; include procedural bot reaction content and
   inputs in the shared schema/controller inventory rather than leaving an untracked legacy runner.
3. **Missing contracts:** typed scene/controller/state/world/network/lifecycle contracts needed by
   current behavior. Reuse existing command, event, permission and conversation engines.
4. **All-scene migration:** simple ordinary scenes first, then story/security/device scenes, then
   harbor/rail/timed simulations. Record each scene's parity before removing its replaced code.
5. **Full editor:** extend the current scene-centered Scene/Logic/Play workflow (wiring sits under Logic) with typed
   scene creation, add/remove/rebind, controller forms, world-link editing and all-scene private Play.
   Integrate alongside migrations so editor limitations are discovered before scaling the corpus.
6. **Cleanup, measurements and handoff:** remove replaced paths, verify current persistence and isolation,
   collect batch C measurements, build and deliver compact user review scenarios.

## Meaning of full editor support

- Content includes people/variants, ordinary use and carried-item routes, readables, rests, spawn,
  exits, commands, events, reactions, objectives, conditions, access, capabilities and initial state.
- Devices include noun/verb/event definitions, guards, links, wiring and supported timed/logic/security
  blocks. All existing device classes must have typed authoring, not Sandbox-only hard-coded limits.
- Controllers (trains, crane/cargo, washers, security, ambient actors and story bridges) expose their
  authored inputs, resource/flag references, placements, routes and event hooks. Continuous simulation
  remains code owned by a registered controller, with explicit start/update/pause/dispose contracts.
- Network authoring covers existing entities, discovery, reach/connection and permissions. Preserve
  current semantics; do not invent later-act remote gameplay to claim ENG-07 completion.
- World editing covers places/membership, scene destinations, arrival points, map/transport access and
  story/cinematic handoffs with cross-document validation. The same pending documents feed real Play.
- Public bundles validate data only; no eval, user scripts, filesystem service or credentials. Local
  grouped Save, Undo/Redo and bundle import/export are atomic; current-format persistence round-trips correctly.
- Existing art/timeline parameters are editable with native quality. Adding a new mechanic or new
  procedural drawing implementation still requires code; ordinary content does not.

## Starting point and preservation

- ENG-01–04 and the named ENG-05/06/08 package have bounded technical evidence. The recorder
  and isolated manifest pilot exist; whole-world registration and measured optimizations do not.
- User reports purchases, objectives/access, conversations and devices working; wiring mostly
  works with unspecified details deferred. This is not Harbor pacing or editor acceptance.
- The current checkout includes restored uncommitted work after pulling main at `31616f6`.
  At execution start record actual HEAD, working-tree/source fingerprint and pre-existing changes.
  Historical package fingerprints describe their original snapshots, not the new source.
- Preserve scene/actor geometry, art, animation timing, puzzle rules, lines, rewards, prices,
  permissions, world routes and saved progress except the communication changes explicitly below.
  Approved overlay changes are listed separately from world-pixel parity. Never update a baseline
  merely to make a failed comparison pass.

## Batch A: communication (ENG-09)

Keep character bubbles, choice panels with the scene visible, device captions, action chips,
bounded pings/edge arrows, selective camera nudges, the quiet GOAL line and brief centre-to-left
goal introduction, ongoing hack indicators, terminal history, deck and authored transitions.

Remove the independent player-head toast, gain line and touch terminal-mirror overlays; consolidate
their necessary messages and the hint lane into one restrained status/help lane. Device responses
belong at the device, never in the player's speech. One guidance owner chooses the current target.
Keep presenters distinct; share message identity, source, purpose/tone, target, priority, lifetime,
scope, log policy and cancellation. Coordinate bounded per-channel queues, not one blocking queue.
An immediate refusal must not wait behind optional help. Collapse repeats; discard stale results;
cancel completed guidance. A log entry is history, not an instruction to create another notification.

Explicit duplicates: train news remains on its sign (no duplicate toast); scan acquisition has one
status announcement and history entry (no competing NET pulse); captions are not mirrored on touch;
teach hack controls once contextually and retain their reference in CONTROLS. Preserve functional
NET availability. Meaningful dialogue/results/warnings remain recoverable; do not archive every
ping, animation or circuit pulse. Sound follows meaningful events with deduplication/rate limits.

Scope: all existing producers of the retired overlays, runtime scene-use/access responses,
DRIVER/CONCIERGE responses, caption/terminal forwarding, opening/Harbor guidance and hack-control
hints, plus their callers in currently registered campaign/demo scenes. G0 freezes exact call sites.
Do not redesign cutscenes, travel art, narrative text or hack state indicators under this scope.

First fix expiry independently of reduced-motion animation. Readability time advances during
active play, pauses under deck/takeovers/hidden-document suspension, and resumes without consuming
the unread duration. Reduced motion changes animation, never expiry. Dialogue/choice blocking and
contextual-hint suppression remain explicit policies. Keep simulation/city time separate.

## Batch B: remaining conversations (ENG-03 continuation)

Reconcile docs/reference/CONVERSATION-MIGRATION.json against source at G0: the JSON still labels
49 rows legacy, while the completed Market batch moved cook/fish/repair/sleeper to shared content,
leaving 45 expected remaining paths. Correct those four ledger statuses, verify all rows against
source, and freeze the remaining explicit IDs before migration. Do not migrate completed work again.
Migrate those remaining IDs to the existing conversation runner/model. Preserve conditional
weather/time variants, free-text matching, entry effects, cycling/final-repeat, cancellation,
permissions and command consequences; use adapters for specialized inputs rather than a second
progression engine. Apply the established persistent-cursor policy and deterministic fresh-state defaults.
Keep bubbles/panels as presentation adapters. Generic procedural bot reactions are included through
a typed registered reaction/controller contract; do not preserve a competing dialogue progress engine.
Additional discovered content is inventoried, not silently added to the frozen goal.

## Batch C: timing, lifecycle and evidence (ENG-06 bounded continuation)

Document clock ownership and pause/resume/disposal for messages, guidance, host callbacks and private
Play. Fix demonstrable stale communication callbacks/listeners across scene change, reset, frame
destruction and repeated start/stop. Inventory inactive-scene simulation and preserve its current
policy: no redesign of train timetables, weather, economy or background simulation.

Build reproducible local scenario manifests over the existing recorder: (1) quiet Downtown native
render, (2) weather/actors in Market, (3) demo wiring fan-out, (4) hack board open/close, (5) repeated
scene/host visits, (6) private Play start/stop and isolated saves. Each has a fixed fixture/seed,
viewport/DPR, input sequence, warm-up and measurement window. Use 5-second warm-up and three
30-second measured runs for steady workloads; define fixed operation counts for transition cases.
Record source identity, environment, cold/warm distinction, sample quality, distributions and recorder
overhead. Report unavailable CPU/GPU/presentation metrics honestly. These are focused technical
scenarios, not a campaign playthrough or new CI service.

Optimization is a bounded optional outcome: inspect the three largest measured CPU contributors;
attempt at most three isolated changes that preserve pixels/outcomes/simulation policy. Keep a change
only if paired runs beat measured noise/recorder overhead without a material tail regression; otherwise
revert it and record the result. A valid baseline with no safe proven improvement satisfies this part.
Do not lower quality, DPR or population, change renderer technology or claim RAF equals presented FPS.

## Authoring and feedback delivery

Provide validated serializable definitions and typed editor controls in the latest scene-centered
editor. The user explicitly expanded authorization to full editor support; the former no-UI restriction
is superseded. Preserve the new scene-centered UX and existing user changes rather than replacing it.
On 2026-10-19 the user directed the next step of that UX: a Scene view with an outline, preview
toolbar and an inspector whose Behaviour/Device/Wiring tabs show the logic bound to the selected
artwork; Logic keeps the full lists; Library and World hold everything that is not scene-specific
(see authoring/README.md). This is the current scene-centered UX to preserve.
All required hooks must be integrated and usable; a deferred UI adapter is no longer an acceptance
substitute. Define current-state defaults before schema changes and test pending documents in the real
private Game realm. Keep protected local Save and public download-only workflows separate.

Use the plain existing Test District with direct bookmarks/in-place controls. Add communication cases
for reward, refusal, remote device result, dialogue with deferred hint, objective completion/cancel,
repeated signals and reduced-motion expiry. No travel, scenery or new fourth district is required.
Instructions ask the user about readability, interruption, tone and timing; the agent owns mechanical
checks. Provide source/fixture locations for each case and a compact before/after change list.

## Gates and stopping rule

| Gate | Reproducible evidence required |
| --- | --- |
| G0 Scope/baseline | Verify captured starting revision/diff identity and untouched source bytes; retrospectively reconcile exact producer callsites, conversation IDs (including the four stale Market entries), all19 scene/controller destinations, workload manifests and preservation fixtures. State chronology/subtree limits explicitly; zero implementation claims from inventory alone |
| G1 Communication routing | Each retired producer has an explicit destination; no remaining display path for the three retired overlays; door/device errors stay out of player speech; meaningful closed-terminal errors are visible; duplicate acquisition/news/control cases occur once; terminal history does not recursively notify |
| G2 Timing/attention | Controlled-time checks cover normal/reduced motion, pause/resume, hidden tab, scene change, completed objectives, queue bounds, preemption and repeat collapse; immediate feedback is not starved by hints; relevant on-screen and off-screen targets work |
| G3 Conversation corpus | Every frozen row uses the shared runner; scenario comparisons preserve text/variants/effects/permissions; repeated entry cannot duplicate rewards; cursors survive supported reload; fresh and current-format saves initialize once; procedural bot content uses the registered shared contract |
| G4 Authoring/isolation | New definitions validate/round-trip through model history and portable/protected document paths; invalid edits reject atomically; isolated Play/demo never mutate campaign saves; all required editor controls and native Play are integrated; no mandatory deferred UI hooks |
| G5 Lifecycle | Repeated scene and private-Play lifecycle cases leave no owned feedback callbacks/listeners or messages in disposed sessions; simulation-policy inventory records preserved behavior |
| G6 Performance | All six workloads have source-bound raw samples and reports with three repeats, overhead and quality diagnostics; top-three contributor analysis and retained/reverted optimization evidence; incomplete/corrupt samples are not accepted as a baseline |
| G7 Integration/handoff | Relevant existing checks and both builds pass; approved overlay deltas separated from unchanged world/actor paint comparisons; compact demo works in production build; coverage/ledgers/roadmap agree; feedback guide and unresolved limitations delivered |

Each gate is PASS, FAIL, NOT RUN or BLOCKED, with command/fixture, expected/observed result and source
identity in a new execution ledger. Work in reviewable batches; keep historical evidence immutable.
Stop after G0–G13 and handoff. A blocker stops its dependent work, not unrelated batches; report it
without inventing a fallback product design or shrinking mandatory scope silently.

## Additional mandatory all-game gates

| Gate | Reproducible evidence required |
| --- | --- |
| G8 All-scene content | Every one of the 19 matrix rows has scene/gameplay/device/controller/world documents as applicable; tests mutate representative ordinary content in pending data and observe real runtime changes; no ordinary content hidden in native closures |
| G9 Controllers/network | Every inventoried specialized mechanic and existing network route has a typed validated registered adapter; event/permission/timer/parity cases pass; editor controls change actual native behavior; controllers dispose without stale work |
| G10 Full authoring | All 19 scenes support Scene/Logic/Play (including wiring) and creation/deletion/rebinding for supported entities; typed conditions/actions/dialogue/device/controller edits, history, bundle round-trip and protected Save reload pass; a created scene runs and connects without TS edits |
| G11 World/story | Pending world/scene documents drive exits, arrivals, map/transport permissions and existing narrative/timeline handoffs consistently; dangling references and incompatible grouped imports reject atomically |
| G12 Preservation/persistence | Immutable before/after world and actor pixel/render fixtures across day/night/weather/motion and relevant scene states; separate approved overlay deltas; current campaign/Harbor/slot save and reload preserve progress; recorded puzzle/controller outcomes and timing match |
| G13 Removal/completeness | Each inventoried old implementation is removed or explicitly retained as the sole registered simulation/art primitive; no second content evaluator/dialogue progress map/scene-specific ordinary-content branch remains; all matrix rows and G0–G12 PASS, final source identity and user guide delivered |

G8–G13 expand ENG-04/05/06/07/08 to the existing-game corpus, not hypothetical future mechanics.
The per-scene matrix must record content, devices/controllers, world links, Layout/Logic/Wiring/Play,
protected Save/bundles, persistence and preservation evidence separately; no single global checkbox.
Where a feature genuinely does not exist in a scene, mark N/A with a source-backed reason. Missing
implementation or opaque code cannot be called N/A. Pixel evidence must distinguish actual images
from draw-command transcripts; unmeasured pixel parity stays NOT RUN.

## Explicit exclusions and later sequence

No new story M3–M9 implementation, campaign playthrough, gameplay/wiring redesign from unspecified
feedback, new remote mechanics, new economies, arbitrary scripts, player-facing pack marketplace,
CI expansion, telemetry, deployment or publication. No automatic background monitoring or assumed
budget. Existing scene behavior must be covered even where the earlier proposal excluded it.

After this goal the next work is user review of authoring/communication appeal and Harbor M2 pacing,
then M3–M6 experience implementation on the unified foundation. Later body/remote chapter design
remains a separate product decision. Do not describe completion of existing network support as
implementation of the proposed remote-presence acts.
