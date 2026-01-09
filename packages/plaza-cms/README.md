# Plaza CMS

Lightweight CMS utilities for rendering markdown content in React.

## Installation

Peer dependencies: `react`, `react-markdown ^10`, `remark-gfm ^4`

```tsx
import 'plaza-design-core/plaza.css';
import { MarkdownRenderer } from 'plaza-cms';
import content from './doc.md?raw';

function App() {
  return <MarkdownRenderer content={content} />;
}
```

## Exports

### Types

- `Frontmatter` - YAML metadata structure
- `MenuItem` - Navigation item
- `MenuFolder` - Collapsible folder
- `Menu` - Full navigation structure

### Utilities

- `parseFrontmatter(content)` - Extract YAML frontmatter
- `parseOrderPrefix(filename)` - Parse `01_` style prefixes
- `fileToLabel(filename)` - Convert filename to display label

### Hooks

- `useCollapsedSections(storageKey)` - Manage collapsible state with localStorage

### Components

- `MarkdownRenderer` - Render markdown with GFM support
- `ContentNav` - Navigation sidebar with collapsible folders
- `ContentLayout` - Two-column layout (nav + content)
