// Guide content imports - using Vite's ?raw for build-time bundling
import readmeMd from 'plaza-design-guide/README.md?raw';
import philosophyMd from 'plaza-design-guide/01_philosophy.md?raw';
import hierarchyMd from 'plaza-design-guide/02_hierarchy.md?raw';
import colorMd from 'plaza-design-guide/03_color.md?raw';
import typographyMd from 'plaza-design-guide/04_typography.md?raw';
import languageMd from 'plaza-design-guide/05_language.md?raw';
import gimmicksMd from 'plaza-design-guide/06_gimmicks.md?raw';
import themingMd from 'plaza-design-guide/07_theming.md?raw';
import formsMd from 'plaza-design-guide/08_forms.md?raw';
import modalsMd from 'plaza-design-guide/09_modals.md?raw';
import markdownMd from 'plaza-design-guide/10_markdown.md?raw';
import textColorsMd from 'plaza-design-guide/11_text-colors.md?raw';

export const guideContent = {
  index: readmeMd,
  philosophy: philosophyMd,
  hierarchy: hierarchyMd,
  color: colorMd,
  typography: typographyMd,
  language: languageMd,
  gimmicks: gimmicksMd,
  theming: themingMd,
  'text-colors': textColorsMd,
  markdown: markdownMd,
  forms: formsMd,
  modals: modalsMd,
} as const;

export type GuidePageKey = keyof typeof guideContent;
