# Plaza Design Demo

This package contains the React Plaza design showcase and, separately, the static
cypherpunk.agency homepage with the ACCESS DENIED browser game. Both are in active design.

## Scripts

```bash
pnpm dev      # Start dev server
pnpm build    # Production build
pnpm preview  # Preview production build
pnpm generate-demos # Validate and build the static homepage + game into dist-homepage/
```

## Features

- Full design system showcase
- Theme cycling (press `T`)
- Animated grid background
- Component gallery

## ACCESS DENIED

The game lives in [`src/ssg/game/`](./src/ssg/game/README.md). Its README explains the scene
engine, documentation and local preview. `pnpm dev` and `pnpm preview` above serve the React
showcase; to play the game, build and serve `dist-homepage/` as described there.
