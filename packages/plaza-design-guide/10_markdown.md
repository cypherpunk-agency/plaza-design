# Markdown

Plaza renders markdown with **terminal aesthetics**. This guide covers how to write content that looks great in Plaza's markdown renderer.

---

## The Rule

> Write markdown as you normally would. Plaza's CSS handles the styling.

---

## Supported Elements

### Headings

```markdown
# H1 - Page Title (cyan, uppercase, border)
## H2 - Section (cyan, uppercase)
### H3 - Subsection (orange)
#### H4 - Minor heading (gray)
```

Use H1 once per page. H2 for major sections. H3 for subsections.

---

### Text Formatting

```markdown
**Bold text** renders in cyan (primary-400)
*Italic text* renders in orange (accent-500)
Normal text is gray-400
```

**Bold** draws attention. *Italic* adds emphasis. Use sparingly.

---

### Links

```markdown
[Link text](./path/to/file.md)
[External link](https://example.com)
```

Links are orange with subtle underline. They glow on hover.

---

### Lists

```markdown
- Unordered item
- Another item
  - Nested item

1. Ordered item
2. Another item
```

List markers are cyan. Supports nesting.

---

### Blockquotes

```markdown
> This is a blockquote. Use for key rules or important callouts.
```

Blockquotes have a cyan left border and italic styling. Perfect for highlighting core principles.

---

### Code

Inline code uses backticks:

```markdown
Use `--color-primary-500` for borders.
```

Code blocks use triple backticks with language:

````markdown
```css
.plaza-btn {
  border: 2px solid var(--color-primary-500);
}
```
````

Supported languages: `css`, `html`, `javascript`, `typescript`, `json`, `bash`, and more.

---

### Tables

```markdown
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |
```

Tables have:
- Cyan header background
- Subtle borders
- Row hover highlighting

---

### Horizontal Rules

```markdown
---
```

Creates a subtle divider. Use between major sections.

---

## Best Practices

### Structure

1. **Start with H1** - One per document
2. **Use H2 for sections** - These create visual breaks
3. **Add horizontal rules** - Between major topics
4. **Keep paragraphs short** - Terminal aesthetic favors brevity

### Formatting

- **Bold for key terms** - Draws the eye
- *Italic for emphasis* - Softer highlight
- `Code for technical values` - Variables, classes, values
- > Blockquotes for rules - The most important principle

### Tables

- Keep columns minimal (2-4)
- Use for reference data
- Header text should be short

---

## Writing Style

Plaza markdown follows the [Language](./05_language.md) guide:

- **Direct and technical** - No fluff
- **Imperative mood** - "Use this" not "You should use this"
- **Short sentences** - Terminal-like brevity
- **Uppercase for headings** - Handled by CSS

---

## Example Document

```markdown
# Component Name

Brief description of what this component does.

---

## The Rule

> The core principle in a blockquote.

---

## Usage

Basic usage example:

\`\`\`html
<div class="plaza-component">
  Content here
</div>
\`\`\`

---

## Variants

| Variant | Class | Use Case |
|---------|-------|----------|
| Default | `.plaza-component` | Standard use |
| Small | `.plaza-component--sm` | Compact spaces |

---

## Best Practices

- **Do this** - Explanation
- **Don't do this** - Why not
```

---

## Technical Notes

### Renderer

Plaza uses `react-markdown` with `remark-gfm` for GitHub Flavored Markdown support (tables, strikethrough, autolinks).

### Syntax Highlighting

Code blocks use `react-syntax-highlighter` with a dark theme customized to match Plaza's palette.

### CSS Variables

All markdown styling uses Plaza CSS variables, so content automatically adapts to theme changes.
