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

**Hover Behavior:** When hovering anywhere in the sidebar, hex scroll opacity increases from 0.4 to 0.7.

**Note:** The content is nonsense. That's the point.

---

### 7. Side Panel Blocks

**What:** Bordered containers that group related data in side panels.

**Class:** `.plaza-side-panel__block`

**When to use:** Organizing telemetry, routes, keys, or status data into visual groups.

**Visual:** Orange border, dark background, subtle inset shadow.

```css
.plaza-side-panel__block {
  border: 1px solid rgba(255, 122, 0, 0.35);
  background: rgba(0, 0, 0, 0.25);
  padding: 10px;
  box-shadow: inset 0 0 14px rgba(255, 136, 0, 0.05);
}
```

---

### 8. Footer Terminal

**What:** A disabled terminal input area suggesting the system awaits authentication.

**Classes:**
- `.footer-timestamp` - UTC timestamp display
- `.footer-terminal` - "TERMINAL" label
- `.footer-prompt` - ">" prompt character
- `.footer-input-area` - Flex container for input region
- `.footer-not-auth` - "[ NOT AUTHENTICATED ]" message
- `.footer-send-btn` - Send button
- `.footer-send-btn--disabled` - Disabled state

**Psychology:** Suggests a locked system. The user sees what they *could* do if they were authenticated. Creates anticipation.

```html
<div class="plaza-window-footer">
  <span class="footer-timestamp">2026-01-09 12:00:00 UTC</span>
  <span class="footer-terminal">TERMINAL</span>
  <span class="footer-prompt">&gt;</span>
  <span class="footer-input-area">
    <span class="footer-not-auth">[ NOT AUTHENTICATED ]</span>
  </span>
  <button class="footer-send-btn footer-send-btn--disabled" disabled>▶ SEND</button>
</div>
```

---

### 9. Error States

**What:** Subdued red text for non-critical error messages in ambient data.

**Class:** `.text-dim-red`

**When to use:** Displaying errors that are atmospheric rather than actionable. Part of the "living system" illusion.

**Example:** `500: connection reset` in a status panel.

```css
.text-dim-red { color: rgba(255, 60, 80, 0.6); }
```

---

### 10. Scanline Hover Effect

**What:** Horizontal scanlines that appear over buttons on hover.

**Implementation:** `::before` pseudo-element with `repeating-linear-gradient`.

**When to use:** Built into `.plaza-btn`. Activates automatically on hover.

**Psychology:** Reinforces the CRT/terminal aesthetic. Makes interactions feel "analog."

```css
.plaza-btn::before {
  content: "";
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.15),
    rgba(0, 0, 0, 0.15) 1px,
    transparent 1px,
    transparent 2px
  );
  opacity: 0;
  transition: opacity 0.3s ease;
}

.plaza-btn:hover::before {
  opacity: 1;
}
```

---

### 11. Block Hover Activation

**What:** Side panel blocks become "active" and fully visible on hover.

**Class:** `.plaza-side-panel__block:hover`

**When to use:** Built into all side panel blocks. Activates automatically.

**Psychology:** Dim ambient data becomes readable on demand. The user "focuses" the block by hovering, bringing it to attention without cluttering the default view.

**Behavior:**
| Property | Default | Hover |
|----------|---------|-------|
| Text color | rgba(255,255,255,0.44) | rgba(255,255,255,0.88) |
| Background | rgba(0,0,0,0.25) | rgba(0,0,0,0.55) |
| Border | rgba(255,122,0,0.35) | rgba(255,122,0,0.6) |
| Box shadow | 0.05 alpha | 0.12 alpha |
| Header | rgba(255,122,0,0.75) | rgba(255,122,0,1) |

**Color Preservation:** Special colors brighten but don't turn white:
- `.text-ambient-cyan` → rgba(57,230,255,0.9)
- `.text-ambient-amber` → rgba(255,177,74,0.9)
- `.text-dim-red` → rgba(255,60,80,0.85)

**Transition:** All properties use `0.2s ease`.

---

### 12. Sidebar Border Activation

**What:** The vertical sidebar border becomes more visible when hovering anywhere in the panel.

**Class:** `.plaza-side-panel--left:hover`, `.plaza-side-panel--right:hover`

**When to use:** Built into side panels. Activates automatically.

**Behavior:** Border opacity doubles (0.12 → 0.24 alpha cyan).

**Psychology:** Subtle acknowledgment that the user has entered the sidebar zone.

---

## Animation Specifications

Precise values for background gimmicks:

| Gimmick | Property | Value |
|---------|----------|-------|
| Hex scroll | opacity | 0.4 |
| Hex scroll | font-size | 8px |
| Hex scroll | animation | `scrollText 30s linear infinite` |
| Particles | size | 1px |
| Particles | animation | `float 10s infinite ease-in-out` |
| Particles | clip-path | Clips to top 65% of viewport (above horizon) |
| Button scanline | transition | `opacity 0.3s ease` |
| Living data | update interval | 3-8 seconds depending on element |
| Node count | drift range | 20-70, max delta 3 |

---

## Canonical Content

Reference content for the landing page:

### Header
- **Left:** `INITIATING CONNECTION...` + `PROTOCOL ONLINE` (green tint)
- **Right:** `NODES: XX ACTIVE` (where XX drifts 20-70)

### Center
- **Title:** `[CYPHERPUNK.AGENCY]`
- **Subtitle:** `DECENTRALIZED SOCIAL` + `EVOLUTION`
- **Evolution Easter Egg:** Hovering "EVOLUTION" glitches to reveal "REVOLUTION"
- **Button:** `enter` (uses `.plaza-btn--tease` variant)

### Footer
```
timestamp | TERMINAL | > | [ NOT AUTHENTICATED ] | ▶ SEND
```

### Left Panel
- **Telemetry block:** peer_count, latency, packet_loss, mem_resident, cpu_load (with dots alignment)
- **Routes block:** `/enter` (disabled), `/polkadot-treasury-monitor` (cyan link)
- **Keys block:** `[Enter] proceed`, `[T] toggle theme`
- **Hex scroll**

### Right Panel
- **Processes block:** `VERB.CHANNEL... CODE (XXms)` format with amber-colored verb
  - Verbs: SYNC, VERIFY, ROUTE, HANDSHAKE, ATTEST
  - Channels: L1, P2P, RPC, MESH, L2
- **Updates block:** `500: connection reset` (error only)
- **Hex scroll**

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

## Implementation Patterns

### Color Preservation on Hover

When implementing hover states that brighten text, avoid blanket selectors like `element:hover *`. This overrides all child colors. Instead:

1. Set the base text color on the parent
2. Explicitly preserve special color classes with their own hover rules

```css
/* BAD - overwrites all colors */
.block:hover * { color: white; }

/* GOOD - preserves special colors */
.block:hover { color: white; }
.block:hover .text-cyan { color: brighter-cyan; }
.block:hover .text-amber { color: brighter-amber; }
```

This pattern ensures that semantic colors (cyan for links, amber for verbs, red for errors) remain visible and meaningful even when the surrounding text brightens.

---

## Creating New Gimmicks

Before adding a new gimmick, ask:

1. **Does it fit the terminal aesthetic?**
2. **Is it discoverable but not mandatory?**
3. **Does it reward attention without demanding it?**
4. **Can it be ignored without losing functionality?**

If yes to all four, build it.
