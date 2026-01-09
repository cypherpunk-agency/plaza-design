# Plaza Design System - Synchronization Feedback

This document captures observations, findings, and recommendations from the process of synchronizing `demo-modular.html` and `demo-react/` with the canonical `demo-single.html`.

---

## Summary

Successfully synchronized three demo implementations to produce identical visual output:
- `demo-single.html` - Canonical reference (single-file, inline everything)
- `demo-modular.html` - Modular version using `plaza.css` + `plaza.js`
- `demo-react/` - React component library version

---

## Observations

### 1. Canonical vs Modular Drift

The canonical `demo-single.html` had evolved significantly from the modular versions. Key differences found:

| Element | Modular (Before) | Canonical | Impact |
|---------|------------------|-----------|--------|
| Grid horizon | 40% | 65% | Major visual difference - sun position |
| Particle count | 20-30 | 50 | Density of ambient effect |
| Window border | 2px solid | 1px semi-transparent | Subtlety of frame |
| Window background | 0.92 opacity | 0.10 opacity | Much more transparent |
| Corner brackets | 24px, 2px | 20px, 1px | Finer detail |
| Side panel width | 200px | 240px | Content area |
| Button padding | 0.75rem 2rem | 16px 50px | Button proportions |
| Data updates | Random jumps | Stateful drift | Living system feel |

### 2. Content Divergence

The modular versions had different content entirely:
- Title: "PLAZA" vs "[CYPHERPUNK.AGENCY]"
- Subtitle: "Decentralized Social Protocol" vs "DECENTRALIZED SOCIAL EVOLUTION"
- Buttons: Two buttons (ENTER, ABOUT) vs single tease button
- Footer: Basic status vs disabled terminal input with SEND button
- Side panels: Generic telemetry vs specific format with dots alignment

### 3. Missing CSS Classes

Several CSS classes existed only in the canonical version:
- `.plaza-btn--tease` - Button that disables on hover
- `.evolution-text` - Glitch effect on hover
- `.plaza-side-panel__block` - Block container with border
- `.footer-*` classes - Footer sub-component styling
- `.route-link`, `.route-disabled` - Route styling variants
- `.text-ambient-cyan`, `.text-ambient-amber` - Ambient color utilities
- `.text-dim-red` - Error state color

### 4. Animation Differences

- Hex scroll: opacity 0.15 → 0.4, font-size 10px → 8px
- Particles: 3px → 1px, different float animation
- Scanline hover effect on buttons (::before pseudo-element)

---

## Design System Gaps

### 1. No Single Source of Truth

The canonical `demo-single.html` became the de facto reference, but changes made there didn't propagate to:
- `plaza.css` (reusable stylesheet)
- `plaza.js` (utility functions)
- Design guide documentation

**Recommendation**: Establish a build process where the canonical demo is generated FROM the modular files, not the other way around.

### 2. Incomplete Design Tokens

The CSS custom properties (`:root` variables) don't cover all design decisions:
- Specific opacity values for window backgrounds
- Animation timings and durations
- Font sizes for different contexts
- Spacing values (34px inset, 300px side padding)

**Recommendation**: Expand design tokens to include:
```css
--plaza-window-inset: 34px;
--plaza-window-inset-mobile: 18px;
--plaza-content-padding: 300px;
--plaza-content-padding-mobile: 28px;
--plaza-particle-count: 50;
--plaza-horizon-position: 0.65;
```

### 3. Undocumented Interactive States

The evolution text hover effect and tease button behavior aren't documented in the design guide. These are signature interactions that define the experience.

**Recommendation**: Add to design guide:
- Evolution text: "EVOLUTION" → "REVOLUTION" glitch on hover
- Tease button: Grays out and shows "not-allowed" cursor on hover

### 4. Stateful Data Pattern Undocumented

The "living system" data drift pattern (values change gradually, not randomly) is a key design decision that wasn't documented.

**Recommendation**: Add to design guide philosophy:
```
Data displays should feel alive but not chaotic. Values drift slowly
from their previous state rather than jumping randomly. This creates
the illusion of monitoring a real system.
```

---

## Technical Recommendations

### 1. Component Architecture

Consider restructuring the component hierarchy:

```
plaza-core/
├── plaza.css          # Base styles + tokens
├── plaza.js           # Core utilities
└── components/
    ├── window.css     # Window frame styles
    ├── button.css     # Button variants
    ├── panel.css      # Side panel styles
    └── effects.css    # Animations, glitches
```

### 2. Build Verification

Add automated visual regression testing:
- Screenshot each demo at standard viewport sizes
- Compare screenshots to detect drift
- Run on CI before merges

### 3. Living Documentation

Generate the design guide from the actual CSS/JS:
- Extract color values from CSS custom properties
- Extract component examples from demo files
- Keep docs in sync automatically

### 4. TypeScript Consistency

The React demo uses TypeScript but some patterns differ from vanilla JS:
- Interface definitions for data types
- Stricter typing on function parameters
- Consider generating types from the vanilla JS

---

## Files Modified

### Root Level
- `plaza.css` - Comprehensive update (~150 lines changed)
- `plaza.js` - Stateful data, horizon, particles
- `demo-modular.html` - Content and structure sync

### demo-react/
- `src/plaza.css` - Synced with root
- `src/plaza.ts` - Stateful data, TypeScript types
- `src/components/LandingPage.tsx` - Particle count
- `src/components/LandingPage.css` - Positioning
- `src/components/CenterContent.tsx` - Title, subtitle, button, evolution effect
- `src/components/WindowFrame.tsx` - Header/footer structure
- `src/components/SidePanel.tsx` - Content format, block containers

---

## Conclusion

The synchronization revealed that maintaining multiple implementations of the same design requires:

1. **Clear ownership** - One version must be canonical
2. **Automated sync** - Manual sync leads to drift
3. **Complete documentation** - Every visual decision documented
4. **Design tokens** - All magic numbers extracted to variables

The Plaza Design System has strong aesthetic principles, but the tooling to maintain consistency across implementations needs improvement. Consider investing in:
- Storybook or similar for component documentation
- Visual regression testing
- CSS custom property documentation generator
- Single source of truth for all variants
