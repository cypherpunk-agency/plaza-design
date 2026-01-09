# Gimmicks

Interactions that surprise, delight, or create personality. Not essential, but memorable.

---

## What's a Gimmick?

A gimmick is a design element that exists purely for *vibe*. It doesn't convey critical information. It doesn't enable core functionality. It makes the interface feel alive, playful, or mysterious.

Gimmicks reward attention but shouldn't demand it.

---

## The Gimmicks

### 1. Tease Button

**What:** A button that looks fully enabled but disables on hover.

**Class:** `.plaza-btn--tease`

**When to use:** "Coming soon" features, locked content, building anticipation.

**Psychology:** The user reaches for it, then it pulls away. Creates desire.

```css
.plaza-btn--tease:hover {
  background: var(--color-gray-900);
  color: var(--color-gray-700);
  cursor: not-allowed;
}
```

---

### 2. Living Data

**What:** Fake telemetry that drifts smoothly instead of jumping randomly.

**Function:** `adjustValue(current, min, max, maxDelta)`

**When to use:** Any fake data display that should feel like it's monitoring a real system.

**Psychology:** Random jumps feel fake. Smooth drift feels like a real sensor.

```javascript
// Instead of: Math.random() * 100
// Use: adjustValue(previousValue, 0, 100, 5)

// The value moves by at most 5 units from its previous state
// Creating the illusion of continuity
```

**Import from plaza.js:**
```javascript
import { adjustValue } from './plaza.js';
```

---

### 3. Evolution Text

**What:** Text that glitches to reveal an alternate word on hover.

**Class:** `.evolution-text`

**Attribute:** `data-hover="ALTERNATE TEXT"`

**When to use:** Easter eggs, brand personality, subversive messaging.

**Example:** "EVOLUTION" glitches to reveal "REVOLUTION"

```html
<span class="evolution-text" data-hover=" REVOLUTION">
  EVOLUTION
</span>
```

---

### 4. Ambient Typography

**What:** Low-opacity text meant to be glanced at, not read.

**Classes:** `.text-ambient-cyan`, `.text-ambient-amber`

**When to use:** Background atmosphere, side panel decorations, "hacker aesthetic" filler.

**Note:** Content can be meaningless (hex strings, fake coordinates). It's scenery.

---

### 5. Route Links

**What:** Navigation links that glow cyan on hover.

**Class:** `.route-link`

**When to use:** Any navigation that should feel like accessing system paths.

**Psychology:** The glow suggests "activating" a pathway, not just clicking a link.

---

### 6. Hex Scroll

**What:** Continuously scrolling random hex data.

**Class:** `.plaza-hex-scroll`

**When to use:** Filling empty space in side panels, creating "data processing" atmosphere.

**Note:** The content is nonsense. That's the point.

---

## Dosage Guidelines

### One gimmick per viewport
**Result:** Engaging. The eye finds it. It delights.

### Two gimmicks visible at once
**Result:** Playful. The interface feels alive and curious.

### Three or more gimmicks visible
**Result:** Chaos. Nothing feels special because everything is competing.

---

## The Hierarchy of Gimmicks

Not all gimmicks are equal:

| Level | Type | Examples |
|-------|------|----------|
| **Background** | Passive, always-on | Hex scroll, particles, grid |
| **Ambient** | Visible but ignorable | Living data, ambient typography |
| **Interactive** | Responds to user action | Tease button, evolution text |
| **Easter egg** | Hidden, discoverable | Keyboard shortcuts, hover reveals |

**Rule:** You can stack background gimmicks, but only one interactive gimmick per viewport.

---

## When NOT to Use Gimmicks

- **Critical user flows** — Don't put a tease button on checkout
- **Error states** — Keep it simple when something's wrong
- **Forms** — Input fields should be predictable
- **First-time user experience** — Gimmicks reward returning users, not new ones

---

## Creating New Gimmicks

Before adding a new gimmick, ask:

1. **Does it fit the terminal aesthetic?**
2. **Is it discoverable but not mandatory?**
3. **Does it reward attention without demanding it?**
4. **Can it be ignored without losing functionality?**

If yes to all four, build it.
