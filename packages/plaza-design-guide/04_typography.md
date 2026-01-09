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

| Weight | CSS Value | Use Case |
|--------|-----------|----------|
| Regular | 400 | Body text, descriptions |
| Medium | 500 | Labels, navigation items |
| SemiBold | 600 | Headings, emphasis |
| Bold | 700 | Titles, strong emphasis |

### When to Use Each

- **400 (Regular):** Default for all body content
- **500 (Medium):** Navigation links, form labels, subtle emphasis
- **600 (SemiBold):** Section headings, panel titles
- **700 (Bold):** Page titles, critical information

---

## Scale

| Token | Size | Use Case |
|-------|------|----------|
| `--text-xs` | 11px | Hints, timestamps, meta |
| `--text-sm` | 13px | Descriptions, secondary text |
| `--text-base` | 15px | Body text default |
| `--text-lg` | 18px | Section titles |
| `--text-xl` | 22px | Panel headers |
| `--text-2xl` | 28px | Page titles |
| `--text-3xl` | 36px | Hero text |
| `--text-4xl` | 48px | Display |
| `--text-5xl` | 64px | Large display |
| `--text-6xl` | 80px | Landing page hero |

---

## Letter Spacing

| Context | Spacing | Example |
|---------|---------|---------|
| Body text | 0 | Default prose |
| Labels | 0.05em | Form labels |
| Navigation | 0.1em | Nav items |
| Headings | 0.1em–0.15em | Section titles |
| Buttons | 0.2em | Call to action |

**The pattern:** More important = more spacing. Spacing creates authority.

---

## Text Transform

- **Uppercase:** Headings, buttons, labels, navigation
- **Normal case:** Body text, descriptions, long-form content

Uppercase + letter spacing = terminal command aesthetic.

---

## Line Height

| Context | Line Height |
|---------|-------------|
| Headings | 1.2 |
| Body text | 1.6–1.7 |
| Code blocks | 1.5 |
| Dense UI | 1.4 |

---

## Text Colors

Text color creates hierarchy. Not everything should be cyan — that would be exhausting to read.

### The Hierarchy

```
Brightest → Links, featured items (draws clicks)
Prominent → Titles, values (important info)
Brand     → Icons, symbols (terminal aesthetic)
Readable  → Body text (neutral, comfortable)
Muted     → Secondary text (supporting info)
Small     → Labels, meta (contextual)
Ghosted   → Placeholders (barely visible)
```

### When to Use What

| Role | Use Case |
|------|----------|
| **Link** | Clickable titles, navigation items, call-to-action text |
| **Title** | Section headings, panel headers, data values |
| **Body** | Content, prose, messages, comments |
| **Secondary** | Descriptions, supporting text, system messages |
| **Label** | Timestamps, meta info, small category labels |
| **Placeholder** | Input hints, ghosted text |

### The Rules

1. **Body text is gray, not cyan** — Cyan draws attention; gray is comfortable to read
2. **Each step down = one shade muted** — Creates clear visual hierarchy
3. **Values and titles share the same color** — Both are "important" information
4. **Links are brighter than titles** — They invite interaction
5. **Placeholders are almost invisible** — Present but not distracting

See [Text Colors](./11_text-colors.md) for CSS variables and utility classes.

---

## Anti-Patterns

**Don't:**
- Mix fonts (stay monospace)
- Use more than 3 weights on one screen
- Skip the scale (no arbitrary sizes)
- Forget letter spacing on uppercase text
- Use centered text for long content

**Do:**
- Trust the scale
- Use weight for hierarchy, not size alone
- Keep uppercase short (labels, not paragraphs)
- Left-align body text

---

## Example: Heading Hierarchy

```html
<h1 class="text-2xl font-bold uppercase" style="letter-spacing: 0.1em">
  PAGE TITLE
</h1>

<h2 class="text-xl font-semibold uppercase" style="letter-spacing: 0.08em">
  SECTION HEADING
</h2>

<h3 class="text-lg font-medium">
  Subsection
</h3>

<p class="text-base text-gray-400">
  Body text uses regular weight and normal case for readability.
</p>
```
