# Plaza Design Kit

A cyberpunk terminal design system.

## What's Here

| File | Description |
|------|-------------|
| `plaza-core/` | Modular CSS design system |
| `plaza.js` | JS utilities (theme, clock, effects) |
| `demo-single.html` | All-in-one demo (no dependencies) |
| `demo-modular.html` | Modular demo (uses external CSS/JS) |
| `demo-react/` | React demo app + demo generator |
| `design-guide/` | Design philosophy & guidelines |

## Quick Start

```html
<link rel="stylesheet" href="plaza-core/plaza.css">
<button class="plaza-btn">ENTER</button>
```

## Demo Files

The HTML demos are **generated from React**:

```bash
cd demo-react
npm install
npm run generate-demos
```

This generates both `demo-modular.html` and `demo-single.html` from the React components.

- **demo-modular.html** - Uses external `plaza-core/plaza.css` and `plaza.js` (requires HTTP server)
- **demo-single.html** - Self-contained with all CSS/JS inlined (works from file://)

## React Demo

The React demo is a standalone app that can be developed independently:

```bash
cd demo-react
npm install
npm run dev      # Development server
npm run build    # Production build
```

## Documentation

See [design-guide/](./design-guide/) for philosophy, hierarchy, language, and gimmicks.

## License

MIT
