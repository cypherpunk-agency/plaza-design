---
title: Basic Setup
order: 1
---

# Basic Setup

A minimal example of using Plaza CMS in a React application.

## Installation

```bash
pnpm add plaza-cms plaza-design-core
```

## Import Styles

```tsx
// main.tsx
import 'plaza-design-core/plaza.css';
```

## Load Content

```tsx
// App.tsx
import { MarkdownRenderer } from 'plaza-cms';
import content from './docs/intro.md?raw';

function App() {
  return <MarkdownRenderer content={content} />;
}
```

## Add Navigation

```tsx
import { ContentNav, ContentLayout } from 'plaza-cms';
import type { Menu } from 'plaza-cms';

const menu: Menu = {
  title: 'My Docs',
  sections: [
    { type: 'file', id: 'intro', path: 'intro', label: 'Introduction' },
    { type: 'file', id: 'setup', path: 'setup', label: 'Setup Guide' },
  ],
};

function App() {
  const [currentPath, setCurrentPath] = useState('intro');
  const content = docs[currentPath];

  return (
    <ContentLayout
      menu={menu}
      content={content}
      currentPath={currentPath}
      onNavigate={setCurrentPath}
    />
  );
}
```

## Result

You now have a working documentation site with:
- Sidebar navigation
- Markdown rendering with GFM support
- Frontmatter metadata extraction
