// Base properties shared by all menu items
interface MenuItemBase {
  id: string;
  label: string;
  description?: string;
  order?: number;
}

// Markdown file item - rendered by CMS
export interface FileMenuItem extends MenuItemBase {
  type: 'file';
  path: string;  // Content path for markdown
}

// Component item - rendered by app
export interface ComponentMenuItem extends MenuItemBase {
  type: 'component';
  route: string;  // URL route
}

// Union type for all menu items
export type MenuItem = FileMenuItem | ComponentMenuItem;

export interface MenuFolder {
  type: 'folder';
  id: string;
  title: string;
  children: MenuNode[];
  order?: number;
}

export type MenuNode = MenuItem | MenuFolder;

export interface Menu {
  title: string;
  subtitle?: string;
  sections: MenuNode[];
}

export interface Frontmatter {
  title?: string;
  order?: number;
  [key: string]: unknown;
}

export interface ContentEntry {
  id: string;
  path: string;
  content: string;
  frontmatter: Frontmatter;
}
