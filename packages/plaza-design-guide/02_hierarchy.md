# Hierarchy

The most important design decision in Plaza: **what demands attention vs. what sets the mood.**

---

## The Rule

> If it responds to interaction → **thick & glowing**
> If it sets the mood → **thin & ambient**

<div style="display: flex; gap: 2rem; margin: 2rem 0;">
  <div style="flex: 1; text-align: center;">
    <div style="padding: 1.5rem; border: 2px solid var(--color-primary-500); box-shadow: 0 0 15px rgba(var(--color-primary-500-rgb), 0.4); background: rgba(var(--color-bg-overlay-rgb), 0.4);">
      <span style="color: var(--color-primary-400); text-transform: uppercase; letter-spacing: 0.1em;">Interactive</span>
    </div>
    <p style="font-size: 12px; color: var(--color-text-muted); margin-top: 0.5rem;">2px border • glow • 100% opacity</p>
  </div>
  <div style="flex: 1; text-align: center;">
    <div style="padding: 1.5rem; border: 1px solid rgba(var(--color-primary-500-rgb), 0.3); background: rgba(var(--color-bg-overlay-rgb), 0.2);">
      <span style="color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.7;">Decorative</span>
    </div>
    <p style="font-size: 12px; color: var(--color-text-muted); margin-top: 0.5rem;">1px border • no glow • 40-75% opacity</p>
  </div>
</div>

---

## Interactive Elements

**These demand attention. Users click, tap, or type into them.**

| Property | Value |
|----------|-------|
| Border width | 2px |
| Border color | High contrast orange (`#ff8800`) |
| Glow effects | Yes — box-shadow, text-shadow |
| Hover state | Brightens, glow intensifies |
| Opacity | 100% |

**Examples:**
- Buttons (`.plaza-btn`)
- Form inputs
- Modal dialogs
- Clickable navigation items
- Action triggers

**Characteristics:**
- CRT scanlines appear on hover
- Borders are solid, not translucent
- Colors are at full saturation
- Shadows pulse or breathe subtly

---

## Decorative Elements

**These create atmosphere. Users glance at them, not interact with them.**

| Property | Value |
|----------|-------|
| Border width | 1px |
| Border color | Low contrast, translucent (`rgba(255, 122, 0, 0.35)`) |
| Glow effects | Minimal or none |
| Hover state | None or subtle |
| Opacity | 40-75% |

**Examples:**
- Side panels (`.plaza-side-panel`)
- Scrolling hex data (`.plaza-hex-scroll`)
- Telemetry displays
- Corner brackets (`.plaza-corner-bracket`)
- Background grids
- Floating particles

**Characteristics:**
- Borders use `rgba()` for transparency
- Text at reduced opacity
- Animation is slow and ambient
- Content can be nonsense (hex data) — it's for mood

---

## The Footer Zone

The footer sits between interactive and decorative:

- **Decorative** when logged out (shows `[NOT AUTHENTICATED]`)
- **Interactive** when logged in (input field activates)

This creates anticipation — the interface promises future functionality.

---

## Visual Checklist

Before adding an element, ask:

1. **Will users click this?**
   - Yes → 2px border, full opacity, glow
   - No → 1px border, reduced opacity, no glow

2. **Does this communicate information?**
   - Critical info → Interactive styling
   - Ambient info → Decorative styling

3. **What happens on hover?**
   - Interactive → Visual feedback (brighten, glow)
   - Decorative → Nothing (or very subtle)

---

## Anti-Patterns

**Don't do this:**

- Thick glowing borders on background elements (too noisy)
- Faint borders on buttons (looks broken)
- Everything at 100% opacity (no depth)
- Everything with glow effects (overwhelming)
- Mixing rounded corners anywhere (breaks the aesthetic)

**The goal:** Clear visual hierarchy where the eye naturally goes to interactive elements first.
