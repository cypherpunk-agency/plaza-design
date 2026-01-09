# Plaza CMS Guide

Documentation package exporting markdown files.

## Purpose

Content source for plaza-cms-demo. Files are imported via `?raw` suffix.

## File Format

Each markdown file uses YAML frontmatter:

```yaml
---
title: Display Title
order: 1
---
```

Files with numeric prefixes (e.g., `01_getting-started.md`) are auto-sorted.
