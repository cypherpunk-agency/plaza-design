# Opening playthrough

A scripted NEW GAME through the opening of ACCESS DENIED, played in headless Chrome against the built homepage, recording what the player
sees at each beat. It exists to compare a change with a recording ("does the opening still play the same?"). It is a tool, not a
regression suite or a campaign playthrough: it stops when the player has jacked in to HOME-PC, before the capsule's own puzzles.

```sh
# from packages/plaza-design-demo
node scripts/opening-playthrough/run.mjs <outDir> [--build] [--dist <dir>]
node scripts/opening-playthrough/compare.mjs <before/trace.json> <after/trace.json>
node scripts/opening-playthrough/summary.mjs <trace.json>
```

- `--build` runs `pnpm build:homepage` first; `--dist` serves another build of `dist-homepage` (keep a copy of the "before" build to
  re-record it later). It starts one static server (port 8777) and one headless Chrome with a throwaway profile (debug port 9355) and
  stops only those; `--port` and `--http` change the ports.
- `<outDir>/trace.json` has one record per beat; `<outDir>/NN-name.png` a screenshot per beat.
- `--from <segment> --profile <dir>` resumes a development run from the saved game of an earlier run (title, train, metro, downtown,
  flat, morning, jack).

## What it plays

title (sunrise, menu) -> NEW GAME and the glide -> the train home (intro, a stranger, the brake plate, the doors open at DOWNTOWN after the
Train mover's `home` run) -> the metro platform -> the turnstile (verifying, ok) -> Downtown before (a stranger, the closed shop, Moth's
door, the market gate chip, the concierge) -> the flat at dawn (the door says "bed first", kettle and blinds chips, the attention ping at the
bed) -> sleep (the card, both readings) -> the morning you are deleted (wake-up words) -> two plain things fail -> Moth's message and
uplink.so -> HOME-PC's popup and jacking in.

## What a beat records

Scene id, story phase, true flags, the city clock (text, minute, pinned), the open talk bubble and everything said in the beat, the nearest
prompt, the HUD goal and hint lines, the checkpoint gate's line, the card's stage and reading, the pending acknowledgment's text, the
popup chips, device captions, pings, the player's x, the target ids of the scene, the deck terminal's tail.

`compare.mjs` treats scene, phase, flags, talk, prompts, goal, gate, card, acknowledgment, captions, chips, targets, the idle ping and a
pinned clock as HARD (a difference fails); the hint lane, the running clock within a few minutes, the player's x, the terminal tail and
the ping count are SOFT notes. Two recordings of the same build compare with no differences at all (checked), so a difference is a change.

## How it reads the game

`?play&probe` opens the ordinary game (no sudo, no unlocks, the normal save) with the read-only handle `window.__game.probe()` (runtime/game.ts
`probeFrame`, runtime/mode.ts `PROBE`). The script presses keys and watches the snapshot; it waits on conditions (wall time only bounds a
wait), so a slow machine plays the same beats. `recordings/baseline/trace.json` is the recording made on the code before the opening became
data; screenshots are not committed.
