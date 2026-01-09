import { parseFrontmatter, parseOrderPrefix, fileToLabel } from 'plaza-cms';
import type { Menu, MenuItem, MenuFolder } from 'plaza-cms';

// Import markdown from plaza-cms-guide
import readmeMd from 'plaza-cms-guide/README.md?raw';
import gettingStartedMd from 'plaza-cms-guide/01_getting-started.md?raw';
import frontmatterMd from 'plaza-cms-guide/02_frontmatter.md?raw';
import menuStructureMd from 'plaza-cms-guide/03_menu-structure.md?raw';
import componentsMd from 'plaza-cms-guide/04_components.md?raw';
import themingMd from 'plaza-cms-guide/05_theming.md?raw';

// Import examples subfolder
import exampleBasicMd from 'plaza-cms-guide/examples/01_basic-setup.md?raw';
import exampleThemesMd from 'plaza-cms-guide/examples/02_custom-themes.md?raw';

// Content map (flat with path keys)
export const cmsContent: Record<string, string> = {
  index: readmeMd,
  'getting-started': gettingStartedMd,
  frontmatter: frontmatterMd,
  'menu-structure': menuStructureMd,
  components: componentsMd,
  theming: themingMd,
  'examples/basic-setup': exampleBasicMd,
  'examples/custom-themes': exampleThemesMd,
};

// Build menu items for top-level docs
const topLevelContent = {
  index: readmeMd,
  'getting-started': gettingStartedMd,
  frontmatter: frontmatterMd,
  'menu-structure': menuStructureMd,
  components: componentsMd,
  theming: themingMd,
};

const menuItems: MenuItem[] = Object.entries(topLevelContent).map(([id, content]) => {
  const { metadata } = parseFrontmatter(content);
  const { order } = parseOrderPrefix(id);
  return {
    type: 'file' as const,
    id,
    path: id,
    label: metadata.title as string || fileToLabel(id),
    order: (metadata.order as number) ?? order ?? 999,
  };
});

menuItems.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

// Build examples folder
const examplesFolder: MenuFolder = {
  type: 'folder',
  id: 'examples',
  title: 'Examples',
  order: 100,
  children: [
    {
      type: 'file',
      id: 'examples/basic-setup',
      path: 'examples/basic-setup',
      label: 'Basic Setup',
      order: 1,
    },
    {
      type: 'file',
      id: 'examples/custom-themes',
      path: 'examples/custom-themes',
      label: 'Custom Themes',
      order: 2,
    },
  ],
};

export const cmsMenu: Menu = {
  title: 'Plaza CMS',
  subtitle: 'Documentation',
  sections: [...menuItems, examplesFolder],
};
