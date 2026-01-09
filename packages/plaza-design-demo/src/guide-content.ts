// Guide content imports - using Vite's ?raw for build-time bundling
import { parseFrontmatter } from 'plaza-cms';
import type { Menu, MenuItem, MenuFolder } from 'plaza-cms';

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

// Content map for rendering
export const guideContent: Record<string, string> = {
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
};

export type GuidePageKey = keyof typeof guideContent;

// Helper to create menu item with frontmatter title
function createItem(id: string, content: string, description: string, order: number): MenuItem {
  const { metadata } = parseFrontmatter(content);
  return {
    type: 'file',
    id,
    path: id,
    label: (metadata.title as string) || id.toUpperCase(),
    description,
    order,
  };
}

// Design Guide section - philosophy, principles, aesthetics
const designGuideFolder: MenuFolder = {
  type: 'folder',
  id: 'design-guide',
  title: 'DESIGN GUIDE',
  order: 1,
  children: [
    createItem('index', readmeMd, 'Introduction', 0),
    createItem('philosophy', philosophyMd, 'The soul of Plaza', 1),
    createItem('hierarchy', hierarchyMd, 'Interactive vs decorative', 2),
    createItem('color', colorMd, 'Palette & semantics', 3),
    createItem('typography', typographyMd, 'Font scale & weights', 4),
    createItem('language', languageMd, 'Voice & tone', 5),
  ],
};

// Dev Guide section - implementation, patterns, components
const devGuideFolder: MenuFolder = {
  type: 'folder',
  id: 'dev-guide',
  title: 'DEV GUIDE',
  order: 2,
  children: [
    createItem('theming', themingMd, 'Theme switching', 1),
    createItem('text-colors', textColorsMd, 'Semantic text variables', 2),
    createItem('markdown', markdownMd, 'Content formatting', 3),
    createItem('gimmicks', gimmicksMd, 'Fun patterns', 4),
    createItem('forms', formsMd, 'Input fields', 5),
    createItem('modals', modalsMd, 'Dialog windows', 6),
  ],
};

// Full guide menu with sections
export const guideMenu: Menu = {
  title: '[PLAZA]',
  subtitle: 'DESIGN KIT',
  sections: [designGuideFolder, devGuideFolder],
};

// Flat menu (for simple navigation without folders)
const allItems: MenuItem[] = [
  ...designGuideFolder.children as MenuItem[],
  ...devGuideFolder.children as MenuItem[],
];

export const guideFlatMenu: Menu = {
  title: 'Design Guide',
  subtitle: 'Plaza Design System',
  sections: allItems,
};
