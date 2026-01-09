---
title: Getting Started
order: 1
---

# Getting Started

## Installation

Plaza CMS is part of the plaza-design monorepo. Add it as a workspace dependency:

```json
{
  "dependencies": {
    "plaza-cms": "workspace:*"
  }
}
```

## Basic Usage

1. Import your markdown content using Vite's `?raw` suffix
2. Use `MarkdownRenderer` to display it

```typescript
import { MarkdownRenderer } from 'plaza-cms';
import myContent from './content/page.md?raw';

function Page() {
  return <MarkdownRenderer content={myContent} />;
}
```

## With Navigation

Use `ContentLayout` for a sidebar + content layout:

```typescript
import { useState } from 'react';
import { ContentLayout } from 'plaza-cms';
import type { Menu } from 'plaza-cms';

const menu: Menu = {
  title: 'Documentation',
  sections: [
    { type: 'file', id: 'intro', path: 'intro', label: 'Introduction' },
    { type: 'file', id: 'guide', path: 'guide', label: 'Guide' },
  ]
};

function Docs() {
  const [currentPath, setCurrentPath] = useState('intro');
  const content = contentMap[currentPath];

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

## Importing CSS

Don't forget to import plaza-design-core for styling:

```typescript
import 'plaza-design-core/plaza.css';
```
