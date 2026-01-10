import { Outlet, useLocation, useNavigate, NavLink } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { ContentNav, type Menu, type MenuFolder, type ComponentMenuItem } from 'plaza-cms';
import { guideMenu, indexItem, designGuideFolder, devGuideFolder } from '../../guide-content';
import { cycleTheme, getTheme } from '../../plaza';
import './DemoLayout.css';

// Demos section as CMS MenuFolder with component items
const demosFolder: MenuFolder = {
  type: 'folder',
  id: 'demos',
  title: 'DEMOS',
  order: 2,
  children: [
    { type: 'component', id: 'gallery', route: '/demos/gallery', label: 'GALLERY', description: 'Component reference' },
    { type: 'component', id: 'dashboard', route: '/demos/dashboard', label: 'DASHBOARD', description: 'System monitoring' },
    { type: 'component', id: 'chat', route: '/demos/chat', label: 'CHAT', description: 'Message interface' },
    { type: 'component', id: 'forum', route: '/demos/forum', label: 'FORUM', description: 'Discussion threads' },
    { type: 'component', id: 'markdown', route: '/demos/markdown', label: 'MARKDOWN', description: 'Content formatting' },
  ] as ComponentMenuItem[],
};

export function DemoLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(getTheme());

  // Combine sections: index (top), design guide, demos, dev guide
  const fullMenu: Menu = useMemo(() => ({
    title: guideMenu.title,
    subtitle: guideMenu.subtitle,
    sections: [indexItem, designGuideFolder, demosFolder, devGuideFolder],
  }), []);

  useEffect(() => {
    const handleThemeChange = (e: CustomEvent<{ theme: string }>) => {
      setTheme(e.detail.theme);
    };
    window.addEventListener('plaza-theme-change', handleThemeChange as EventListener);
    return () => window.removeEventListener('plaza-theme-change', handleThemeChange as EventListener);
  }, []);

  // Get current path for active state detection
  const getCurrentPath = () => {
    const path = location.pathname;
    // For guide pages
    if (path === '/guide' || path === '/guide/') return 'index';
    if (path.startsWith('/guide/')) return path.slice(7);
    // For component pages, return full path
    return path;
  };

  // Handle navigation for both file and component items
  const handleNavigate = (itemPath: string) => {
    // Component routes start with /
    if (itemPath.startsWith('/')) {
      navigate(itemPath);
    } else if (itemPath === 'index') {
      navigate('/guide');
    } else {
      navigate(`/guide/${itemPath}`);
    }
  };

  return (
    <div className="demo-layout">
      <div className="demo-layout-window">
        <nav className="demo-sidebar">
          {/* Header */}
          <div className="demo-sidebar__header">
            <NavLink to="/" className="demo-sidebar__home">
              {fullMenu.title}
            </NavLink>
            {fullMenu.subtitle && (
              <span className="demo-sidebar__subtitle">{fullMenu.subtitle}</span>
            )}
          </div>

          {/* Scrollable content area */}
          <div className="demo-sidebar__content">
            {/* All sections via unified ContentNav */}
            <ContentNav
              menu={{ ...fullMenu, title: '', subtitle: '' }}
              currentPath={getCurrentPath()}
              onNavigate={handleNavigate}
              variant="borderless"
              basePath="/guide"
              useHashUrls={false}
              collapsible={true}
              className="demo-sidebar__nav"
            />
          </div>

          {/* Footer with theme toggle */}
          <div className="demo-sidebar__footer">
            <button className="demo-sidebar__theme-btn" onClick={cycleTheme}>
              THEME: {theme.toUpperCase()}
            </button>
            <div className="demo-sidebar__hint">[T] to cycle</div>
          </div>
        </nav>

        <main className="demo-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
