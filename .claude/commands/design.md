# Plaza Design System - Navigation Guide

This monorepo has multiple packages, each with its own CLAUDE.md.

## Must-Read for Design Work

| Task | Read |
|------|------|
| **Understanding design philosophy** | @packages/plaza-design-guide/CLAUDE.md |
| **Changing styles/colors/spacing** | @packages/plaza-design-core/CLAUDE.md |
| **ACCESS DENIED game work** | @packages/plaza-design-demo/src/ssg/game/CLAUDE.md and README.md |

## All Package CLAUDE.md Files

| Package | CLAUDE.md covers |
|---------|------------------|
| `plaza-design-core` | Token system, themes, CSS components |
| `plaza-react-components` | React component wrappers |
| `plaza-cms` | Markdown/frontmatter utilities |
| `plaza-design-demo` | React showcase and static homepage/game; game has its own guidance |
| `plaza-cms-demo` | CMS demo app |
| `plaza-design-guide` | Design philosophy & principles |
| `plaza-cms-guide` | CMS usage patterns |

## Commands

```bash
pnpm dev       # Component playground
pnpm dev:cms   # CMS demo
pnpm build     # Build all
```
