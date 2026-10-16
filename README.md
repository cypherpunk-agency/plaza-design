# Plaza Design Kit

Cyberpunk terminal design system, demo apps, and **ACCESS DENIED**, a browser game on the
cypherpunk.agency homepage (pnpm monorepo). Everything is being designed together; current
code and documents describe a work in progress, not a fixed specification.

## Packages

| Package | Description |
|---------|-------------|
| [plaza-design-core](./packages/plaza-design-core/) | CSS design system + JS utilities |
| [plaza-react-components](./packages/plaza-react-components/) | React component library |
| [plaza-cms](./packages/plaza-cms/) | Markdown CMS utilities |
| [plaza-design-guide](./packages/plaza-design-guide/) | Design philosophy documentation |
| [plaza-cms-guide](./packages/plaza-cms-guide/) | CMS documentation |
| [plaza-design-demo](./packages/plaza-design-demo/) | React design showcase and static homepage containing ACCESS DENIED |
| [plaza-cms-demo](./packages/plaza-cms-demo/) | CMS demo app |

## Scripts

```bash
pnpm install            # Install dependencies
pnpm dev                # Start design demo
pnpm dev:cms            # Start CMS demo
pnpm build              # Build all packages
pnpm build:design-demo  # Build design demo only
pnpm build:cms-demo     # Build CMS demo only
pnpm build:homepage     # Build the cypherpunk.agency homepage (dist-homepage/)
```

## Where the game lives

`packages/plaza-design-demo/src/ssg/game/` contains ACCESS DENIED. Start with its
[README](./packages/plaza-design-demo/src/ssg/game/README.md) for the code map, local preview,
controls and documentation guide. The ordinary `pnpm dev` command opens the design showcase;
it does not launch the game.

The package has two build outputs: `dist/` for the React design showcase and
`dist-homepage/` for the homepage and game. The homepage generator is
`packages/plaza-design-demo/scripts/generate-demos.tsx`.

`experiments/` holds separate prototypes and research. `.github/` holds deployment workflows;
`.claude/` holds agent commands, local permissions and working checkouts. Agent guidance is in
the root and package `CLAUDE.md` files, with game-specific guidance alongside the game.

## License

MIT
