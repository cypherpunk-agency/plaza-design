import type { Menu, MenuNode, MenuItem, MenuFolder, FileMenuItem, ComponentMenuItem } from '../types';
import { useCollapsedSections } from '../hooks/useCollapsedSections';

export type NavVariant = 'windowed' | 'borderless';

interface ContentNavProps {
  menu: Menu;
  currentPath: string;
  onNavigate: (path: string) => void;
  className?: string;
  storageKey?: string;  // For localStorage persistence
  variant?: NavVariant; // Visual style variant
  basePath?: string;    // Base path for URLs (e.g., '/guide')
  useHashUrls?: boolean; // Use hash URLs (#path) vs path URLs (/base/path)
  collapsible?: boolean; // Enable collapsible sections (default: true for windowed, false for borderless)
}

// Count items in a folder recursively
function countItems(node: MenuNode): number {
  if (node.type === 'folder') {
    return node.children.reduce((sum, child) => sum + countItems(child), 0);
  }
  return 1; // Both 'file' and 'component' count as 1
}

export function ContentNav({
  menu,
  currentPath,
  onNavigate,
  className,
  storageKey = 'plaza-cms-collapsed',
  variant = 'windowed',
  basePath = '',
  useHashUrls = true,
  collapsible
}: ContentNavProps) {
  const { isCollapsed, toggle } = useCollapsedSections(storageKey);
  const isBorderless = variant === 'borderless';
  // Default: windowed is collapsible, borderless can opt-in
  const isCollapsible = collapsible ?? !isBorderless;

  const getItemHref = (item: MenuItem) => {
    // Component items use their route directly
    if (item.type === 'component') {
      return item.route;
    }
    // File items use hash or path-based URLs
    if (useHashUrls) {
      return `#${item.path}`;
    }
    // Path-based: handle index page (path='index') as just basePath
    if (item.path === 'index') {
      return basePath || '/';
    }
    return basePath ? `${basePath}/${item.path}` : `/${item.path}`;
  };

  const isItemActive = (item: MenuItem) => {
    // Component items match by route
    if (item.type === 'component') {
      return currentPath === item.route || currentPath.startsWith(item.route + '/');
    }
    // File items match by path
    if (item.path === 'index') {
      return currentPath === basePath || currentPath === `${basePath}/` || currentPath === 'index';
    }
    const itemFullPath = basePath ? `${basePath}/${item.path}` : item.path;
    return currentPath === item.path || currentPath === itemFullPath;
  };

  const getItemPath = (item: MenuItem) => {
    return item.type === 'component' ? item.route : item.path;
  };

  const renderItem = (item: MenuItem) => (
    <a
      key={item.id}
      href={getItemHref(item)}
      className={`plaza-nav-item ${isItemActive(item) ? 'active' : ''}`}
      onClick={(e) => {
        e.preventDefault();
        onNavigate(getItemPath(item));
      }}
    >
      <span className="plaza-nav-item-label">{item.label}</span>
      {isBorderless && item.description && (
        <span className="plaza-nav-item-desc">{item.description}</span>
      )}
    </a>
  );

  const renderFolder = (folder: MenuFolder) => {
    const collapsed = isCollapsible && isCollapsed(folder.id);

    // Non-collapsible: static headers
    if (!isCollapsible) {
      return (
        <div key={folder.id} className="plaza-nav-section">
          <div className="plaza-nav-section-title">{folder.title}</div>
          <div className="plaza-nav-section-items">
            {folder.children.map(renderNode)}
          </div>
        </div>
      );
    }

    // Collapsible: clickable headers with toggle
    return (
      <div
        key={folder.id}
        className={`plaza-nav-section ${collapsed ? 'collapsed' : ''}`}
      >
        <button
          className="plaza-nav-section-header"
          onClick={() => toggle(folder.id)}
          aria-expanded={!collapsed}
        >
          <span className="plaza-nav-collapse-icon">
            {collapsed ? '▶' : '▼'}
          </span>
          <span className="plaza-nav-section-title">{folder.title}</span>
          {!isBorderless && (
            <span className="plaza-nav-item-count">{countItems(folder)}</span>
          )}
        </button>
        {!collapsed && (
          <div className="plaza-nav-section-items">
            {folder.children.map(renderNode)}
          </div>
        )}
      </div>
    );
  };

  const renderNode = (node: MenuNode) => {
    if (node.type === 'folder') return renderFolder(node);
    return renderItem(node); // Handles both 'file' and 'component' types
  };

  const variantClass = `plaza-content-nav--${variant}`;

  return (
    <nav className={`plaza-content-nav ${variantClass} ${className || ''}`}>
      {menu.title && <h2 className="plaza-nav-title">{menu.title}</h2>}
      {menu.subtitle && <p className="plaza-nav-subtitle">{menu.subtitle}</p>}
      <div className="plaza-nav-sections">
        {menu.sections.map(renderNode)}
      </div>
    </nav>
  );
}
