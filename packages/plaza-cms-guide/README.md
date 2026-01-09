---
title: Plaza CMS
order: 0
---

# Plaza CMS

A lightweight CMS library for rendering markdown content in React applications.

## Features

- **Frontmatter parsing** - Extract metadata from YAML frontmatter
- **Auto-ordering** - Files sorted by numeric prefix (01_, 02_, etc.)
- **React components** - Ready-to-use navigation and rendering components
- **Collapsible sections** - Navigation folders with localStorage persistence
- **Link rewriting** - Convert relative markdown links for SPA routing
- **Plaza integration** - Styled with plaza-design-core

## Quick Example

```typescript
import { parseFrontmatter, MarkdownRenderer } from 'plaza-cms';
import content from 'plaza-cms-guide/README.md?raw';

function App() {
  return <MarkdownRenderer content={content} />;
}
```

## Architecture

Plaza CMS is designed for static sites using Vite:

- **Build-time bundling** - Markdown imported via `?raw` suffix
- **No server needed** - All content bundled at build time
- **Hot reloading** - Vite's HMR updates content instantly
- **React components** - Type-safe components for navigation and rendering
