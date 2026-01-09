# Theming

## The System

Plaza's theming is built on **CSS custom properties** with a JavaScript API for runtime switching. Themes affect everything: UI components, canvas rendering, glow effects, and ambient colors.

The default is **Neon** — the orange/cyan cyberpunk aesthetic. But Plaza supports multiple themes that maintain the same sharp, terminal-like personality while shifting the color palette.

---

## File Structure

Themes live in their own folder, one file per theme:

```
plaza-core/
  tokens.css              ← Base tokens (fonts, grays)
  themes/
    _index.css            ← Imports all themes
    neon.css              ← Default theme (:root)
    grayscale.css         ← [data-theme="grayscale"]
    ice.css               ← [data-theme="ice"]
    forest.css            ← [data-theme="forest"]
  plaza.css               ← Main entry (imports tokens + themes)
```

Each theme file is self-contained with all variables needed for that palette. To add a new built-in theme, create a new file in `themes/` and add its import to `_index.css`.

---

## Built-in Themes

<div style="display: flex; gap: 1rem; flex-wrap: wrap; margin: 1.5rem 0;">
  <div style="flex: 1; min-width: 140px; padding: 1rem; background: #000000; border: 2px solid #ff8800;">
    <div style="font-size: 12px; color: #ff8800; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.5rem;">Neon</div>
    <div style="display: flex; gap: 4px; margin-bottom: 0.5rem;">
      <div style="width: 24px; height: 24px; background: #ff8800;"></div>
      <div style="width: 24px; height: 24px; background: #00ffff;"></div>
    </div>
    <div style="font-size: 10px; color: #9ca3af;">Classic cyberpunk</div>
  </div>
  <div style="flex: 1; min-width: 140px; padding: 1rem; background: #0a0a0a; border: 2px solid #6b7280;">
    <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.5rem;">Grayscale</div>
    <div style="display: flex; gap: 4px; margin-bottom: 0.5rem;">
      <div style="width: 24px; height: 24px; background: #6b7280;"></div>
      <div style="width: 24px; height: 24px; background: #5b9fc7;"></div>
    </div>
    <div style="font-size: 10px; color: #9ca3af;">Professional</div>
  </div>
  <div style="flex: 1; min-width: 140px; padding: 1rem; background: #0c1929; border: 2px solid #3b82f6;">
    <div style="font-size: 12px; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.5rem;">Ice</div>
    <div style="display: flex; gap: 4px; margin-bottom: 0.5rem;">
      <div style="width: 24px; height: 24px; background: #3b82f6;"></div>
      <div style="width: 24px; height: 24px; background: #a5f3fc;"></div>
    </div>
    <div style="font-size: 10px; color: #9ca3af;">Cold precision</div>
  </div>
  <div style="flex: 1; min-width: 140px; padding: 1rem; background: #0a1f0a; border: 2px solid #22c55e;">
    <div style="font-size: 12px; color: #22c55e; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.5rem;">Forest</div>
    <div style="display: flex; gap: 4px; margin-bottom: 0.5rem;">
      <div style="width: 24px; height: 24px; background: #22c55e;"></div>
      <div style="width: 24px; height: 24px; background: #fcd34d;"></div>
    </div>
    <div style="font-size: 10px; color: #9ca3af;">Nature meets tech</div>
  </div>
</div>

### Neon (Default)
Warm orange primary against electric cyan accents.

**Mood:** Warm firelight in digital darkness. Classic cyberpunk.

### Grayscale
Muted, professional. Same structure, desaturated palette.

**Mood:** Professional terminal. Corporate secure. Less expressive.

### Ice
Cool blue tones. Winter aesthetic with cyan highlights.

**Mood:** Cold precision. High-tech laboratory. Arctic networks.

### Forest
Natural greens with amber accents. Organic meets digital.

**Mood:** Nature reclaiming technology. Matrix-era nostalgia.

---

## Using Themes

### Keyboard Shortcut
Press **T** to cycle through available themes. The choice persists in localStorage.

### JavaScript API

```javascript
import { setTheme, cycleTheme, getTheme, getAvailableThemes } from './plaza.js';

// Get current theme
const current = getTheme(); // 'neon', 'grayscale', 'ice', or 'forest'

// Set a specific theme
setTheme('ice');

// Cycle to next theme
cycleTheme();

// List all available themes
const themes = getAvailableThemes(); // ['neon', 'grayscale', 'ice', 'forest']
```

### Theme Change Event
Components can listen for theme changes:

```javascript
window.addEventListener('plaza-theme-change', (e) => {
  console.log('Theme changed to:', e.detail.theme);
});
```

---

## Theme Anatomy

Every theme defines the same set of CSS variables. Understanding these is essential for creating custom themes.

### Core Color Variables

| Variable | Purpose |
|----------|---------|
| `--color-primary-500` | Main brand color for borders, buttons, text |
| `--color-primary-300` to `--color-primary-950` | Lighter/darker variants |
| `--color-accent-400` | Secondary highlight color |
| `--color-accent-500` to `--color-accent-950` | Accent variants |
| `--color-bg-base` | Page background (usually `#000000`) |
| `--color-bg-primary` | Subtle tinted background |

### RGB Variables (for rgba())

CSS variables can't be used directly in `rgba()`. We provide RGB versions:

| Variable | Used For |
|----------|----------|
| `--color-primary-500-rgb` | `rgba(var(--color-primary-500-rgb), 0.5)` |
| `--color-accent-400-rgb` | Accent color with alpha |

### Canvas Variables

The canvas (grid, sun, horizon) reads these variables:

| Variable | What It Colors |
|----------|----------------|
| `--canvas-grid` | Perspective grid lines |
| `--canvas-sun-core` | Sun center color |
| `--canvas-sun-glow` | Sun outer glow |
| `--canvas-horizon-glow` | Horizon line effect |
| `--canvas-ambient` | Background ambient light |

### Glow Control

```css
--enable-glow: 1;  /* Glow effects on */
--enable-glow: 0;  /* Glow effects off */
```

Components use this in calculations:
```css
box-shadow: 0 0 15px rgba(var(--color-primary-500-rgb), calc(0.4 * var(--enable-glow)));
```

---

## Creating Custom Themes

### Runtime Registration

Register a theme at runtime using `registerTheme()`:

```javascript
import { registerTheme, setTheme } from './plaza.js';

registerTheme('midnight', {
  name: 'midnight',
  colors: {
    primary: {
      300: '#c4b5fd',
      400: '#a78bfa',
      500: '#8b5cf6',  // Main purple
      600: '#7c3aed',
      700: '#6d28d9',
    },
    accent: {
      400: '#f472b6',  // Pink
      500: '#ec4899',
    },
    gray: {
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },
  },
  rgb: {
    primary500: '139, 92, 246',
    accent400: '244, 114, 182',
  },
  background: {
    base: '#000000',
    primary: '#1a0a2e',
  },
  enableGlow: 1,
  canvas: {
    grid: 'rgba(139, 92, 246, 0.35)',
    sunCore: 'rgba(244, 114, 182, 0.8)',
    sunGlow: 'rgba(139, 92, 246, 0.6)',
    horizonGlow: 'rgba(139, 92, 246, 0.4)',
    ambient: 'rgba(139, 92, 246, 0.25)',
  },
});

// Activate it
setTheme('midnight');
```

Custom themes persist in localStorage and reload automatically.

### CSS-Only Themes (Built-in)

To add a new built-in theme:

1. Create a new file in `plaza-core/themes/` (e.g., `midnight.css`):

```css
/* midnight.css - Plaza Midnight Theme */
[data-theme="midnight"] {
  --color-primary-500: #8b5cf6;
  --color-primary-500-rgb: 139, 92, 246;
  /* ... all other variables ... */
}
```

2. Import it in `themes/_index.css`:

```css
@import './neon.css';
@import './grayscale.css';
@import './ice.css';
@import './forest.css';
@import './midnight.css';  /* Add here */
```

3. Register it in `plaza.js`:

```javascript
const themeRegistry = {
  neon: null,
  grayscale: null,
  ice: null,
  forest: null,
  midnight: null,  // Add here
};
```

---

## Theme Design Guidelines

### Rule 1: Maintain Contrast
Primary color must be readable on black. Test with at least 4.5:1 contrast ratio.

### Rule 2: Complementary Accents
Accent should contrast with primary, not clash. Use color wheel opposites or analogous colors.

Good pairs:
- Orange + Cyan (neon)
- Blue + Light Cyan (ice)
- Green + Amber (forest)
- Purple + Pink (midnight example)

### Rule 3: Glow Matches Mood
- **Enable glow** for vibrant, energetic themes (neon, ice, forest)
- **Disable glow** for subdued, professional themes (grayscale)

### Rule 4: Canvas Harmony
Canvas colors should feel like part of the same world:
- Sun core: Often the accent or a light variant
- Grid: Primary color at low opacity
- Ambient: Primary with very low opacity

### Rule 5: Test All Components
Before finalizing a theme, verify it works with:
- Buttons (all variants)
- Window frames (header, footer, brackets)
- Side panels (hover states)
- Particles and effects

---

## Canvas Integration

The canvas automatically responds to theme changes. The `getCanvasColors()` function reads CSS variables:

```javascript
import { getCanvasColors } from './plaza.js';

const colors = getCanvasColors();
// {
//   grid: 'rgba(255, 100, 0, 0.35)',
//   sunCore: 'rgba(255, 200, 100, 0.8)',
//   sunGlow: 'rgba(255, 136, 0, 0.6)',
//   horizonGlow: 'rgba(255, 136, 0, 0.4)',
//   ambient: 'rgba(255, 136, 0, 0.25)',
// }
```

The canvas listens for `plaza-theme-change` events and updates automatically.

---

## TypeScript Types

For TypeScript projects, import the theme types:

```typescript
import type { PlazaTheme, CanvasColors } from './plaza';

const myTheme: PlazaTheme = {
  name: 'custom',
  colors: { /* ... */ },
  rgb: { /* ... */ },
  background: { /* ... */ },
  enableGlow: 1,
  canvas: { /* ... */ },
};
```

---

## The Summary

**Themes change colors, not personality.** Every theme should still feel like Plaza — dark, sharp-edged, typographic, terminal-like.

**The API:**
- `setTheme(name)` — Switch to a theme
- `cycleTheme()` — Rotate through themes
- `getTheme()` — Get current theme name
- `getAvailableThemes()` — List all themes
- `registerTheme(name, config)` — Add custom themes
- `getCanvasColors()` — Get current canvas colors

**The variables:**
- `--color-primary-*` — Main interactive color
- `--color-accent-*` — Secondary highlight color
- `--canvas-*` — Canvas rendering colors
- `--enable-glow` — Toggle glow effects (0 or 1)
