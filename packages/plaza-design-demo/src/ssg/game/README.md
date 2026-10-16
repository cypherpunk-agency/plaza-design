# ACCESS DENIED

A browser hacking adventure inside the cypherpunk.agency homepage. Devices have nouns, verbs
and events; the player rewires them to solve puzzles and explore the city.

The whole game is in active design. Implemented behavior, story, mechanics, visuals and
architecture can all change. "Built" means present in the current code, not final or approved
forever. Historical "decided" notes record context, not constraints on further design.

## Build and preview

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm build:homepage
python -m http.server 4174 --bind 127.0.0.1 --directory packages/plaza-design-demo/dist-homepage
```

The server command requires Python. Any static server pointed at `dist-homepage/` works too.
Open `http://127.0.0.1:4174/?play` for the title screen. Rebuild and reload after source edits;
this preview has no hot reload. `pnpm dev` serves the separate React design showcase.

- `?play=library` (or another id in `scenes/index.ts`) opens a scene directly for inspection.
  Direct scene entry bypasses normal travel, so it is not evidence of story progression.
- `?sudo` opens developer mode with separate saves, unlocks, the LEVELS menu and time controls.
- `?play=sandbox&sudo` opens the engine's manual demonstration bay.
- The regular homepage also accepts the Konami code to enter the game.

Arrow keys walk, E interacts, H opens hack vision, B the board, Enter the terminal, TAB/M the
city map, N the net map once `scan.so` is owned, and Escape closes overlays or opens the menu.
Touch has on-screen controls and currently requires landscape orientation.

## Code map

| File or directory | Current responsibility |
| --- | --- |
| `index.ts` | Homepage entry, URL shortcuts, touch controls |
| `game.ts` | Main controller: input, movement, overlays, travel and story transitions |
| `engine/` | Scene model/host, hacking UI, cables, guards, clocks, watchdogs and pausable scene time |
| `data/` | JSON content, types, loading and build-time validation |
| `scenes/index.ts`, `scenes/kit.ts` | Scene registry and shared scene interface |
| `capsule/`, `downtown/`, `yard/`, `moth/`, `library/`, `laundromat/`, `stacks/`, `beach/`, `sandbox/` | Location-specific rules and drawing |
| `scenes/` | Other locations, metro simulation, shared building and screen kits |
| `sets/`, `characters.ts`, `sprites.ts` | Reusable scenery and characters |
| `city.ts`, `cityplan.ts`, `citymap.ts`, `netmap.ts` | City structure, maps and network discovery |
| `clock.ts`, `weather.ts`, `light.ts` | City time, weather and lighting |
| `title/`, `opening.ts`, `cutscenes/` | Title/glide, tutorial states and story presentations |
| `level.ts`, `slots.ts`, `menu.ts`, `terminal.ts` | Player save, slots, menus and terminal |

The enclosing `../render.tsx` supplies the static page and shared game styles.
`../../../scripts/generate-demos.tsx` validates data and bundles the homepage; the generator
and the scene/data registries must include new content where applicable.

## Documentation guide

These documents have different jobs; none freezes the design. Check code for what actually
runs and update the relevant document when behavior changes. Resolve disagreements against
the user's latest direction, not whichever old note sounds most authoritative.

| Document | Use it for |
| --- | --- |
| [PROGRESSION-CONCEPT.md](./PROGRESSION-CONCEPT.md) | New story and learning direction: harbor prologue, Downtown Act I, later embodiment proposals; comparison with current material |
| [PROLOGUE-ACT-I-PLAN.md](./PROLOGUE-ACT-I-PLAN.md) | Milestone 1: encounter matrices, teaching dependencies, access and puzzle dispositions |
| [ROADMAP.md](./ROADMAP.md) | Current implementation status and proposed next work |
| [GAME-DATA.md](./GAME-DATA.md) | Technical authoring reference: data/code boundary, engine and saves |
| [ART-GUIDE.md](./ART-GUIDE.md) | Working visual and readability principles |
| [CITY.md](./CITY.md) | Current city structure and proposed places |
| [NET.md](./NET.md) | Network mechanics, current implementation and future ideas |
| [TIME.md](./TIME.md) | City time/weather/light design and implemented parts |
| [PUZZLES.md](./PUZZLES.md) | Puzzle catalogue; distinguish implemented solutions from sketches |
| [LEVELS.md](./LEVELS.md), [STORY.md](./STORY.md) | Story/level design, including historical proposals |
| [SCENES.md](./SCENES.md) | Historical scene feedback and ideas for future locations |

## Pause and saves: current behavior

The pause menu, city/net maps, title, cutscenes and leaving the game hold puzzle scene time
and delayed actions. Wiring in hack vision/the board stays live. Wall-clock lockouts keep
expiring while paused or away. The city clock has its own additional pauses (dialogue panels,
lock toys and travel/wait transitions); see TIME.md.

The autosave uses `access-denied-save-v3` in localStorage and now remembers its scene for
Continue. Older v3 saves without a scene keep the existing opening/Downtown fallback; removed
or invalid scene ids use that fallback too. Resume starts at the scene's spawn, not an exact
saved player position or train timestamp. Manual slots also retain their scene. Sudo uses
separate storage keys. This change does not reset saves or introduce a new save version.

## Validation scope

`pnpm build:homepage` checks game data and produces the playable page.
`pnpm build:design-demo` runs TypeScript checking and builds the React showcase.
Neither build proves that a story route is playable from beginning to end. Playthrough scope
and regression-suite/CI work are pending discussion with the user; do not start them as an
implicit part of routine work. Focused checks of a requested behavior change remain appropriate.
