---
title: Menu Structure
order: 3
---

# Menu Structure

Plaza CMS uses a hierarchical menu structure for navigation with support for both markdown files and component pages.

## Types

```typescript
// Base properties shared by all menu items
interface MenuItemBase {
  id: string;
  label: string;
  description?: string;
  order?: number;
}

// Markdown file item - rendered by CMS
interface FileMenuItem extends MenuItemBase {
  type: 'file';
  path: string;  // Content path for markdown
}

// Component item - rendered by app
interface ComponentMenuItem extends MenuItemBase {
  type: 'component';
  route: string;  // URL route
}

// Union type for all menu items
type MenuItem = FileMenuItem | ComponentMenuItem;

// Folder containing menu items
interface MenuFolder {
  type: 'folder';
  id: string;
  title: string;
  children: MenuNode[];
  order?: number;
}

type MenuNode = MenuItem | MenuFolder;

// Top-level menu
interface Menu {
  title: string;
  subtitle?: string;
  sections: MenuNode[];
}
```

## File Items vs Component Items

**File items** (`type: 'file'`) are markdown content pages:

```typescript
const guideItem: FileMenuItem = {
  type: 'file',
  id: 'philosophy',
  path: 'philosophy',      // Used with basePath: /guide/philosophy
  label: 'PHILOSOPHY',
  description: 'Design principles'
};
```

**Component items** (`type: 'component'`) are React component pages:

```typescript
const demoItem: ComponentMenuItem = {
  type: 'component',
  id: 'gallery',
  route: '/demos/gallery',  // Full route path
  label: 'GALLERY',
  description: 'Component reference'
};
```

## Combining Sections

Create a unified menu with both guide pages and demos:

```typescript
import type { Menu, MenuFolder, ComponentMenuItem } from 'plaza-cms';

// Guide sections (markdown)
const guideMenu: Menu = {
  title: '[PLAZA]',
  subtitle: 'DESIGN KIT',
  sections: [designGuideFolder, devGuideFolder]
};

// Demos section (components)
const demosFolder: MenuFolder = {
  type: 'folder',
  id: 'demos',
  title: 'DEMOS',
  children: [
    { type: 'component', id: 'gallery', route: '/demos/gallery', label: 'GALLERY' },
    { type: 'component', id: 'dashboard', route: '/demos/dashboard', label: 'DASHBOARD' },
  ] as ComponentMenuItem[]
};

// Combined menu
const fullMenu: Menu = {
  ...guideMenu,
  sections: [...guideMenu.sections, demosFolder]
};
```

## Collapsible Sections

Enable collapsible sections with the `collapsible` prop:

```tsx
<ContentNav
  menu={menu}
  currentPath={currentPath}
  onNavigate={handleNavigate}
  variant="borderless"
  collapsible={true}
/>
```

Collapse state is persisted to localStorage. Customize the storage key:

```tsx
<ContentNav
  menu={menu}
  storageKey="my-app-collapsed"
  collapsible={true}
/>
```

## Navigation Handler

Handle both file and component navigation:

```typescript
const handleNavigate = (itemPath: string) => {
  // Component routes start with /
  if (itemPath.startsWith('/')) {
    navigate(itemPath);
  } else if (itemPath === 'index') {
    navigate('/guide');
  } else {
    navigate(`/guide/${itemPath}`);
  }
};
```

## File Ordering

Files are ordered by numeric prefix in their filename:

```
01_introduction.md  -> order: 1
02_getting-started.md -> order: 2
10_advanced.md -> order: 10
```

Use `parseOrderPrefix` to extract order:

```typescript
import { parseOrderPrefix } from 'plaza-cms';

parseOrderPrefix('01_intro');
// { order: 1, name: 'intro' }

parseOrderPrefix('no-prefix');
// { order: null, name: 'no-prefix' }
```

## ContentNav Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `menu` | `Menu` | required | Menu structure |
| `currentPath` | `string` | required | Current active path |
| `onNavigate` | `(path: string) => void` | required | Navigation callback |
| `variant` | `'windowed' \| 'borderless'` | `'windowed'` | Visual style |
| `collapsible` | `boolean` | varies | Enable collapsible sections |
| `basePath` | `string` | `''` | Base path for file URLs |
| `useHashUrls` | `boolean` | `true` | Use hash URLs vs path URLs |
| `storageKey` | `string` | `'plaza-cms-collapsed'` | localStorage key for collapse state |
| `className` | `string` | `''` | Additional CSS class |

## Nested Folders

Create hierarchical navigation with nested folders:

```typescript
const menu: Menu = {
  title: 'Documentation',
  sections: [
    { type: 'file', id: 'intro', path: 'intro', label: 'Introduction' },
    {
      type: 'folder',
      id: 'guides',
      title: 'GUIDES',
      children: [
        { type: 'file', id: 'basics', path: 'basics', label: 'Basics' },
        { type: 'file', id: 'advanced', path: 'advanced', label: 'Advanced' },
        {
          type: 'folder',
          id: 'tutorials',
          title: 'TUTORIALS',
          children: [
            { type: 'file', id: 'first', path: 'first', label: 'First Steps' }
          ]
        }
      ]
    }
  ]
};
```
