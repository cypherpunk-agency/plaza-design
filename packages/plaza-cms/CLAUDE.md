# Plaza CMS

## CSS Classes

Components use CSS classes from plaza-design-core:
- `.plaza` - Content styling (apply at any level: body, section, article)
- `.plaza-content-layout` - Layout container
- `.plaza-content-nav` - Navigation sidebar
- `.plaza-nav-*` - Navigation elements

## Frontmatter

YAML between `---` markers at file start:

```yaml
---
title: Page Title
order: 1
---
```

## File Ordering

Files with numeric prefix (e.g., `01_intro.md`) are sorted by prefix.
The prefix is stripped from display labels.
