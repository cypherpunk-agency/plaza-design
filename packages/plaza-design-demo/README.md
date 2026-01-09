# Plaza React Demo

React implementation of the Plaza design system demo.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build production React app |
| `npm run preview` | Preview production build |
| `npm run generate-demos` | Generate static HTML demos |

## Demo Generation

The React components serve as the source of truth for the static HTML demos:

```bash
npm run generate-demos
```

This generates two files in the project root:

- **`demo-modular.html`** - Links to external `plaza-core/plaza.css` and `plaza.js`
- **`demo-single.html`** - All CSS and JS inlined (self-contained)

Both demos use vanilla JavaScript (`plaza.js`) for runtime interactivity, not React.

## Project Structure

```
demo-react/
├── src/
│   ├── components/       # React components
│   │   ├── LandingPage.tsx
│   │   ├── WindowFrame.tsx
│   │   ├── SidePanel.tsx
│   │   ├── CenterContent.tsx
│   │   ├── GridBackground.tsx
│   │   └── Particles.tsx
│   ├── ssg/              # Static site generation
│   │   ├── StaticLandingPage.tsx
│   │   └── render.tsx
│   └── plaza.ts          # Utility functions
├── scripts/
│   └── generate-demos.tsx
└── package.json
```

## How Demo Generation Works

1. `StaticLandingPage.tsx` renders the HTML structure with element IDs
2. `render.tsx` uses `ReactDOMServer.renderToStaticMarkup()` to produce HTML
3. `generate-demos.tsx` wraps the HTML with boilerplate and writes both demo files
4. For `demo-single.html`, all CSS from `plaza-core/` and JS from `plaza.js` are inlined
