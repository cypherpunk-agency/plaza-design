# Modals

Modal dialogs are **interactive containers** — they demand full attention and block background content.

---

## The Rule

> Modals use **2px borders**, **backdrop blur**, and **center-screen positioning**. They're the highest-priority interactive element.

---

## Basic Structure

```html
<div class="plaza-modal-overlay">
  <div class="plaza-modal">
    <div class="plaza-modal__header">
      <h2 class="plaza-modal__title">CONFIRM ACTION</h2>
      <button class="plaza-modal__close">×</button>
    </div>
    <div class="plaza-modal__body">
      <p>Are you sure you want to proceed?</p>
    </div>
    <div class="plaza-modal__footer">
      <button class="plaza-btn plaza-btn--secondary">CANCEL</button>
      <button class="plaza-btn">CONFIRM</button>
    </div>
  </div>
</div>
```

---

## Components

### Overlay
**Class:** `.plaza-modal-overlay`

| Property | Value |
|----------|-------|
| Background | rgba(0, 0, 0, 0.8) |
| Backdrop filter | blur(4px) |
| Position | Fixed, full screen |
| Animation | Fade in 0.2s |

### Container
**Class:** `.plaza-modal`

| Property | Value |
|----------|-------|
| Border | 2px solid primary-500 |
| Background | bg-base (black) |
| Max width | 480px (default) |
| Box shadow | Glow + depth shadow |
| Animation | Slide down 0.2s |

### Header
**Class:** `.plaza-modal__header`

Gradient background, border bottom. Contains title and close button.

### Title
**Class:** `.plaza-modal__title`

Uppercase, 14px, primary-400, letter-spacing 0.1em.

### Close Button
**Class:** `.plaza-modal__close`

32×32px square button with `×` character. Gray border that glows on hover.

### Body
**Class:** `.plaza-modal__body`

Content area with padding. Scrolls if content overflows.

### Footer
**Class:** `.plaza-modal__footer`

Right-aligned buttons by default. Optional `.plaza-modal__footer--between` for space-between layout.

---

## Size Variants

| Class | Max Width | Use Case |
|-------|-----------|----------|
| (default) | 480px | Standard dialogs |
| `.plaza-modal--sm` | 360px | Simple confirmations |
| `.plaza-modal--lg` | 640px | Forms, detailed content |
| `.plaza-modal--xl` | 800px | Complex interfaces |

```html
<div class="plaza-modal plaza-modal--lg">
  ...
</div>
```

---

## Semantic Variants

<div style="display: flex; gap: 1rem; flex-wrap: wrap; margin: 1.5rem 0;">
  <div style="flex: 1; min-width: 180px; padding: 1rem; border: 2px solid var(--color-primary-500); background: var(--color-bg-base); box-shadow: 0 0 15px rgba(var(--color-primary-500-rgb), 0.3);">
    <div style="font-size: 12px; color: var(--color-primary-400); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.5rem;">Default</div>
    <div style="font-size: 11px; color: var(--color-text-muted);">Standard dialogs</div>
  </div>
  <div style="flex: 1; min-width: 180px; padding: 1rem; border: 2px solid var(--color-error); background: var(--color-bg-base); box-shadow: 0 0 15px rgba(var(--color-error-rgb), 0.3);">
    <div style="font-size: 12px; color: var(--color-error); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.5rem;">Danger</div>
    <div style="font-size: 11px; color: var(--color-text-muted);">Destructive actions</div>
  </div>
  <div style="flex: 1; min-width: 180px; padding: 1rem; border: 2px solid var(--color-success); background: var(--color-bg-base); box-shadow: 0 0 15px rgba(var(--color-success-rgb), 0.3);">
    <div style="font-size: 12px; color: var(--color-success); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.5rem;">Success</div>
    <div style="font-size: 11px; color: var(--color-text-muted);">Confirmations</div>
  </div>
</div>

### Danger Modal
**Class:** `.plaza-modal--danger`

Red border and header gradient. Use for destructive actions.

### Success Modal
**Class:** `.plaza-modal--success`

Green border and header gradient. Use for confirmations.

---

## Mobile Behavior

On screens < 640px, modals:
- Anchor to bottom of screen (sheet style)
- Full width, no side borders
- Slide up animation instead of slide down

This provides better touch interaction and feels native on mobile.

---

## Animation Specs

| Element | Animation | Duration |
|---------|-----------|----------|
| Overlay | Fade in (opacity 0→1) | 0.2s |
| Modal (desktop) | Slide down + fade | 0.2s |
| Modal (mobile) | Slide up | 0.2s |

---

## Design Principles

### Backdrop Blur
The blur effect creates depth separation between the modal and background content. It says "focus here, not there."

### 2px Border = High Priority
Modals get thick borders like buttons. They're demanding attention.

### Close Should Be Obvious
The `×` button is always in the top-right corner. Users expect this.

### Buttons Right-Aligned
Primary action on the right, secondary on the left. This is a western-language convention (reading direction).

---

## When to Use

**Use modals for:**
- Confirmations ("Are you sure?")
- Short forms (login, settings)
- Important alerts
- Actions that can't be undone

**Don't use modals for:**
- Long content (use a page instead)
- Non-critical information (use a toast)
- Frequent actions (too disruptive)

---

## Example: Confirmation Modal

```html
<div class="plaza-modal-overlay">
  <div class="plaza-modal plaza-modal--sm plaza-modal--danger">
    <div class="plaza-modal__header">
      <h2 class="plaza-modal__title">CONFIRM DELETE</h2>
      <button class="plaza-modal__close">×</button>
    </div>
    <div class="plaza-modal__body">
      <p>This action cannot be undone. All data will be permanently removed.</p>
    </div>
    <div class="plaza-modal__footer">
      <button class="plaza-btn plaza-btn--secondary plaza-btn--sm">CANCEL</button>
      <button class="plaza-btn plaza-btn--sm">DELETE</button>
    </div>
  </div>
</div>
```
