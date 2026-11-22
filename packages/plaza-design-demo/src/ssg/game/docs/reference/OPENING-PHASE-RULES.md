# Opening phases

The opening is a story timeline made of data. Its phase ids are the keys of `PHASES` in `story/opening.json` (the shipped ones are
`home`, `flat`, `deleted`, `uplinked`, `free`; a second timeline names its own). The current phase is selected by the ordered
`PHASE_RULES`: each conditional row uses the common gameplay flag conditions (`flag`, `all`, `any`, `not`) and names a phase, the last
row is an unconditional fallback, the first matching row wins. Nothing in the game loop names a phase.

## What a phase holds

Story-wide, in `PHASES.<phase>`:

- `hackLocked`: hacking is out of reach (sudo and the play profile still decide the rest);
- `hackStages` (optional, only on an unlocked phase): the hacking capability stages this phase gives (see below). Left out, an
  unlocked phase gives every stage at once, which is how the old campaign's uplink works;
- `pinned`: the story holds the city clock while the phase lasts (see below);
- `resume`: where a saved game resumes (ordered rows, an optional `whenFlag`, a fallback last);
- `persona` (optional): who you are while the phase lasts. `name` is what the HUD and your speech bubbles call you ("courier"), `deck`
  is what the deck's files and `whoami` say, `calmWeather` keeps the rain off. A phase without a persona is you, with your handle.

### Hacking capability stages

Hacking unlocks one capability at a time (`engine/hack-stages.ts`): `inspect` (hack vision, tapping a device's verbs; nothing
else counts without it), `wire` (new cables, and the TIMER/SWITCH logic parts), `cut` (cutting a cable), `board` (B, `⌁ jack
in`), `guard` (password tries: fragments, typed guesses, the deck's `login`) and `link` (a LINK's `scan`/`connect`, and with the
scanner program the net map). The stages you have are the phase's `hackStages` plus every stage whose flag `hack:<stage>` is
set. Any gameplay command grants one with an ordinary flag action (`{ "flag": "hack:wire", "value": true }`, declaring the flag
in its `flags`), and a starting checkpoint may set them. The device data does not change. A stage that is not yours refuses
with its `stage.<stage>` line from `data/engine.json`, and the button for it (BOARD, LOGIC) stays hidden. Signals wired by
the story still run. `capabilityView` exposes `hack` and `hack:<stage>` to access rules. Check: `pnpm test:game hack-stages`.

Per scene, in `scenes/<id>/scene.json` `phases.<phase>` (only scenes that differ say anything):

| Field | Does |
| --- | --- |
| `time` | the minute the city clock is pinned to in this scene while the phase holds |
| `goal` | the HUD's goal line |
| `intro` | what the player says on arriving (once per phase; `consume` also spends the scene's usual first-visit intro) |
| `arrival` | first-visit words by flag (`unless`, `set`), weather and the companion's greeting (the Downtown greeting) |
| `ride` | `{mover, path}`: the scene's mover sent along a path on arrival (the Train's `home` run into Downtown) |
| `lines` | what a person, use, readable or device answers in this phase |
| `exits` | exits that act differently: `say`, `react`, a timed `gate` (turnstile), an `acknowledge` (concierge) |
| `everyday` | a device's popup actions in this phase (say, device verb, state change, counter cues) |
| `targets` | story targets to press E on (the bed); one with `card` starts that card (the sleep) |
| `ping` | where the attention ping points when the player stands still (`ATTENTION.after` frames) |

The scene's `wash` rules (first match wins; by phase, a flag, unless a model state is on) set the room's warm or cold light.

The clock: while a phase is `pinned` the clock is held at the scene's `time` (or at the minute it was, if the scene names none). When the
phase is no longer pinned the clock is released to the time `CLOCK.release` names (a scene's `time` in a phase) and runs.

## Editing

Library → Story logic → Phases edits `PHASE_RULES`, `PHASES` (resume rows, persona), the role flags and the sudo levels. Conditions use the
existing typed flag-condition controls; the fallback stays last. The selected chunk's Story phases controls edit its part
in a phase. Validation rejects missing or early fallbacks, unknown phases, flags, scenes, exits, devices, nouns, states, mover paths,
cards and milestones, and conditions requiring context that the opening phase selector does not receive. Check:
`pnpm test:game opening-from-data story-authoring`.
