---
title: Theming
order: 5
---

# Theming

Plaza CMS components are styled using plaza-design-core CSS classes.

## CSS Classes

The components use these CSS classes:

| Class | Component | Description |
|-------|-----------|-------------|
| `.plaza-content-nav` | ContentNav | Navigation container |
| `.plaza-nav-title` | ContentNav | Nav header title |
| `.plaza-nav-subtitle` | ContentNav | Nav header subtitle |
| `.plaza-nav-item` | ContentNav | Individual nav links |
| `.plaza-nav-item.active` | ContentNav | Currently active item |
| `.plaza-nav-section` | ContentNav | Folder container |
| `.plaza-nav-section-header` | ContentNav | Clickable folder header |
| `.plaza-nav-section-title` | ContentNav | Folder title text |
| `.plaza-nav-collapse-icon` | ContentNav | Expand/collapse arrow |
| `.plaza-nav-item-count` | ContentNav | Item count badge |
| `.plaza` | MarkdownRenderer | Article container |
| `.plaza-title` | MarkdownRenderer | Title from frontmatter |
| `.plaza-content-layout` | ContentLayout | Layout wrapper |
| `.plaza-content-main` | ContentLayout | Main content area |

## Custom Styling

Override styles in your CSS:

```css
.plaza-nav-item {
  padding: var(--space-2) var(--space-3);
  color: var(--text-secondary);
  display: block;
  text-decoration: none;
  border-radius: var(--radius-sm);
}

.plaza-nav-item:hover {
  background: var(--bg-secondary);
}

.plaza-nav-item.active {
  color: var(--text-accent);
  background: var(--bg-secondary);
}

.plaza-nav-section-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-2);
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-primary);
}

.plaza h1 {
  color: var(--text-accent);
  margin-bottom: var(--space-4);
}

.plaza-content-layout {
  display: grid;
  grid-template-columns: 250px 1fr;
  gap: var(--space-4);
}
```

## Theme Integration

Import plaza-design-core for full theme support:

```typescript
import 'plaza-design-core/plaza.css';
```

This provides CSS variables for colors, spacing, and typography that plaza-cms components use.

## Dark Mode

Plaza CMS inherits the active theme from plaza-design-core. Use the theme cycling functionality:

```typescript
import { cycleTheme, getTheme } from 'plaza-design-core';

// Get current theme
const theme = getTheme();

// Cycle to next theme
cycleTheme();
```
