# Plaza Design Kit

pnpm monorepo with seven packages (eight workspace projects including the root).
The design system and ACCESS DENIED game are evolving together. Documents and past decisions
are working context, not frozen requirements; the user's current direction takes precedence.

## Package Dependencies

```
plaza-design-core (CSS + JS)
    ↑
plaza-react-components (React)
    ↑
plaza-cms (CMS utilities)
    ↑
plaza-design-demo / plaza-cms-demo (apps)
```

## Commands

- `pnpm dev` - Start plaza-design-demo
- `pnpm dev:cms` - Start plaza-cms-demo
- `pnpm build` - Build all packages
- `pnpm build:homepage` - Validate game data and build the static homepage and game

## Working on Packages

Read @README.md to understand the repository structure.

Each package has its own CLAUDE.md with specific rules. Check them before making changes.

## ACCESS DENIED

The game is in `packages/plaza-design-demo/src/ssg/game/`, separate from the React showcase in
the same package. Read its `README.md` and `CLAUDE.md` before game work. `pnpm dev` opens the
showcase; the game runs from `dist-homepage/` after `pnpm build:homepage`.

Game playthroughs and a regression-suite/CI expansion are pending discussion with the user.
Do not start them as part of routine validation. Builds and focused checks of a requested fix
are appropriate. Publishing is a separate action; do not infer it from a request to edit.

## Custom Commands

- `/design` - Navigation guide for the design system (`.claude/commands/design.md`)
