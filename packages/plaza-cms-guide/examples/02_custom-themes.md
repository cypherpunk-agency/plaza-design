---
title: Custom Themes
order: 2
---

# Custom Themes

Plaza CMS inherits theming from plaza-design-core. Here's how to use and customize themes.

## Using Built-in Themes

Set the theme via data attribute:

```html
<html data-theme="modern">
```

Or programmatically:

```tsx
import { setTheme, cycleTheme } from 'plaza-design-core/plaza';

// Set specific theme
setTheme('ice');

// Cycle through themes
cycleTheme();
```

## Available Themes

| Theme | Description |
|-------|-------------|
| `neon` | Orange/cyan cyberpunk (default) |
| `ice` | Cold blue precision |
| `forest` | Green/gold terminal |
| `grayscale` | Desaturated monochrome |
| `modern` | Clean slate/blue professional |

## Theme Toggle Button

```tsx
function ThemeToggle() {
  return (
    <button onClick={() => cycleTheme()}>
      Toggle Theme
    </button>
  );
}
```

## Creating Custom Themes

Register a custom theme at runtime:

```tsx
import { registerTheme } from 'plaza-design-core/plaza';

registerTheme('sunset', {
  primary: {
    500: '#f97316',
    600: '#ea580c',
  },
  accent: {
    500: '#ec4899',
  },
  bgBase: '#18181b',
  enableGlow: 1,
});

// Then use it
setTheme('sunset');
```

## CSS Variables

All themes define these CSS variables:

```css
--color-primary-300 through --color-primary-950
--color-accent-400 through --color-accent-950
--color-bg-base, --color-bg-primary, --color-bg-accent
--enable-glow (0 or 1)
```

The CMS components automatically use these variables for consistent theming.
