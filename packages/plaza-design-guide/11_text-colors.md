# Text Colors

Implementation details for the text color system. For the conceptual approach, see [Typography](./04_typography.md).

---

## Text Hierarchy

<div style="margin: 1.5rem 0; padding: 1.5rem; background: var(--color-bg-base); border: 1px solid var(--color-border-default);">
  <p style="color: var(--color-primary-300); margin: 0.5rem 0; font-size: 16px;">Link — Clickable, draws attention</p>
  <p style="color: var(--color-primary-400); margin: 0.5rem 0; font-size: 16px;">Title — Section headings, panel titles</p>
  <p style="color: var(--color-primary-500); margin: 0.5rem 0; font-size: 16px;">Icon — Terminal symbols, indicators</p>
  <p style="color: var(--color-text-body); margin: 0.5rem 0; font-size: 16px;">Body — Content, prose, messages</p>
  <p style="color: var(--color-text-muted); margin: 0.5rem 0; font-size: 16px;">Secondary — Descriptions, supporting</p>
  <p style="color: var(--color-text-faint); margin: 0.5rem 0; font-size: 16px;">Label — Meta info, timestamps</p>
</div>

---

## Semantic Variables

| Variable | Maps To | Purpose |
|----------|---------|---------|
| `--text-link` | `--color-primary-300` | Clickable titles, navigation |
| `--text-title` | `--color-primary-400` | Section headings, panel titles |
| `--text-value` | `--color-primary-400` | Data values, metrics |
| `--text-icon` | `--color-primary-500` | Terminal symbols, indicators |
| `--text-body` | `--color-gray-400` | Content, prose, messages |
| `--text-secondary` | `--color-gray-500` | Descriptions, supporting text |
| `--text-label` | `--color-gray-600` | Meta info, timestamps |
| `--text-placeholder` | `--color-gray-700` | Input placeholders |

---

## Definition

Add to `tokens.css`:

```css
/* Semantic text colors */
--text-link: var(--color-primary-300);
--text-title: var(--color-primary-400);
--text-value: var(--color-primary-400);
--text-icon: var(--color-primary-500);
--text-body: var(--color-gray-400);
--text-secondary: var(--color-gray-500);
--text-label: var(--color-gray-600);
--text-placeholder: var(--color-gray-700);
```

---

## Utility Classes

Add to `utilities.css`:

```css
.text-link { color: var(--text-link); }
.text-title { color: var(--text-title); }
.text-value { color: var(--text-value); }
.text-icon { color: var(--text-icon); }
.text-body { color: var(--text-body); }
.text-secondary { color: var(--text-secondary); }
.text-label { color: var(--text-label); }
```

---

## Usage Examples

### Panel with Title and Body

```html
<div class="plaza-window">
  <div class="plaza-window-header">
    <span class="text-title">SYSTEM STATUS</span>
  </div>
  <div class="plaza-window-content">
    <p class="text-body">All systems operational. No issues detected.</p>
    <span class="text-label">Last checked: 12:34 PM</span>
  </div>
</div>
```

### Data Display

```html
<div class="telemetry-item">
  <span class="text-label">CPU USAGE</span>
  <span class="text-value">47%</span>
</div>
```

### Navigation Link

```html
<a href="/settings" class="text-link">SETTINGS</a>
```

### Form with Placeholder

```html
<input
  type="text"
  class="plaza-input"
  placeholder="Enter command..."
/>
<!-- placeholder uses --text-placeholder via CSS -->
```

### Description Text

```html
<h2 class="text-title">NETWORK PANEL</h2>
<p class="text-secondary">Monitor incoming and outgoing connections</p>
```

---

## Color Reference

| Level | Variable | Hex (Neon Theme) |
|-------|----------|------------------|
| Link | `--text-link` | #7dd3fc |
| Title | `--text-title` | #38bdf8 |
| Icon | `--text-icon` | #0ea5e9 |
| Body | `--text-body` | #9ca3af |
| Secondary | `--text-secondary` | #6b7280 |
| Label | `--text-label` | #4b5563 |
| Placeholder | `--text-placeholder` | #374151 |

---

## Theme Adaptation

These variables automatically adapt when themes change because they reference the color palette variables, not hardcoded hex values.

```css
/* In neon theme */
--color-primary-400: #38bdf8;  /* cyan */
--text-title: var(--color-primary-400);  /* becomes cyan */

/* In forest theme */
--color-primary-400: #4ade80;  /* green */
--text-title: var(--color-primary-400);  /* becomes green */
```

---

## Migration Guide

When refactoring existing CSS:

| Old Pattern | New Pattern |
|-------------|-------------|
| `color: var(--color-primary-400);` (for titles) | `color: var(--text-title);` |
| `color: var(--color-gray-400);` (for body) | `color: var(--text-body);` |
| `color: var(--color-gray-500);` (for descriptions) | `color: var(--text-secondary);` |
| `color: var(--color-gray-600);` (for labels) | `color: var(--text-label);` |

Using semantic variables makes the intent clear and allows global changes to text styling.
