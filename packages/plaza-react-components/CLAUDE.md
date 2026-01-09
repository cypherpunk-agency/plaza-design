# Plaza React Components

## Component Guidelines

- Components wrap plaza-design-core CSS classes (`.plaza-*`)
- Use `forwardRef` for DOM element access
- Keep props minimal - styling via CSS classes
- TypeScript interfaces for all props

## File Structure

Each component exports from `components/` and re-exports via `index.ts`.
