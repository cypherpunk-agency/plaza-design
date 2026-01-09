# Typography

Typography is the **only visual language** in Plaza. No icons, no illustrations — just text.

---

## The Rule

> Use **IBM Plex Mono** for everything. One font, multiple weights, infinite expression.

---

## Font Stack

```css
--font-mono: 'IBM Plex Mono', 'Consolas', 'Monaco', monospace;
```

Fallbacks ensure the terminal aesthetic survives even without the primary font.

---

## Weights

<div style="margin: 1.5rem 0; padding: 1rem; background: var(--color-bg-base); border: 1px solid var(--color-border-default);">
  <p style="font-weight: 400; font-size: 18px; margin: 0.75rem 0; color: var(--color-text-body);">Regular 400 — Body text, descriptions</p>
  <p style="font-weight: 500; font-size: 18px; margin: 0.75rem 0; color: var(--color-text-body);">Medium 500 — Labels, navigation</p>
  <p style="font-weight: 600; font-size: 18px; margin: 0.75rem 0; color: var(--color-text-body);">SemiBold 600 — Headings, emphasis</p>
  <p style="font-weight: 700; font-size: 18px; margin: 0.75rem 0; color: var(--color-text-body);">Bold 700 — Titles, strong emphasis</p>
</div>

---

## Scale

<div style="margin: 1.5rem 0;">
  <p style="font-size: 11px; color: var(--color-text-muted); margin: 0.5rem 0;">--text-xs: 11px <span style="color: var(--color-text-faint);">— Hints, timestamps</span></p>
  <p style="font-size: 13px; color: var(--color-text-muted); margin: 0.5rem 0;">--text-sm: 13px <span style="color: var(--color-text-faint);">— Secondary text</span></p>
  <p style="font-size: 15px; color: var(--color-text-body); margin: 0.5rem 0;">--text-base: 15px <span style="color: var(--color-text-faint);">— Body text</span></p>
  <p style="font-size: 18px; color: var(--color-text-body); margin: 0.5rem 0;">--text-lg: 18px <span style="color: var(--color-text-faint);">— Section titles</span></p>
  <p style="font-size: 22px; color: var(--color-text-heading); margin: 0.5rem 0;">--text-xl: 22px <span style="color: var(--color-text-faint);">— Panel headers</span></p>
  <p style="font-size: 28px; color: var(--color-text-heading); margin: 0.5rem 0;">--text-2xl: 28px <span style="color: var(--color-text-faint);">— Page titles</span></p>
  <p style="font-size: 36px; color: var(--color-primary-400); margin: 0.5rem 0;">--text-3xl: 36px</p>
  <p style="font-size: 48px; color: var(--color-primary-400); margin: 0.5rem 0;">--text-4xl: 48px</p>
</div>

---

## Letter Spacing

<div style="margin: 1.5rem 0; padding: 1rem; background: var(--color-bg-base); border: 1px solid var(--color-border-default);">
  <p style="letter-spacing: 0; color: var(--color-text-body); margin: 0.5rem 0;">Body text — no extra spacing</p>
  <p style="letter-spacing: 0.05em; color: var(--color-text-body); margin: 0.5rem 0; text-transform: uppercase;">Form labels — 0.05em</p>
  <p style="letter-spacing: 0.1em; color: var(--color-primary-400); margin: 0.5rem 0; text-transform: uppercase;">Navigation — 0.1em</p>
  <p style="letter-spacing: 0.15em; color: var(--color-text-heading); margin: 0.5rem 0; text-transform: uppercase; font-weight: 600;">Headings — 0.15em</p>
  <p style="letter-spacing: 0.2em; color: var(--color-primary-500); margin: 0.5rem 0; text-transform: uppercase; font-weight: 600;">Buttons — 0.2em</p>
</div>

**The pattern:** More important = more spacing. Spacing creates authority.

---

## Text Transform

<div style="display: flex; gap: 2rem; margin: 1.5rem 0;">
  <div style="flex: 1; padding: 1rem; border: 1px solid var(--color-border-default);">
    <p style="text-transform: uppercase; letter-spacing: 0.1em; color: var(--color-primary-400); font-weight: 600; margin-bottom: 0.5rem;">UPPERCASE</p>
    <p style="color: var(--color-text-muted); font-size: 13px;">Headings, buttons, labels, navigation</p>
  </div>
  <div style="flex: 1; padding: 1rem; border: 1px solid var(--color-border-default);">
    <p style="color: var(--color-text-body); margin-bottom: 0.5rem;">Normal Case</p>
    <p style="color: var(--color-text-muted); font-size: 13px;">Body text, descriptions, long-form</p>
  </div>
</div>

---

## Line Height

| Context | Line Height |
|---------|-------------|
| Headings | 1.2 |
| Body text | 1.6–1.7 |
| Code blocks | 1.5 |
| Dense UI | 1.4 |

---

## Text Color Hierarchy

<div style="margin: 1.5rem 0; padding: 1rem; background: var(--color-bg-base); border: 1px solid var(--color-border-default);">
  <p style="color: var(--color-accent-400); margin: 0.5rem 0;">Link — Clickable, invites interaction</p>
  <p style="color: var(--color-text-heading); margin: 0.5rem 0;">Title — Important information</p>
  <p style="color: var(--color-primary-500); margin: 0.5rem 0;">Brand — Terminal aesthetic</p>
  <p style="color: var(--color-text-body); margin: 0.5rem 0;">Body — Readable, comfortable</p>
  <p style="color: var(--color-text-muted); margin: 0.5rem 0;">Muted — Supporting info</p>
  <p style="color: var(--color-text-faint); margin: 0.5rem 0;">Faint — Barely visible</p>
</div>

See [Text Colors](./11_text-colors.md) for CSS variables.

---

## Anti-Patterns

**Don't:**
- Mix fonts (stay monospace)
- Use more than 3 weights on one screen
- Skip the scale (no arbitrary sizes)
- Forget letter spacing on uppercase text

**Do:**
- Trust the scale
- Use weight for hierarchy, not size alone
- Keep uppercase short (labels, not paragraphs)
- Left-align body text

---

## Example: Heading Hierarchy

<div style="margin: 1.5rem 0; padding: 1.5rem; background: var(--color-bg-base); border: 1px solid var(--color-border-default);">
  <p style="font-size: 28px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--color-text-heading); margin: 0 0 1rem 0;">PAGE TITLE</p>
  <p style="font-size: 22px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-primary-500); margin: 0 0 0.75rem 0;">SECTION HEADING</p>
  <p style="font-size: 18px; font-weight: 500; color: var(--color-accent-400); margin: 0 0 0.5rem 0;">Subsection</p>
  <p style="font-size: 15px; color: var(--color-text-body); margin: 0;">Body text uses regular weight and normal case for readability.</p>
</div>
