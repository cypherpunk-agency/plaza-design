# Prologue smoke run

A scripted NEW GAME through the prologue of ACCESS DENIED, played in headless Chrome against the built homepage. It is the
automated proof that the prologue can be finished: it fails, with a readable message and a screenshot, as soon as an expected
beat does not arrive. It also records what the player sees at each beat, so a change can be compared with a recording.
It is local only (not CI) and is not a campaign playthrough: it stops when the first morning is established.

```sh
# from packages/plaza-design-demo
pnpm test:game:prologue                       # builds dist-homepage, plays, exits 1 on failure (about 5 minutes)
node scripts/opening-playthrough/run.mjs [outDir] [--no-build] [--dist <dir>] [--port <cdp>] [--http <port>]
node scripts/opening-playthrough/compare.mjs recordings/baseline/trace.json <outDir>/trace.json
node scripts/opening-playthrough/summary.mjs <outDir>/trace.json
```

- The default `outDir` is `.game-test-output/prologue/` at the repository root. It holds `trace.json` (one record per beat)
  and `NN-name.png`, a screenshot per beat, plus a `FAILURE` beat when the run fails.
- `--no-build` reuses the current `dist-homepage`; `--dist` serves another build (keep a copy of a "before" build to re-record
  it later). The run starts one static server (port 8777) and one headless Chrome with a throwaway profile (debug port 9355)
  and stops only those. Chrome is found at the usual Windows, macOS and Linux paths; set `CHROME_PATH` otherwise.

## What it plays

title menu -> NEW GAME, Escape skips the glide -> Harbor Station at dusk -> down the stairs, along the quay, through the staff
turnstile -> Shed 3 -> the night shift: the supervisor's briefing, the blue parcel, Moth at receiving (handover chip), the empty
case back to CASE RETURNS, the supervisor's last job, trolley T4 (clamped, release the clamp, park it) -> checkout (tag
returned, tokens credited) and the wage statement -> back through the turnstile, up to the platform -> the service home
through the tunnel zones (Moth's call) to Downtown Metro -> off the train, through the turnstile, up the west stairs -> Downtown -> the
capsule tower (concierge) -> capsule 7B -> bed -> the sleep card -> the morning you are deleted.

At each step it asserts the scene, the story phase (`prologue`, `home`, `flat`, `deleted`) and the HUD goal, so a broken
interaction, a moved target or a route that no longer connects fails at the step where it breaks.

## What a beat records

Scene id, story phase, true flags, the city clock (text, minute, pinned), the open talk bubble and everything said in the beat
(`said`, plus `walkedPast` for lines that opened while walking), the nearest prompt, the HUD goal and hint lines, the checkpoint
gate's line, the card's stage and reading, the pending acknowledgment's text, the popup chips, device captions, pings, the
player's position, the target ids of the scene, the deck terminal's tail.

`compare.mjs` treats scene, phase, flags, talk, prompts, goal, gate, card, acknowledgment, captions, chips, targets and a pinned
clock as HARD (a difference fails); the hint lane, the running clock within a few minutes, the player's x, the terminal tail
and the ping count are SOFT notes. Two runs of the same build compare with no hard differences (checked 2026-11-21), so a hard
difference is a change. `recordings/baseline/trace.json` is the recording of the prologue on 2026-11-21; re-record it when the
prologue changes on purpose. Screenshots are not committed.

## How it reads the game

`?play&probe` opens the ordinary game (no sudo, no unlocks, a fresh profile) with the read-only handle
`window.__game.probe()` (runtime `probeFrame`, runtime/mode.ts `PROBE`). The script presses keys and clicks popup chips like a
player, and watches the snapshot; it waits on conditions (wall time only bounds a wait), so a slow machine plays the same beats.
Most of the five minutes is the game's own pacing: typed dialogue, the shuttle's timetable and the ride.

Files: `run.mjs` (entry), `prologue.mjs` (the route), `lib.mjs` (probe, walking and recording helpers), `cdp.mjs` (a
dependency-free headless Chrome driver, also used by the pixel check), `serve.mjs`, `compare.mjs`, `summary.mjs`.
