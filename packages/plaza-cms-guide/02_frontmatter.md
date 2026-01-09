---
title: Frontmatter
order: 2
---

# Frontmatter

Plaza CMS supports YAML frontmatter at the beginning of markdown files.

## Syntax

```markdown
---
title: My Page Title
order: 5
custom_field: any value
---

# Page Content

Your markdown content here...
```

## Standard Fields

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Page title (used in navigation) |
| `order` | number | Sort order for menu items |

## Using Frontmatter

```typescript
import { parseFrontmatter } from 'plaza-cms';

const { metadata, content } = parseFrontmatter(rawMarkdown);

console.log(metadata.title);  // "My Page Title"
console.log(metadata.order);  // 5
console.log(content);         // "# Page Content\n\nYour markdown..."
```

## Custom Fields

You can add any custom fields to frontmatter:

```markdown
---
title: API Reference
order: 10
author: Jane Doe
tags: api, reference
draft: false
---
```

Access them via `metadata`:

```typescript
const { metadata } = parseFrontmatter(content);
console.log(metadata.author);  // "Jane Doe"
console.log(metadata.draft);   // "false" (string, not boolean)
```

## Numeric Parsing

Numeric values are automatically parsed:

```markdown
---
order: 5
score: 3.5
---
```

```typescript
const { metadata } = parseFrontmatter(content);
console.log(typeof metadata.order);  // "number"
console.log(metadata.score);         // 3.5
```
