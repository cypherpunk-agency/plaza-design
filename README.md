# Plaza Design Kit

A standalone design system for the Plaza cyberpunk terminal aesthetic.

---

## Overall Aesthetic: Terminal Retro-Futurism

Plaza evokes the feeling of a **hacker's command terminal from a cyberpunk future**. It's as if you're accessing a decentralized social network through a CRT monitor in a dimly lit room, with neon lights bleeding through the window blinds.

The design sits at the intersection of **1980s terminal interfaces** and **sci-fi holographic displays** — think Blade Runner meets MS-DOS.

---

## Visual Identity

### Mood & Atmosphere
- **Dark and immersive** — pure black backgrounds create depth and make colors pop
- **Glowing and electric** — neon color accents suggest digital energy and life
- **Utilitarian yet beautiful** — function-first design elevated by careful color choices
- **Secretive and underground** — feels like exclusive access to hidden channels

### Typography
All text uses **IBM Plex Mono**, a modern monospace typeface. Every character occupies equal space, reinforcing the terminal metaphor. Text feels typed rather than printed.

Headlines are bold and UPPERCASE, evoking system commands. Body text is mixed case for readability but maintains the technical character.

---

## Color Language

### Primary: Warm Orange
A spectrum from **burnt amber (#ff8800)** down to **deep rust browns**. This is the dominant color — it appears on borders, active text, buttons, and interactive elements. The orange feels warm and inviting against the cold black, like firelight in darkness.

### Accent: Electric Cyan
**Bright cyan (#00ffff)** serves as a highlight for special elements — your own messages, important indicators, secondary actions. It creates visual contrast against the warm orange, suggesting different system states or user ownership.

### Backgrounds: Deep Black
**Pure black (#000000)** dominates, with subtle orange-tinted dark browns for hover states and selected items. The darkness makes the interface feel infinite and the colored elements feel like they're floating in space.

### Semantic Colors
- **Red/Magenta (#ff0055)** — errors, danger, destructive actions
- **Yellow (#eab308)** — warnings, caution, attention needed
- **Green (#22c55e)** — success, confirmation, positive feedback

---

## Shapes & Geometry

### Sharp Corners Only
**No rounded corners anywhere.** Every element — buttons, inputs, modals, containers — has hard 90-degree angles. This is non-negotiable for maintaining the terminal aesthetic. Rounded corners would feel too friendly, too modern, too "app-like."

### Strong Borders
**2-pixel borders** define interactive elements (buttons, inputs, modals). **1-pixel borders** contain passive information (info boxes, section containers). This distinction helps users understand what's clickable.

### Dividing Lines
Thick horizontal and vertical borders (2px) separate major interface regions — the sidebar from content, the header from body, the input area from messages.

---

## Light & Glow Effects

### Neon Text Shadows
Important headings emit a soft glow of their own color, as if lit from within. This creates the "neon sign" effect characteristic of cyberpunk aesthetics.

### Box Shadows
Buttons and inputs have subtle orange glow shadows, suggesting they're powered and ready. The glow intensifies on hover, like a switch warming up.

### Scanlines (Optional)
A faint horizontal line pattern can overlay the interface, mimicking old CRT monitors. This is decorative but enhances the retro feel.

### Theme Variant: Grayscale
An alternative theme removes all color and glow, rendering the interface in pure grays and muted blues. This is for users who prefer reduced visual stimulation or higher contrast.

---

## Iconography & Symbols

### Terminal Characters as Icons
Rather than graphic icons, Plaza uses **ASCII and Unicode characters** as visual elements:

| Symbol | Meaning |
|--------|---------|
| `>` | Command prompt, input prefix, navigation arrow |
| `#` | Channel prefix |
| `[ ]` | Enclosures for timestamps, status codes |
| `x` | Close, dismiss |
| `█` | Loading cursor (blinking) |
| `▶` | Send, action, play |
| `!` | Warning |
| `⚠` | Error, danger |
| `✓` | Success, confirmation |

This typography-as-icons approach maintains the text-only terminal illusion.

---

## Layout Philosophy

### Dense but Breathable
Information is packed efficiently — no wasted space — but generous padding inside elements prevents claustrophobia. The interface respects the user's time while remaining legible.

### Three-Column Desktop
On larger screens: navigation sidebar (left), main content (center), user panel (right). Borders clearly separate each zone.

### Mobile: Drawers & Tabs
On small screens, sidebars transform into **slide-out drawers** (from edges) and navigation becomes **bottom tabs**. Touch targets are minimum 44px for comfortable tapping.

---

## Interactive Feedback

### Hover States
Elements brighten on hover — borders shift from the base orange (#ff8800) to a lighter shade (#fb923c), backgrounds add a subtle warm tint. The interface responds to attention.

### Disabled States
Disabled elements become **70% opacity**, maintaining their color identity but clearly indicating unavailability. Glow effects disappear.

### Loading States
A **blinking block cursor (█)** appears next to loading text, mimicking a terminal awaiting input. Text typically shows "LOADING...", "SENDING...", etc.

### Selection
Selected items gain a **left border accent** and **darker background fill**, creating a clear "current location" indicator.

---

## Voice & Tone

Text in the interface is:
- **UPPERCASE for labels and headers** — feels like system commands
- **Bracketed for metadata** — `[12:34:56]`, `[ENCRYPTED MESSAGE]`
- **Direct and technical** — "SUBMIT", "SEND", not "Let's go!" or "Share your thoughts"
- **Status-oriented** — `[BLOCKCHAIN STORAGE ACTIVE]`, `[CONNECTION ESTABLISHED]`

The interface speaks like a machine, but a friendly one.

---

## Summary: The Plaza Look

**Plaza looks like:** A secure terminal interface for the decentralized future — dark, glowing, sharp-edged, and exclusively typographic. Orange neon warmth against infinite black, cyan highlights for personal elements, everything in monospace, no curves anywhere.

**Plaza feels like:** Accessing something exclusive and powerful. You're not just using an app — you're operating a system. The aesthetic rewards attention and creates a sense of being "in the know."

---
---

# Usage

## Files

| File | Description |
|------|-------------|
| `plaza.css` | Standalone CSS design system (no dependencies) |
| `plaza.js` | Utility JS module (theme, clock, effects, data generation) |
| `demo-single.html` | All-in-one HTML demo |
| `demo-modular.html` | Modular HTML demo (imports CSS/JS) |
| `demo-react/` | React demo application |

---

## Quick Start

### HTML (Modular)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Plaza Page</title>
  <link rel="stylesheet" href="plaza.css">
</head>
<body class="bg-black min-h-screen">
  <h1 class="text-4xl font-bold text-primary-500 text-shadow-neon">
    WELCOME
  </h1>

  <button class="plaza-btn">ENTER</button>
  <button class="plaza-btn plaza-btn--secondary">ABOUT</button>

  <script type="module">
    import { initPlazaTheme, startClock } from './plaza.js';

    initPlazaTheme();
    startClock('clock');
  </script>
</body>
</html>
```

### React

```tsx
import { useEffect } from 'react';
import './plaza.css';
import { initPlazaTheme, startClock, initGridCanvas } from './plaza.js';

function App() {
  useEffect(() => {
    initPlazaTheme();
    const clockInterval = startClock('clock');
    const grid = initGridCanvas('grid-canvas');
    grid.start();

    return () => {
      clearInterval(clockInterval);
      grid.stop();
    };
  }, []);

  return (
    <div className="bg-black min-h-screen relative">
      <canvas id="grid-canvas" className="fixed inset-0 z-0" />
      <div className="relative z-10 p-8">
        <h1 className="text-4xl font-bold text-primary-500 text-shadow-neon">
          PLAZA
        </h1>
        <span id="clock" className="text-primary-600 text-sm" />
      </div>
    </div>
  );
}
```

---

## CSS Classes Reference

### Typography
- `.text-xs` to `.text-6xl` — Font sizes
- `.font-bold`, `.font-semibold`, `.font-medium` — Font weights
- `.uppercase`, `.tracking-wider`, `.tracking-widest` — Text transforms

### Colors
- `.text-primary-300` to `.text-primary-800` — Orange text shades
- `.text-accent-400` to `.text-accent-600` — Cyan text shades
- `.bg-primary-900`, `.bg-primary-950` — Dark orange backgrounds
- `.border-primary-500`, `.border-primary-700` — Orange borders

### Effects
- `.text-shadow-neon` — Strong neon text glow
- `.text-shadow-neon-sm` — Subtle text glow
- `.shadow-neon-button` — Button box shadow
- `.shadow-neon-accent` — Cyan box shadow
- `.terminal-cursor` — Blinking cursor animation
- `.scanline` — CRT scanline overlay

### Components
- `.plaza-btn` — Primary button
- `.plaza-btn--secondary` — Secondary/cancel button
- `.plaza-btn--accent` — Cyan accent button
- `.plaza-window` — Framed window container
- `.plaza-window-header` — Window header bar
- `.plaza-window-footer` — Window footer bar
- `.plaza-corner-bracket` — Corner decorations
- `.plaza-side-panel` — Side panel container
- `.plaza-hex-scroll` — Scrolling hex data effect
- `.plaza-particle` — Floating particle
- `.plaza-glitch` — Glitch effect on hover

---

## JavaScript API

### Theme

```javascript
import { initPlazaTheme, toggleTheme, getTheme } from './plaza.js';

// Initialize theme (loads from localStorage)
initPlazaTheme();

// Or with a toggle button
initPlazaTheme('theme-toggle-btn');

// Manual toggle
toggleTheme();

// Get current theme: 'neon' | 'grayscale'
const theme = getTheme();
```

### Clock

```javascript
import { startClock } from './plaza.js';

// Full format: 2024-01-15 14:30:45 UTC
const intervalId = startClock('clock-element', 'full');

// Time only: 14:30:45
startClock('clock-element', 'time');

// Date only: 2024-01-15
startClock('clock-element', 'date');

// Cleanup
clearInterval(intervalId);
```

### Grid Canvas

```javascript
import { initGridCanvas } from './plaza.js';

const grid = initGridCanvas('canvas-id');
grid.start();    // Start animation
grid.stop();     // Stop animation
grid.resize();   // Manual resize
```

### Particles

```javascript
import { createParticles } from './plaza.js';

// Create 25 floating particles
createParticles('container-id', 25);
```

### Data Generation

```javascript
import {
  generateTelemetry,
  generateNetLog,
  generateStatus,
  generateHexData
} from './plaza.js';

// Fake telemetry data
const telemetry = generateTelemetry();
// { nodeId, latency, peers, blocks, hashRate, uptime, mempool, syncStatus }

// Network log entries
const logs = generateNetLog(5);
// ['[PEER_CONNECTED] 192.168.1.1 (200/45ms)', ...]

// Status data
const status = generateStatus();
// { connections, bandwidth, encryption, protocol, tls, mode }

// Random hex string
const hex = generateHexData(500);
// 'A3F8B2C1D9E4...'
```

### All-in-One Initialization

```javascript
import { initPlazaDemo } from './plaza.js';

const { cleanup, gridController } = initPlazaDemo({
  clockId: 'clock',
  canvasId: 'grid-canvas',
  particlesId: 'particles',
  titleId: 'title',
  telemetryId: 'telemetry',
  routesId: 'routes',
  keysId: 'keys',
  netLogId: 'netlog',
  statusId: 'status',
  hexLeftId: 'hex-left',
  hexRightId: 'hex-right',
  particleCount: 25,
  telemetryRefresh: 5000,
  netLogRefresh: 3000,
  hexRefresh: 2000,
});

// Later: cleanup all intervals and animations
cleanup();
```

---

## Demos

### demo-single.html
Self-contained HTML file with all CSS and JS inlined. Open directly in browser — no server needed.

### demo-modular.html
HTML file that imports `plaza.css` and `plaza.js`. Requires a local server due to ES module imports:

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve .
```

Then open `http://localhost:8000/demo-modular.html`

### demo-react/
React application demonstrating the design kit:

```bash
cd demo-react
npm install
npm run dev
```

Open `http://localhost:5173`

---

## Browser Support

- Chrome 90+
- Firefox 90+
- Safari 14+
- Edge 90+

CSS custom properties and ES modules are required.

---

## License

MIT License - Part of the Plaza project.
