# Color

Color in Plaza is **functional**, not decorative. Every color means something.

---

## The Rule

> **Cyan is yours. Orange is the system.** Everything else is structure.

---

## Semantic Meaning

<div style="display: flex; gap: 1rem; flex-wrap: wrap; margin: 1.5rem 0;">
  <div style="text-align: center;">
    <div style="width: 60px; height: 60px; background: var(--color-primary-500); border: 2px solid var(--color-primary-400);"></div>
    <div style="font-size: 12px; margin-top: 4px; color: var(--color-primary-400);">Primary</div>
    <div style="font-size: 10px; color: var(--color-text-muted);">Interactive</div>
  </div>
  <div style="text-align: center;">
    <div style="width: 60px; height: 60px; background: var(--color-accent-500); border: 2px solid var(--color-accent-400);"></div>
    <div style="font-size: 12px; margin-top: 4px; color: var(--color-accent-400);">Accent</div>
    <div style="font-size: 10px; color: var(--color-text-muted);">System</div>
  </div>
  <div style="text-align: center;">
    <div style="width: 60px; height: 60px; background: var(--color-error); border: 2px solid var(--color-error);"></div>
    <div style="font-size: 12px; margin-top: 4px; color: var(--color-error);">Error</div>
    <div style="font-size: 10px; color: var(--color-text-muted);">Destructive</div>
  </div>
  <div style="text-align: center;">
    <div style="width: 60px; height: 60px; background: var(--color-success); border: 2px solid var(--color-success);"></div>
    <div style="font-size: 12px; margin-top: 4px; color: var(--color-success);">Success</div>
    <div style="font-size: 10px; color: var(--color-text-muted);">Positive</div>
  </div>
  <div style="text-align: center;">
    <div style="width: 60px; height: 60px; background: var(--color-warning); border: 2px solid var(--color-warning);"></div>
    <div style="font-size: 12px; margin-top: 4px; color: var(--color-warning);">Warning</div>
    <div style="font-size: 10px; color: var(--color-text-muted);">Attention</div>
  </div>
</div>

---

## Primary Palette

<div style="display: flex; gap: 4px; margin: 1rem 0;">
  <div style="width: 50px; height: 50px; background: var(--color-primary-300);"></div>
  <div style="width: 50px; height: 50px; background: var(--color-primary-400);"></div>
  <div style="width: 50px; height: 50px; background: var(--color-primary-500);"></div>
  <div style="width: 50px; height: 50px; background: var(--color-primary-600);"></div>
  <div style="width: 50px; height: 50px; background: var(--color-primary-700);"></div>
  <div style="width: 50px; height: 50px; background: var(--color-primary-800);"></div>
</div>

| Token | Use Case |
|-------|----------|
| `--color-primary-300` | Bright highlights, glow |
| `--color-primary-400` | Primary text, active states |
| `--color-primary-500` | Borders, buttons, links |
| `--color-primary-600` | Hover states |
| `--color-primary-700` | Pressed states |
| `--color-primary-800` | Subtle backgrounds |

---

## Accent Palette

<div style="display: flex; gap: 4px; margin: 1rem 0;">
  <div style="width: 50px; height: 50px; background: var(--color-accent-400);"></div>
  <div style="width: 50px; height: 50px; background: var(--color-accent-500);"></div>
  <div style="width: 50px; height: 50px; background: var(--color-accent-600);"></div>
  <div style="width: 50px; height: 50px; background: var(--color-accent-700);"></div>
  <div style="width: 50px; height: 50px; background: var(--color-accent-800);"></div>
  <div style="width: 50px; height: 50px; background: var(--color-accent-900);"></div>
</div>

| Token | Use Case |
|-------|----------|
| `--color-accent-400` | Accent text, links |
| `--color-accent-500` | Borders, highlights |
| `--color-accent-600` | Hover states |
| `--color-accent-700` | Pressed states |
| `--color-accent-800` | Subtle backgrounds |

---

## Text Colors

<div style="margin: 1.5rem 0; padding: 1rem; background: var(--color-bg-base); border: 1px solid var(--color-border-default);">
  <p style="color: var(--color-text-heading); margin: 0.5rem 0;">Heading Text <span style="font-size: 12px; color: var(--color-text-muted);">--color-text-heading</span></p>
  <p style="color: var(--color-text-body); margin: 0.5rem 0;">Body Text <span style="font-size: 12px; color: var(--color-text-muted);">--color-text-body</span></p>
  <p style="color: var(--color-text-muted); margin: 0.5rem 0;">Muted Text <span style="font-size: 12px;">--color-text-muted</span></p>
  <p style="color: var(--color-text-faint); margin: 0.5rem 0;">Faint Text <span style="font-size: 12px;">--color-text-faint</span></p>
</div>

---

## Status Colors

<div style="display: flex; gap: 1rem; margin: 1rem 0;">
  <div style="flex: 1; padding: 1rem; border: 2px solid var(--color-error); background: rgba(var(--color-error-rgb), 0.1);">
    <span style="color: var(--color-error);">[ERROR]</span> <span style="color: var(--color-text-body);">Connection failed</span>
  </div>
  <div style="flex: 1; padding: 1rem; border: 2px solid var(--color-success); background: rgba(var(--color-success-rgb), 0.1);">
    <span style="color: var(--color-success);">[OK]</span> <span style="color: var(--color-text-body);">Transaction complete</span>
  </div>
  <div style="flex: 1; padding: 1rem; border: 2px solid var(--color-warning); background: rgba(var(--color-warning-rgb), 0.1);">
    <span style="color: var(--color-warning);">[WARN]</span> <span style="color: var(--color-text-body);">Session expiring</span>
  </div>
</div>

---

## Opacity Patterns

<div style="display: flex; gap: 4px; margin: 1rem 0; align-items: end;">
  <div style="text-align: center;">
    <div style="width: 50px; height: 50px; background: var(--color-primary-500); opacity: 1;"></div>
    <div style="font-size: 10px; color: var(--color-text-muted); margin-top: 4px;">100%</div>
  </div>
  <div style="text-align: center;">
    <div style="width: 50px; height: 50px; background: var(--color-primary-500); opacity: 0.7;"></div>
    <div style="font-size: 10px; color: var(--color-text-muted); margin-top: 4px;">70%</div>
  </div>
  <div style="text-align: center;">
    <div style="width: 50px; height: 50px; background: var(--color-primary-500); opacity: 0.4;"></div>
    <div style="font-size: 10px; color: var(--color-text-muted); margin-top: 4px;">40%</div>
  </div>
  <div style="text-align: center;">
    <div style="width: 50px; height: 50px; background: var(--color-primary-500); opacity: 0.15;"></div>
    <div style="font-size: 10px; color: var(--color-text-muted); margin-top: 4px;">15%</div>
  </div>
</div>

| Opacity | Use Case |
|---------|----------|
| 100% | Interactive elements, primary text |
| 60-80% | Secondary content, descriptions |
| 30-40% | Borders, subtle dividers |
| 10-20% | Hover backgrounds, subtle fills |

---

## Glow Effects

<div style="display: flex; gap: 2rem; margin: 1.5rem 0; align-items: center;">
  <div style="padding: 1rem 2rem; border: 2px solid var(--color-primary-500); box-shadow: 0 0 20px rgba(var(--color-primary-500-rgb), 0.4);">
    <span style="color: var(--color-primary-400);">With Glow</span>
  </div>
  <div style="padding: 1rem 2rem; border: 2px solid var(--color-primary-500);">
    <span style="color: var(--color-primary-400);">Without Glow</span>
  </div>
</div>

Glow reinforces the cyberpunk aesthetic. Use sparingly.

```css
/* Button glow */
box-shadow: 0 0 20px rgba(var(--color-primary-500-rgb), 0.4);

/* Text glow on hover */
text-shadow: 0 0 10px rgba(var(--color-primary-500-rgb), 0.6);
```

Glow is controlled by `--enable-glow` (0 or 1) for theme switching.

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
