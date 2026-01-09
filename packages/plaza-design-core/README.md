# Plaza Design Core

CSS design system with themes and JS utilities.

## CSS

```css
@import 'plaza-design-core/plaza.css';
```

Or import individually:

| File | Contents |
|------|----------|
| `plaza.css` | Full design system |
| `tokens.css` | Design tokens only |
| `base.css` | Reset + body styles |
| `themes/*.css` | Individual themes |

## Themes

| Theme | Style |
|-------|-------|
| `neon` | Orange/cyan cyberpunk (default) |
| `ice` | Cold blue precision |
| `forest` | Green/gold terminal |
| `grayscale` | Desaturated monochrome |
| `modern` | Clean slate/blue professional |

Set via attribute: `<html data-theme="modern">`

## JS API

```js
import { setTheme, cycleTheme, getTheme } from 'plaza-design-core/plaza';
```

### Theme

- `setTheme(name)` - Set theme by name
- `cycleTheme()` - Cycle to next theme
- `getTheme()` - Get current theme name
- `getAvailableThemes()` - List all themes
- `registerTheme(name, config)` - Add custom theme

### Effects

- `initGridCanvas(id)` - Animated perspective grid
- `createParticles(id, count)` - Floating particles
- `startClock(id, format)` - UTC clock display
- `initGlitchEffect(id)` - Text glitch effect

### Data Generation

- `generateTelemetry()` - Fake telemetry data
- `generateNetLog(count)` - Network log entries
- `adjustValue(current, min, max, delta)` - Smooth value drift
