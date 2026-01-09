# Plaza Design Guide

## Overall Aesthetic: Terminal Retro-Futurism

Plaza evokes the feeling of a **hacker's command terminal from a cyberpunk future**. It's as if you're accessing a decentralized social network through a CRT monitor in a dimly lit room, with neon lights bleeding through the window blinds.

The design sits at the intersection of **1980s terminal interfaces** and **sci-fi holographic displays** — think Blade Runner meets MS-DOS.

---

## Two Contexts: Functional UI vs. Decorative Ambient

Plaza has two distinct rendering contexts with different rules:

### Functional UI (Application Interface)

The main app where users read messages, navigate channels, fill forms, and interact with content.

**Goals:** Legibility, clear affordances, efficient information density

**Rules:**
- **Solid colors** from the palette (primary-500, accent-400, etc.)
- **2px borders** for interactive elements (buttons, inputs, modals)
- **1px borders** for non-interactive containers (info boxes, sections)
- **High contrast** text (primary-400 on black backgrounds)
- **Full opacity** on content elements
- **Neon glows** on important headings and interactive states

**Example uses:** Chat interface, sidebar navigation, forms, modals, settings

### Decorative Ambient (Landing & Splash)

Atmospheric screens that establish mood — landing pages, loading sequences, status displays.

**Goals:** Atmosphere, mystery, visual interest (not active reading)

**Rules:**
- **RGBA-based colors** with transparency: `rgba(255, 255, 255, 0.44)` instead of solid white
- **1px borders** everywhere (even on window frames) — slimmer, more elegant
- **Overall opacity reduction** (0.7-0.8) on decorative panels
- **Muted color palette:**
  - Text: `rgba(255, 255, 255, 0.44-0.72)` (ghostly white, not orange)
  - Headers: `rgba(255, 122, 0, 0.75)` (dimmed amber)
  - Borders: `rgba(255, 122, 0, 0.35-0.55)` (subtle amber)
  - Accents: `rgba(57, 230, 255, 0.12-0.25)` (hint of cyan)
- **Reduced glow intensity** — atmospheric, not attention-grabbing
- **Larger letter-spacing** (0.14em-0.22em) for stylized headers

**Example uses:** Landing page, splash screens, side panel "gimmicks", telemetry displays, status readouts

### Color Mapping: Functional vs. Ambient

| Element | Functional UI | Decorative Ambient |
|---------|---------------|---------------------|
| Primary text | `text-primary-400` (#fb923c) | `rgba(255, 255, 255, 0.72)` |
| Secondary text | `text-primary-600` (#ea580c) | `rgba(255, 255, 255, 0.44)` |
| Headers | `text-primary-500` (#ff8800) | `rgba(255, 122, 0, 0.75)` |
| Borders | `border-primary-500` (solid) | `rgba(255, 122, 0, 0.55)` |
| Cyan accent | `text-accent-400` (#00ffff) | `rgba(57, 230, 255, 0.68-0.9)` |
| Amber highlight | `text-primary-300` (#fdba74) | `rgba(255, 177, 74, 0.68)` |
| Dividers | `border-primary-700` (solid) | `rgba(57, 230, 255, 0.12)` |

### Semantic Color Conventions

**Links and navigation paths** use **cyan** — this follows web convention where links are traditionally blue/cyan. In ambient contexts, routes and clickable items appear in `rgba(57, 230, 255, 0.68)`.

**Keyboard shortcuts and action hints** use **amber/yellow** — this draws slightly more attention than neutral gray, suggesting "actionable information" without being as prominent as the primary orange. In ambient contexts: `rgba(255, 177, 74, 0.68)`.

**Bordered blocks** in decorative panels use subtle containers:
```css
border: 1px solid rgba(255, 122, 0, 0.18);
background: rgba(0, 0, 0, 0.25);
box-shadow: inset 0 0 14px rgba(255, 122, 0, 0.05);
```

### Why the Distinction?

**Functional UI** prioritizes usability — users need to quickly scan, read, and act. Solid colors and clear contrast support this.

**Decorative Ambient** prioritizes atmosphere — it's a vibe, not a document. The muted, translucent colors create depth and mystery. Users don't need to read every line of fake telemetry; they just need to feel like they're accessing something special.

This separation lets us maintain the cyberpunk aesthetic while ensuring the actual app remains usable.

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

# UI Implementation Reference

A comprehensive guide for styling UI components in the Plaza frontend.

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Spacing](#spacing)
5. [Borders & Shadows](#borders--shadows)
6. [Layout Patterns](#layout-patterns)
7. [Component Patterns](#component-patterns)
8. [Interactive States](#interactive-states)
9. [Animations & Effects](#animations--effects)
10. [Theme System](#theme-system)
11. [Best Practices](#best-practices)

---

## Design Philosophy

Plaza Gossip uses a **terminal/retro-futuristic aesthetic** with these core principles:

- **Monospace everywhere** - IBM Plex Mono for authentic terminal feel
- **Sharp corners** - No rounded borders; maintains the terminal aesthetic
- **Neon glow effects** - Text shadows and box shadows for sci-fi ambiance
- **Binary theming** - Neon (orange/cyan) or Grayscale modes
- **Clear visual hierarchy** - Size, color, and weight guide importance
- **Consistent feedback** - Every interactive element has hover, disabled, and loading states

---

## Color System

### CSS Variables (defined in `index.css`)

All colors use CSS custom properties for easy theming:

```css
/* Primary - Orange */
--color-primary-300: #fdba74;  /* Light */
--color-primary-400: #fb923c;
--color-primary-500: #ff8800;  /* Main */
--color-primary-600: #ea580c;
--color-primary-700: #c2410c;
--color-primary-800: #9a3412;
--color-primary-900: #7c2d12;
--color-primary-950: #431407;  /* Darkest */

/* Accent - Cyan */
--color-accent-400: #00ffff;   /* Bright */
--color-accent-500: #06b6d4;   /* Main */
--color-accent-600: #0891b2;
--color-accent-700: #0e7490;
--color-accent-800: #155e75;
--color-accent-900: #164e63;
--color-accent-950: #083344;

/* Backgrounds */
--color-bg-base: #000000;
--color-bg-primary: #1a0f00;   /* Orange-tinted */
--color-bg-accent: #001a1a;    /* Cyan-tinted */

/* Semantic */
--color-error: #ff0055;
--color-warning: #eab308;
--color-success: #22c55e;
```

### Color Usage Guidelines

| Purpose | Color Class | Example |
|---------|-------------|---------|
| Primary text | `text-primary-400` | Body text |
| Headings | `text-primary-500` | Titles with glow |
| Muted text | `text-primary-600` or `700` | Timestamps, metadata |
| Accent/highlight | `text-accent-400` | Current user, links |
| Error | `text-red-500` | Error messages |
| Warning | `text-yellow-400` | Warnings, private badges |
| Success | `text-green-500` | Confirmations |

### Semantic Color Patterns

```tsx
// Error state
<div className="border-red-500 bg-red-900 bg-opacity-20 text-red-400">

// Warning state
<div className="border-yellow-600 bg-yellow-900 bg-opacity-30 text-yellow-400">

// Success state
<div className="border-green-500 bg-green-900 bg-opacity-20 text-green-400">

// Info state
<div className="border-accent-500 bg-accent-950 bg-opacity-20 text-accent-400">
```

---

## Typography

### Font Family

```css
font-family: 'IBM Plex Mono', 'Courier New', monospace;
```

Always use `font-mono` class on text elements.

### Size Hierarchy

| Level | Class | Use Case |
|-------|-------|----------|
| Title | `text-xl font-bold` | Main headings |
| Section | `text-lg font-bold` | Subsection headers |
| Body | `text-sm` | Standard text |
| Small | `text-xs` | Labels, metadata, timestamps |

### Text Styling

```tsx
// Main title
<h1 className="text-xl font-bold text-primary-500 text-shadow-neon font-mono">
  TITLE
</h1>

// Section header
<h3 className="text-sm font-bold text-accent-400 font-mono mb-3">
  SECTION
</h3>

// Body text
<p className="text-sm text-primary-400 font-mono">
  Content here
</p>

// Metadata/timestamp
<span className="text-xs text-primary-600 font-mono">
  [ 12:34:56 ]
</span>
```

### Text Effects

```tsx
// Neon glow (primary elements)
<span className="text-shadow-neon">GLOWING TEXT</span>

// Subtle glow (secondary elements)
<span className="text-shadow-neon-sm">Subtle glow</span>
```

---

## Spacing

### Padding Scale

| Size | Class | Use Case |
|------|-------|----------|
| Small | `p-2`, `p-3` | Compact elements, badges |
| Medium | `p-4` | Standard containers, cards |
| Large | `p-6` | Modal content, major sections |

### Common Patterns

```tsx
// Container padding
<div className="p-4">

// Button padding
<button className="px-4 py-2">      // Standard
<button className="px-6 py-3">      // Large/prominent
<button className="px-2 py-0.5">    // Badge/small

// Input padding
<input className="px-3 py-2">

// Modal header
<div className="px-6 py-4">

// Modal content
<div className="p-6 space-y-4">
```

### Gaps & Spacing

```tsx
// Flex gap
<div className="flex gap-2">    // Tight
<div className="flex gap-3">    // Medium
<div className="flex gap-4">    // Comfortable

// Vertical spacing
<div className="space-y-2">     // Tight list
<div className="space-y-4">     // Standard sections
<div className="space-y-6">     // Major sections
```

---

## Borders & Shadows

### Border Patterns

**Important:** Border thickness distinguishes interactive from non-interactive elements:
- `border-2` (2px) - Interactive elements only (buttons, clickable cards, modals, inputs)
- `border` (1px) - Non-interactive containers (info boxes, warning boxes, section containers)

```tsx
// INTERACTIVE ELEMENTS - use border-2
// Buttons
<button className="border-2 border-primary-500">

// Modal containers
<div className="border-2 border-primary-500 bg-black p-6">

// Inputs
<input className="border-2 border-primary-500">

// NON-INTERACTIVE CONTAINERS - use border (1px)
// Section containers (form sections, display areas)
<div className="border border-primary-700 p-4">

// Warning/info boxes
<div className="border border-yellow-600 bg-yellow-950 bg-opacity-20 p-3">
<div className="border border-red-700 bg-red-950 bg-opacity-30 p-3">
<div className="border border-accent-500 bg-accent-950 bg-opacity-20 p-3">

// Layout dividers (still use border-2 for visual weight)
<div className="border-b-2 border-primary-500">  // Horizontal
<div className="border-r-2 border-primary-500">  // Vertical
```

**Border colors by purpose:**
- `border-primary-500` - Interactive elements, main borders, modals
- `border-primary-700` - Non-interactive section containers
- `border-accent-500` - Accent/highlighted interactive elements
- `border-red-500/700` - Danger/error states (500 for buttons, 700 for info boxes)
- `border-yellow-600/700` - Warning states (similar pattern)
- `border-green-500/700` - Success states (similar pattern)
- `border-gray-600` - Neutral/cancel buttons

### Box Shadows (Neon Glow)

Use the CSS utility classes defined in `index.css` instead of inline styles:

```tsx
// Input glow
<input className="shadow-neon-input" />

// Button glow (stronger)
<button className="shadow-neon-button" />

// Accent glow (cyan)
<div className="shadow-neon-accent" />

// Disable shadow when element is disabled
<input className="shadow-neon-input disabled:shadow-none" />
```

The CSS utilities automatically respect the theme's `--enable-glow` variable:

```css
.shadow-neon-input {
  box-shadow: 0 0 10px rgba(255, 136, 0, calc(0.2 * var(--enable-glow)));
}
.shadow-neon-button {
  box-shadow: 0 0 15px rgba(255, 136, 0, calc(0.4 * var(--enable-glow)));
}
.shadow-neon-accent {
  box-shadow: 0 0 10px rgba(0, 255, 255, calc(0.3 * var(--enable-glow)));
}
```

### Important: No Rounded Corners

Never use `rounded-*` classes. All corners should be sharp for the terminal aesthetic.

---

## Layout Patterns

### Responsive Breakpoints

The UI uses Tailwind's default breakpoints:

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Default (mobile) | < 640px | Single column, bottom nav, drawer sidebars |
| `sm:` | >= 640px | Slightly larger spacing |
| `md:` | >= 768px | Desktop sidebar visible, no bottom nav |
| `lg:` | >= 1024px | Full 3-column layout with user panel |

### App Structure (Desktop)

```tsx
<div className="h-screen bg-black flex flex-col">
  <header className="border-b-2 border-primary-500">
    {/* Fixed header with hamburger (md:hidden) */}
  </header>

  <main className="flex-1 flex overflow-hidden relative">
    {/* Mobile drawer overlay */}
    {isMobile && isSidebarOpen && <div className="fixed inset-0 bg-black/75 z-40" />}

    {/* Sidebar: drawer on mobile, static on desktop */}
    <aside className={`
      ${isMobile ? 'fixed inset-y-0 left-0 z-50 w-72 drawer-left' : 'hidden md:flex w-48 lg:w-64'}
      border-r-2 border-primary-500
    `}>
      {/* Sidebar content */}
    </aside>

    <div className="flex-1 flex flex-col pb-16 md:pb-0">
      {/* Main content - pb-16 for bottom nav clearance on mobile */}
    </div>

    <aside className="hidden lg:flex w-56 border-l-2 border-primary-500">
      {/* User panel - hidden below lg breakpoint */}
    </aside>
  </main>

  {/* Bottom nav - visible only on mobile */}
  <MobileBottomNav className="md:hidden" />
</div>
```

### Responsive Utilities

Custom CSS utilities in `index.css`:

```css
/* Touch target minimum (44x44px for iOS) */
.touch-target { min-height: 44px; min-width: 44px; }

/* Drawer slide animations */
.drawer-left { transform: translateX(-100%); transition: transform 0.3s ease-in-out; }
.drawer-left.open { transform: translateX(0); }
.drawer-right { transform: translateX(100%); transition: transform 0.3s ease-in-out; }
.drawer-right.open { transform: translateX(0); }

/* iOS safe area support */
.safe-area-bottom { padding-bottom: env(safe-area-inset-bottom, 0); }
```

### Common Responsive Patterns

```tsx
// Responsive padding
<div className="p-3 md:p-4">

// Hide on mobile, show on desktop
<span className="hidden sm:inline">Full text</span>
<span className="sm:hidden">Short</span>

// Stack on mobile, row on desktop
<div className="flex flex-col sm:flex-row gap-2">

// Responsive text sizing (prevents iOS zoom)
<input className="text-base md:text-sm" />

// Modal: bottom sheet on mobile, centered on desktop
<div className="fixed inset-0 flex items-end sm:items-center justify-center">
  <div className="w-full sm:max-w-md sm:mx-4">
```

### Responsive Widths

| Element | Mobile | Tablet (md) | Desktop (lg) |
|---------|--------|-------------|--------------|
| Sidebar | `w-72` (drawer) | `w-48` | `w-64` |
| User panel | `w-64` (drawer) | Hidden | `w-56` |
| Modal | Full width | `max-w-md` | `max-w-lg` |

### Touch Targets

All interactive elements must meet 44px minimum for iOS:

```tsx
// Button with touch target
<button className="px-4 py-3 touch-target">

// List item with touch target
<div className="px-4 py-2.5 touch-target">
```

### Common Layouts

```tsx
// Horizontal with space-between
<div className="flex items-center justify-between">

// Centered content
<div className="flex items-center justify-center">

// Vertical stack
<div className="flex flex-col space-y-4">

// Baseline alignment (for text with different sizes)
<div className="flex items-baseline gap-4">

// Wrap on narrow screens
<div className="flex flex-wrap gap-2">
```

---

## Component Patterns

### Buttons

All buttons must include background, hover, and disabled states for consistency.

```tsx
// Primary action
<button className="
  bg-primary-900 hover:bg-primary-800
  text-primary-400
  border-2 border-primary-500 hover:border-primary-400
  font-mono text-sm
  px-4 py-2
  disabled:opacity-70 disabled:cursor-not-allowed
  transition-all
">

// Accent/secondary
<button className="
  bg-accent-900 hover:bg-accent-800
  text-accent-400
  border-2 border-accent-500 hover:border-accent-400
  font-mono text-sm
  px-4 py-2
  disabled:opacity-70 disabled:cursor-not-allowed
  transition-all
">

// Danger
<button className="
  bg-red-900 hover:bg-red-800
  text-red-400
  border-2 border-red-500 hover:border-red-400
  font-mono text-sm
  px-4 py-2
  disabled:opacity-70 disabled:cursor-not-allowed
  transition-all
">

// Neutral/cancel
<button className="
  bg-gray-900 hover:bg-gray-800
  text-gray-400
  border-2 border-gray-600 hover:border-gray-500
  font-mono text-sm
  px-4 py-2
  disabled:opacity-70 disabled:cursor-not-allowed
  transition-all
">
```

**Note:** Neutral/cancel buttons should use `bg-gray-900` not `bg-transparent` to maintain visual consistency.

### Inputs

```tsx
// Text input
<input
  className="
    w-full px-3 py-2
    bg-black
    border-2 border-primary-500
    text-primary-400 font-mono text-sm
    placeholder-primary-800
    focus:outline-none focus:border-primary-400
    disabled:border-gray-700 disabled:text-gray-600
  "
/>

// Textarea
<textarea
  className="
    w-full px-3 py-2
    bg-black
    border-2 border-primary-500
    text-primary-400 font-mono text-sm
    focus:outline-none focus:border-primary-400
    resize-none
  "
  rows={3}
/>

// Input with prefix
<div className="flex">
  <span className="px-3 py-2 bg-primary-950 border-2 border-r-0 border-primary-500 text-accent-400 font-mono">
    &gt;
  </span>
  <input className="flex-1 px-3 py-2 border-2 border-primary-500 ...">
</div>
```

### Modals

```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center">
  {/* Backdrop */}
  <div
    className="absolute inset-0 bg-black bg-opacity-80"
    onClick={onClose}
  />

  {/* Modal */}
  <div className="relative z-10 w-full max-w-md mx-4 border-2 border-primary-500 bg-black">
    {/* Header */}
    <div className="flex items-center justify-between px-6 py-4 border-b-2 border-primary-500">
      <h2 className="text-xl font-bold text-primary-500 text-shadow-neon font-mono">
        MODAL TITLE
      </h2>
      <button
        onClick={onClose}
        className="text-primary-500 hover:text-primary-400 text-2xl font-mono"
      >
        x
      </button>
    </div>

    {/* Content */}
    <div className="p-6 space-y-4">
      {/* Form content */}
    </div>

    {/* Actions */}
    <div className="flex justify-end gap-3 px-6 py-4 border-t border-primary-700">
      <button>Cancel</button>
      <button>Submit</button>
    </div>
  </div>
</div>
```

### Form Sections

```tsx
<div>
  <h3 className="text-sm font-bold text-accent-400 font-mono mb-3">
    SECTION TITLE
  </h3>
  <div className="border border-primary-700 p-4 space-y-3">
    {/* Form fields */}
  </div>
</div>
```

### Status/Info Boxes

Semantic colors are allowed and encouraged for status indicators. Use `border` (1px) for info boxes to distinguish from interactive buttons:

```tsx
// Warning
<div className="p-3 border border-yellow-600 bg-yellow-900 bg-opacity-30">
  <div className="flex items-start gap-2">
    <span className="text-yellow-500">!</span>
    <div className="font-mono text-xs text-yellow-600">
      <p className="font-bold text-yellow-500">WARNING TITLE</p>
      <p className="mt-1">Warning message content</p>
    </div>
  </div>
</div>

// Error/Danger
<div className="p-3 border border-red-700 bg-red-900 bg-opacity-20">
  <span className="text-red-500">⚠</span>
  <span className="text-red-400">Error message</span>
</div>

// Success
<div className="p-3 border border-green-700 bg-green-900 bg-opacity-20">
  <span className="text-green-500">✓</span>
  <span className="text-green-400">Success message</span>
</div>

// Info (uses accent colors)
<div className="p-3 border border-accent-700 bg-accent-950 bg-opacity-20">
  <span className="text-accent-400">Info message</span>
</div>
```

### Tooltips

#### Simple CSS Tooltip (for static text)

For basic tooltips that match the terminal aesthetic (use instead of native `title` attribute):

```tsx
// CSS-only tooltip (group hover)
<div className="relative group">
  <button disabled={isDisabled}>
    BUTTON TEXT
  </button>
  {isDisabled && (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-black border border-primary-700 text-primary-500 font-mono text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
      Tooltip message here
      {/* Arrow pointing down */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-primary-700" />
    </div>
  )}
</div>
```

**Key classes:**
- `relative group` on wrapper - enables group-hover behavior
- `absolute bottom-full` - positions tooltip above element
- `left-1/2 -translate-x-1/2` - centers horizontally
- `mb-2` - gap between tooltip and element
- `opacity-0 group-hover:opacity-100` - show on hover
- `transition-opacity` - smooth fade in/out
- `pointer-events-none` - prevents tooltip from blocking clicks
- `z-10` - ensures tooltip appears above other elements
- `whitespace-nowrap` - keeps tooltip on single line

**Arrow:** The downward-pointing arrow uses CSS border trick with `border-t-primary-700` matching the tooltip border color.

#### Interactive Tooltip (for rich content with actions)

For tooltips with interactive content (buttons, links), use a portal-based approach with proper hover handling. See `ProfileTooltip` component for reference.

**Key patterns:**

1. **Show delay** - Wait before showing (e.g., 300ms) to avoid accidental triggers:
```tsx
const HOVER_DELAY = 300;

const handleMouseEnter = () => {
  showTimerRef.current = setTimeout(() => {
    setShowTooltip(true);
  }, HOVER_DELAY);
};
```

2. **Hide delay** - Allow time for mouse to reach tooltip (150ms):
```tsx
const HIDE_DELAY = 150;

const handleMouseLeave = () => {
  hideTimerRef.current = setTimeout(() => {
    if (!isOverTooltipRef.current) {
      setShowTooltip(false);
    }
  }, HIDE_DELAY);
};
```

3. **Bridge area** - Invisible hitbox between trigger and tooltip:
```tsx
// In tooltip component, add invisible bridge toward trigger
{position.showAbove && (
  <div className="h-3 w-full" />  // Bridge below tooltip
)}
<div className="bg-black border-2 border-primary-500 ...">
  {/* Tooltip content */}
</div>
{!position.showAbove && (
  <div className="h-3 w-full" />  // Bridge above tooltip
)}
```

4. **Portal rendering** - Avoid overflow clipping:
```tsx
import { createPortal } from 'react-dom';

return createPortal(
  <div className="fixed z-50" style={{ top, left }}>
    {/* Tooltip content */}
  </div>,
  document.body
);
```

5. **Position calculation** - Center horizontally, flip vertically if needed:
```tsx
useEffect(() => {
  const tooltip = tooltipRef.current;
  const showAbove = triggerRect.top > tooltip.offsetHeight + gap;

  const top = showAbove
    ? triggerRect.top - tooltip.offsetHeight - gap
    : triggerRect.bottom + gap;

  let left = triggerRect.left + (triggerRect.width / 2) - (tooltip.offsetWidth / 2);
  left = Math.max(8, Math.min(left, window.innerWidth - tooltip.offsetWidth - 8));

  setPosition({ top, left, showAbove });
}, [triggerRect]);
```

**Interactive tooltip styling:**
```tsx
<div className="fixed z-50 bg-black border-2 border-primary-500 shadow-lg shadow-primary-500/20 max-w-xs">
  <div className="p-3 space-y-2">
    {/* Header */}
    <div className="flex items-start gap-2">
      <div className="w-8 h-8 border border-primary-500 bg-primary-950 ...">
        {/* Avatar */}
      </div>
      <div>
        <span className="text-primary-400 font-mono text-sm font-semibold">Name</span>
        <div className="text-primary-700 font-mono text-xs">0x1234...5678</div>
      </div>
    </div>

    {/* Action buttons */}
    <div className="flex gap-1.5 pt-1">
      <button className="px-2 py-1 text-xs font-mono border ...">DM</button>
      <button className="px-2 py-1 text-xs font-mono border ...">TIP</button>
      <button className="px-2 py-1 text-xs font-mono border ...">FOLLOW</button>
    </div>
  </div>
</div>
```

**When to use which:**
- **CSS tooltip**: Simple explanatory text, disabled button hints
- **Interactive tooltip**: Profile cards, action menus, any content with clickable elements

### Option Cards

```tsx
<button className="
  w-full p-4
  border-2 border-primary-500
  text-left
  transition-all
  hover:bg-primary-950 hover:bg-opacity-30
">
  <div className="flex items-start gap-4">
    <div className="text-2xl">icon</div>
    <div className="flex-1">
      <h3 className="font-mono font-bold text-primary-400">OPTION TITLE</h3>
      <p className="font-mono text-xs text-primary-600 mt-1">Description</p>
    </div>
    <div className="text-primary-500 font-mono text-sm">&gt;</div>
  </div>
</button>
```

### Message Input

The standard pattern for message/chat inputs with send functionality:

```tsx
<form onSubmit={handleSubmit} className="border-t-2 border-primary-500 bg-black p-4">
  <div className="flex gap-2">
    {/* Input with prompt prefix */}
    <div className="flex-1 relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-500 font-mono text-sm">
        &gt;
      </span>
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="[ENTER MESSAGE]"
        disabled={isSending}
        className="w-full pl-8 pr-4 py-3 bg-black border-2 border-primary-500 text-primary-400 font-mono text-sm focus:outline-none focus:border-primary-400 disabled:border-gray-700 disabled:text-gray-600 disabled:shadow-none placeholder-primary-800 transition-all shadow-neon-input"
        maxLength={500}
      />
    </div>

    {/* Send button with loading state */}
    <button
      type="submit"
      disabled={isSending || !message.trim()}
      className="bg-primary-900 hover:bg-primary-800 disabled:bg-gray-900 text-primary-400 disabled:text-gray-700 font-mono text-sm px-8 py-3 border-2 border-primary-500 hover:border-primary-400 disabled:border-gray-700 disabled:shadow-none transition-all uppercase tracking-wider font-bold shadow-neon-button"
    >
      {isSending ? (
        <span className="flex items-center gap-2">
          <span className="terminal-cursor">█</span>
          SENDING
        </span>
      ) : (
        '▶ SEND'
      )}
    </button>
  </div>

  {/* Footer with status and character count */}
  <div className="mt-2 flex justify-between items-center font-mono text-xs">
    <span className="text-primary-700">[STATUS INDICATOR]</span>
    <span className={message.length > 450 ? 'text-red-500' : 'text-primary-600'}>
      {message.length}/500 CHARS
    </span>
  </div>
</form>
```

**Key behaviors:**
- Text stays in input while sending (input is disabled, not cleared)
- Text only clears after successful send
- On failure, text remains so user can retry
- Character count turns red near limit

**Status indicators by context:**
- `[BLOCKCHAIN STORAGE ACTIVE]` - Channel messages
- `[ENCRYPTED MESSAGE]` - Direct messages

### User Address Display

Use the unified `UserAddress` components for displaying user profiles and addresses consistently.

**UserLink** - Clickable profile opener (for showing "who did something"):

```tsx
import { UserLink } from './UserAddress';

// Message author - clicking opens their profile
<UserLink
  address={msg.profileOwner}
  displayName={msg.displayName}
  onSelectUser={openProfile}
  isCurrentUser={isCurrentUser}  // Accent color if true
  isDelegate={isDelegate}        // Shows "(via delegate)"
  size="sm"                      // 'xs' | 'sm'
/>
```

**Behavior:**
- Shows displayName or truncated address
- Hover: tooltip with full address
- Click: calls `onSelectUser(address)` to open profile
- Current user gets `text-accent-400` styling

**AddressDisplay** - Informational address with copy-on-click:

```tsx
import { AddressDisplay } from './UserAddress';

// Settings, profile headers - click to copy
<AddressDisplay
  address={walletAddress}
  displayName={displayName}     // Optional
  showBoth={true}               // Show name + address
  size="sm"                     // 'xs' | 'sm'
/>
```

**Behavior:**
- Click: copies full address to clipboard
- Shows "✓ Copied!" feedback for 2 seconds
- `showBoth`: displays name on top, address below

**When to use which:**
- **UserLink**: Showing who did something (message authors, post authors, reply authors)
- **AddressDisplay**: Showing addresses for informational purposes (settings, profile headers)
- **Neither**: Navigation elements (sidebar, DM list) - keep using inline patterns

---

## Interactive States

### Hover

```tsx
hover:bg-primary-800        // Background lightens
hover:border-primary-400    // Border brightens
hover:text-primary-400      // Text brightens
```

### Focus

```tsx
focus:outline-none          // Remove default outline
focus:border-primary-400    // Border indicates focus
```

### Disabled

Use `opacity-70` instead of completely graying out elements. This allows the button to maintain its color identity while clearly indicating it's disabled:

```tsx
// Standard disabled pattern (preferred)
disabled:opacity-70 disabled:cursor-not-allowed

// For elements with neon shadows
disabled:shadow-none

// Full disabled pattern for buttons
<button className="
  bg-primary-900 hover:bg-primary-800
  text-primary-400
  border-2 border-primary-500 hover:border-primary-400
  disabled:opacity-70 disabled:cursor-not-allowed
  transition-all
">
```

**Rationale:** Using `opacity-70` keeps disabled buttons visually connected to their enabled state, making it clear what the button will do when enabled. The hover states still technically apply but appear muted due to the opacity.

### Loading

```tsx
// Button with loading state
<button disabled={isLoading}>
  {isLoading ? (
    <span className="flex items-center gap-2">
      <span className="terminal-cursor">█</span>
      LOADING...
    </span>
  ) : (
    'SUBMIT'
  )}
</button>

// For send buttons specifically
{isSending ? (
  <span className="flex items-center gap-2">
    <span className="terminal-cursor">█</span>
    SENDING
  </span>
) : (
  '▶ SEND'
)}
```

### Selected/Active

```tsx
// Selected list item
<button className={`
  ${isSelected
    ? 'bg-primary-900 text-primary-300 border-l-2 border-primary-400'
    : 'text-primary-500 hover:bg-primary-950'
  }
`}>
```

---

## Animations & Effects

### Terminal Cursor

```tsx
// Blinking cursor animation
<span className="terminal-cursor">_</span>
```

Defined in CSS:
```css
.terminal-cursor {
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}
```

### Scanline Effect

```tsx
// Apply to main container
<div className="scanline">
```

Creates CRT-style horizontal lines overlay.

### Transitions

```tsx
// Standard transition for interactive elements
className="transition-all duration-200"
```

### Smooth Scroll

```tsx
// Auto-scroll to new messages
useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [messages]);
```

---

## Theme System

### Theme Toggle

The app supports two themes controlled via `data-theme` attribute:

```tsx
// Apply theme to root
<html data-theme="grayscale">
```

### Theme Differences

| Feature | Neon (default) | Grayscale |
|---------|----------------|-----------|
| Primary | Orange (#ff8800) | Gray (#6b7280) |
| Accent | Cyan (#00ffff) | Muted blue (#5b9fc7) |
| Text shadows | Enabled | Disabled |
| Box glows | Enabled | Disabled |

### Glow Control

```css
/* Enabled in neon theme */
--enable-glow: 1;

/* Disabled in grayscale */
--enable-glow: 0;
```

---

## Best Practices

### Do's

1. **Use CSS variables** for colors (`text-primary-500`, not `text-orange-500`)
2. **Always include font-mono** on text elements
3. **Provide all interactive states** (hover, disabled, loading)
4. **Use uppercase** for buttons and headers
5. **Include character counters** for text inputs with limits
6. **Add smooth transitions** to interactive elements
7. **Use semantic color mapping** (red=error, yellow=warning, green=success)

### Don'ts

1. **Never use rounded corners** - keep terminal aesthetic
2. **Don't mix font families** - monospace only
3. **Avoid light backgrounds** - dark theme only
4. **Don't skip disabled states** - always handle them
5. **Never hardcode colors** - use theme variables

### Accessibility

- Maintain sufficient contrast (primary-400 on black = WCAG AA)
- Use semantic HTML (`<button>`, not `<div onClick>`)
- Include proper labels with `htmlFor`
- Support keyboard navigation
- Provide visual feedback for all interactions

### Performance

- Use `transition-all duration-200` sparingly
- Prefer CSS animations over JavaScript
- Use `overflow-hidden` on containers to prevent layout shifts
- Lazy-load heavy components

---

## Quick Reference

### Essential Classes

```
/* Layout */
flex flex-col flex-1 h-screen w-full
items-center justify-between gap-4
p-4 px-3 py-2 space-y-4

/* Borders */
border-2 border-primary-500
border-b-2 border-r-2

/* Text */
font-mono text-sm text-primary-400
text-shadow-neon

/* Interactive */
hover:bg-primary-800 hover:border-primary-400
disabled:opacity-70 disabled:cursor-not-allowed
transition-all

/* Shadows */
shadow-neon-input shadow-neon-button shadow-neon-accent
disabled:shadow-none
```

### Terminal Characters

| Character | Usage |
|-----------|-------|
| `>` | Input prompt prefix |
| `#` | Channel prefix |
| `[ ]` | Timestamps, status indicators |
| `x` | Close button |
| `█` | Loading cursor (animated) |
| `▶` | Send/action button prefix |
| `!` | Warning indicator |
| `⚠` | Error/danger indicator |
| `✓` | Success indicator |

---

*This style guide is based on analysis of all components in `frontend/src/components/`.*
