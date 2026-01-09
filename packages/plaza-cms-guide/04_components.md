---
title: Components
order: 4
---

# React Components

Plaza CMS provides three React components for content rendering.

## MarkdownRenderer

Renders markdown content with frontmatter stripping.

```typescript
import { MarkdownRenderer } from 'plaza-cms';

<MarkdownRenderer
  content={markdownString}
  className="my-content"
  showTitle={true}  // Show title from frontmatter
/>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | string | required | Raw markdown with optional frontmatter |
| `className` | string | `''` | Additional CSS class |
| `showTitle` | boolean | `false` | Render title from frontmatter as h1 |

## ContentNav

Sidebar navigation component with collapsible folders.

```typescript
import { ContentNav } from 'plaza-cms';

<ContentNav
  menu={menuObject}
  currentPath="getting-started"
  onNavigate={(path) => setCurrentPath(path)}
  className="my-nav"
  storageKey="my-app-nav"  // localStorage key for collapsed state
/>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `menu` | Menu | required | Menu structure with sections |
| `currentPath` | string | required | Currently active path |
| `onNavigate` | (path: string) => void | required | Called when user clicks nav item |
| `className` | string | `''` | Additional CSS class |
| `storageKey` | string | `'plaza-cms-collapsed'` | localStorage key for collapsed sections |

### Collapsible Sections

Folder sections can be collapsed/expanded. The collapsed state is persisted in localStorage using the `storageKey` prop.

## ContentLayout

Combined layout with navigation sidebar and content area.

```typescript
import { ContentLayout } from 'plaza-cms';

<ContentLayout
  menu={menu}
  content={currentContent}
  currentPath={currentPath}
  onNavigate={setCurrentPath}
  className="docs-layout"
/>
```

Uses `ContentNav` and `MarkdownRenderer` internally.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `menu` | Menu | required | Menu structure |
| `content` | string | required | Current markdown content |
| `currentPath` | string | required | Currently active path |
| `onNavigate` | (path: string) => void | required | Navigation callback |
| `className` | string | `''` | Additional CSS class |
