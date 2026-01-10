# Plaza Design Core

Foundation CSS package: tokens, themes, and components.

## File Structure

```
tokens.css              → Global tokens (spacing, typography, effects, z-index)
themes/
  _index.css            → Theme imports
  neon.css              → Default theme (orange + cyan)
  ice.css               → Cool theme (blue + magenta)
  forest.css            → Nature theme (green + amber)
  grayscale.css         → Neutral theme (grays)
  modern.css            → Enterprise theme (slate blue)
base.css                → Reset, body styles, scrollbars
utilities.css           → Helper classes
animations.css          → @keyframes
components/             → UI component styles
plaza.css               → Main entry point
```

## Token Categories

### Global Tokens (tokens.css)

```css
/* Typography */
--text-xs: 13px;           --line-height-tight: 1.1;
--text-sm: 16px;           --line-height-normal: 1.5;
--text-base: 18px;         --letter-spacing-wider: 0.1em;
--text-lg: 20px;           --letter-spacing-widest: 0.2em;

/* Spacing (4px increments) */
--spacing-1: 0.25rem;      /* 4px */
--spacing-2: 0.5rem;       /* 8px */
--spacing-3: 0.75rem;      /* 12px */
--spacing-4: 1rem;         /* 16px */
--spacing-6: 1.5rem;       /* 24px */
--spacing-8: 2rem;         /* 32px */

/* Sizing */
--size-touch-target: 44px;
--width-sidebar: 240px;
--width-panel: 270px;

/* Effects */
--transition-fast: 0.15s ease;
--transition-normal: 0.2s ease;
--transition-slow: 0.3s ease;
--border-thin: 1px;
--border-medium: 2px;
--radius-sm: 3px;
--radius-full: 9999px;

/* Z-Index */
--z-overlay: 1000;
--z-modal: 1100;
--z-noise: 2000;
```

### Theme Tokens (themes/*.css)

Each theme MUST define:

```css
/* Palette */
--color-primary-300 through --color-primary-950
--color-accent-400 through --color-accent-950
--color-bg-base, --color-bg-primary, --color-bg-accent

/* States */
--color-error, --color-warning, --color-success

/* Semantic Text */
--color-text-body       /* Main text */
--color-text-muted      /* Secondary text */
--color-text-faint      /* Disabled/placeholder */
--color-text-heading    /* Headings */

/* Semantic Borders (three-tier system) */
--color-border-muted     /* Subtle: decorative, dividers */
--color-border-default   /* Standard: tables, panels, nav */
--color-border-strong    /* Prominent: windows, active states */

/* Glow control */
--enable-glow: 1;       /* or 0 to disable */

/* RGB variants (required for rgba()) */
--color-primary-500-rgb
--color-text-body-rgb
--color-bg-overlay-rgb
--color-error-rgb
--color-success-rgb
--color-warning-rgb

/* Canvas (for GridCanvas background) */
--canvas-grid, --canvas-sun-core, --canvas-sun-glow, etc.
```

## Component Guidelines

### Class Naming
- Prefix all classes with `.plaza-`
- Use BEM-style modifiers: `.plaza-btn--secondary`
- Use double-underscore for children: `.plaza-modal__header`

### Token Usage Rules

**ALWAYS use tokens:**
```css
/* Good */
color: var(--color-text-body);
padding: var(--spacing-4);
transition: all var(--transition-fast);
border: var(--border-thin) solid var(--color-border-default);
```

**NEVER hardcode:**
```css
/* Bad */
color: #9ca3af;
padding: 16px;
transition: all 0.15s ease;
border: 1px solid #374151;
```

### Transparency Pattern
```css
/* Use RGB variants with rgba() */
background: rgba(var(--color-bg-overlay-rgb), 0.4);
box-shadow: 0 0 10px rgba(var(--color-primary-500-rgb), 0.3);
```

### Border Pattern
```css
/* ALWAYS use semantic border tokens */
border: var(--border-thin) solid var(--color-border-default);
border: var(--border-thin) solid var(--color-border-muted);
border: var(--border-thin) solid var(--color-border-strong);

/* NEVER use rgba for borders */
/* Bad: border: 1px solid rgba(var(--color-primary-500-rgb), 0.3); */
```

### Glow Effect Pattern
```css
/* Respects themes that disable glow */
box-shadow: 0 0 15px rgba(var(--color-primary-500-rgb), calc(0.3 * var(--enable-glow)));
```

### Responsive Breakpoints
```css
@media (max-width: 768px) { }  /* Tablet */
@media (max-width: 640px) { }  /* Mobile */
```

## Adding a New Component

1. Create `components/[name].css`
2. Use `.plaza-[name]` prefix
3. Use semantic tokens throughout
4. Add import to `plaza.css`
5. Include responsive styles

## Adding a New Theme

1. Copy `themes/neon.css` as template
2. Change selector to `[data-theme="yourname"]`
3. Define all required tokens
4. Add import to `themes/_index.css`
5. Test with both demos

## Common Mistakes

- Using `--color-gray-*` instead of `--color-text-*` or `--color-border-*`
- Hardcoding `rgba(0,0,0,...)` instead of `rgba(var(--color-bg-overlay-rgb),...)`
- Forgetting RGB variants when adding new colors
- Not respecting `--enable-glow` for shadows
- Using `rgba(var(--color-primary-500-rgb), 0.3)` for borders instead of `--color-border-*` tokens
