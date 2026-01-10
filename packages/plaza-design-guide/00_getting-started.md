# Getting Started

Set up Plaza in your project in under a minute.

---

## Installation

```bash
# npm
npm install plaza-design-core

# pnpm
pnpm add plaza-design-core
```

---

## Import the CSS

Add the Plaza stylesheet to your project:

```javascript
// In your main entry file (main.js, index.js, App.tsx, etc.)
import 'plaza-design-core/plaza.css';
```

Or in plain HTML:

```html
<link rel="stylesheet" href="node_modules/plaza-design-core/plaza.css">
```

---

## Add the `.plaza` Class

Apply the `.plaza` class to any container. All descendant elements inherit Plaza styling.

### Option 1: Entire Page

```html
<body class="plaza">
  <!-- Everything gets Plaza styling -->
</body>
```

### Option 2: Specific Section

```html
<body>
  <header><!-- Regular styling --></header>

  <article class="plaza">
    <!-- Plaza styling here -->
  </article>

  <footer><!-- Regular styling --></footer>
</body>
```

### Option 3: Component Level

```html
<div class="plaza">
  <h1>This heading is styled</h1>
  <p>This paragraph too</p>
</div>

<div>
  <p>This is NOT styled by Plaza</p>
</div>
```

---

## What `.plaza` Does

The `.plaza` class applies Plaza's typography and element styling to all descendants:

| Element | Styling |
|---------|---------|
| `h1` - `h6` | Uppercase, themed colors, proper spacing |
| `p` | Body text color, comfortable line height |
| `a` | Accent color, glow on hover |
| `strong` | Primary color emphasis |
| `em` | Accent color emphasis |
| `code` | Monospace, background highlight |
| `blockquote` | Left border, italic styling |
| `table` | Themed headers, row hover |
| `ul`, `ol` | Themed markers |
| `hr` | Subtle divider |

---

## Using Components

Plaza components use the `plaza-*` class prefix:

```html
<button class="plaza-btn">CLICK ME</button>

<input type="text" class="plaza-input" placeholder="Enter text...">

<div class="plaza-window">
  <div class="plaza-window-header">TITLE</div>
  <div class="plaza-window-content">Content here</div>
</div>
```

Components work anywhere — they don't require the `.plaza` wrapper.

---

## Theme Switching

Switch themes with JavaScript:

```javascript
import { setTheme, cycleTheme, getTheme } from 'plaza-design-core';

// Set a specific theme
setTheme('ice');  // 'neon', 'grayscale', 'ice', 'forest'

// Cycle through themes
cycleTheme();

// Get current theme
const current = getTheme();
```

Or add a keyboard shortcut:

```javascript
document.addEventListener('keydown', (e) => {
  if (e.key === 't' || e.key === 'T') {
    cycleTheme();
  }
});
```

---

## Minimal Example

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="node_modules/plaza-design-core/plaza.css">
</head>
<body class="plaza">
  <h1>Welcome to Plaza</h1>
  <p>Your content is now <strong>styled</strong>.</p>

  <button class="plaza-btn">GET STARTED</button>
</body>
</html>
```

---

## Next Steps

- [Theming](./07_theming.md) — Customize colors and create themes
- [Forms](./08_forms.md) — Input fields and validation states
- [Modals](./09_modals.md) — Dialog windows
- [Typography](./04_typography.md) — Font scale and weights
