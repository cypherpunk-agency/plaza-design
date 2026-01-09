# Color

Color in Plaza is **functional**, not decorative. Every color means something.

---

## The Rule

> **Cyan is yours. Orange is the system.** Everything else is structure.

---

## Semantic Meaning

| Color | Meaning | Examples |
|-------|---------|----------|
| **Cyan** (Primary) | User actions, interactive elements | Buttons, links, inputs |
| **Orange** (Accent) | System status, highlights, warnings | Alerts, badges, hover states |
| **Gray** | Structure, backgrounds, muted content | Panels, borders, secondary text |
| **Red** | Errors, destructive actions | Delete buttons, error messages |
| **Green** | Success, positive status | Confirmations, online indicators |
| **Amber** | Warnings, attention needed | Pending states, caution messages |

---

## Primary Palette (Cyan)

| Token | Hex | Use Case |
|-------|-----|----------|
| `--color-primary-300` | #7dd3fc | Bright highlights, glow |
| `--color-primary-400` | #38bdf8 | Primary text, active states |
| `--color-primary-500` | #0ea5e9 | Borders, buttons, links |
| `--color-primary-600` | #0284c7 | Hover states |
| `--color-primary-700` | #0369a1 | Pressed states |
| `--color-primary-800` | #075985 | Subtle backgrounds |

---

## Accent Palette (Orange)

| Token | Hex | Use Case |
|-------|-----|----------|
| `--color-accent-300` | #fdba74 | Bright highlights |
| `--color-accent-400` | #fb923c | Accent text, links |
| `--color-accent-500` | #f97316 | Borders, highlights |
| `--color-accent-600` | #ea580c | Hover states |
| `--color-accent-700` | #c2410c | Pressed states |
| `--color-accent-800` | #9a3412 | Subtle backgrounds |

---

## Gray Palette

| Token | Hex | Use Case |
|-------|-----|----------|
| `--color-gray-300` | #d1d5db | Bright text (rare) |
| `--color-gray-400` | #9ca3af | Primary body text |
| `--color-gray-500` | #6b7280 | Secondary text |
| `--color-gray-600` | #4b5563 | Muted text, hints |
| `--color-gray-700` | #374151 | Borders, dividers |
| `--color-gray-800` | #1f2937 | Panel backgrounds |
| `--color-gray-900` | #111827 | Deep backgrounds |

---

## Status Colors

| Token | Hex | Use Case |
|-------|-----|----------|
| `--color-error` | #ef4444 | Errors, destructive |
| `--color-success` | #22c55e | Success, positive |
| `--color-warning` | #eab308 | Warnings, attention |

### Dim Variants

For subtle status indicators:

| Class | Opacity | Use Case |
|-------|---------|----------|
| `.text-dim-red` | 60% | Subtle error text |
| `.text-dim-green` | 60% | Subtle success text |
| `.text-dim-amber` | 60% | Subtle warning text |

---

## Backgrounds

| Token | Value | Use Case |
|-------|-------|----------|
| `--bg-base` | #000000 | Page background |
| `--bg-elevated` | rgba(0,0,0,0.4) | Panels, cards |
| `--bg-overlay` | rgba(0,0,0,0.8) | Modal overlays |

---

## Opacity Patterns

| Opacity | Use Case |
|---------|----------|
| 100% | Interactive elements, primary text |
| 60–80% | Secondary content, descriptions |
| 30–40% | Borders, subtle dividers |
| 10–20% | Hover backgrounds, subtle fills |

---

## Glow Effects

Glow reinforces the cyberpunk aesthetic. Use sparingly.

```css
/* Button glow */
box-shadow: 0 0 20px rgba(var(--color-primary-500-rgb), 0.4);

/* Text glow on hover */
text-shadow: 0 0 10px rgba(var(--color-primary-500-rgb), 0.6);
```

Glow is controlled by `--enable-glow` (0 or 1) for theme switching.

---

## Theme Adaptation

Colors adapt across themes:

| Theme | Primary | Accent | Mood |
|-------|---------|--------|------|
| Neon | Cyan | Orange | Electric, vibrant |
| Grayscale | White | Gray | Minimal, stark |
| Ice | Light blue | Teal | Cold, clinical |
| Forest | Green | Amber | Organic, earthy |

See [Theming](./07_theming.md) for implementation details.

---

## Anti-Patterns

**Don't:**
- Use color alone to convey meaning (accessibility)
- Mix primary and accent for the same purpose
- Use bright colors for large areas
- Apply glow to everything

**Do:**
- Pair color with text/icons for clarity
- Keep backgrounds dark, let colors pop
- Use opacity to create depth
- Reserve glow for interactive elements

---

## Example: Status Messages

```html
<!-- Error -->
<p class="text-dim-red">[ERROR] Connection failed</p>

<!-- Success -->
<p class="text-dim-green">[OK] Transaction complete</p>

<!-- Warning -->
<p class="text-dim-amber">[WARN] Session expires in 5 minutes</p>
```
