import { NavLink } from 'react-router-dom';
import { cycleTheme, getTheme } from '../../plaza';
import { useState, useEffect } from 'react';
import './DemoNav.css';

const designGuideItems = [
  { path: '/guide', label: 'OVERVIEW', desc: 'Introduction' },
  { path: '/guide/philosophy', label: 'PHILOSOPHY', desc: 'The soul of Plaza' },
  { path: '/guide/hierarchy', label: 'HIERARCHY', desc: 'Interactive vs decorative' },
  { path: '/guide/color', label: 'COLOR', desc: 'Palette & semantics' },
  { path: '/guide/typography', label: 'TYPOGRAPHY', desc: 'Font scale & weights' },
  { path: '/guide/language', label: 'LANGUAGE', desc: 'Voice & tone' },
];

const devGuideItems = [
  { path: '/guide/theming', label: 'THEMING', desc: 'Theme switching' },
  { path: '/guide/text-colors', label: 'TEXT COLORS', desc: 'Semantic text variables' },
  { path: '/guide/markdown', label: 'MARKDOWN', desc: 'Content formatting' },
  { path: '/guide/gimmicks', label: 'GIMMICKS', desc: 'Fun patterns' },
  { path: '/guide/forms', label: 'FORMS', desc: 'Input fields' },
  { path: '/guide/modals', label: 'MODALS', desc: 'Dialog windows' },
];

const demos = [
  { path: '/demos/gallery', label: 'GALLERY', desc: 'Component reference' },
  { path: '/demos/dashboard', label: 'DASHBOARD', desc: 'System monitoring' },
  { path: '/demos/chat', label: 'CHAT', desc: 'Message interface' },
  { path: '/demos/forum', label: 'FORUM', desc: 'Discussion threads' },
];

export function DemoNav() {
  const [theme, setTheme] = useState(getTheme());

  useEffect(() => {
    const handleThemeChange = (e: CustomEvent<{ theme: string }>) => {
      setTheme(e.detail.theme);
    };
    window.addEventListener('plaza-theme-change', handleThemeChange as EventListener);
    return () => window.removeEventListener('plaza-theme-change', handleThemeChange as EventListener);
  }, []);

  return (
    <nav className="demo-nav">
      <div className="demo-nav__header">
        <NavLink to="/" className="demo-nav__home">
          [PLAZA]
        </NavLink>
        <span className="demo-nav__subtitle">DESIGN KIT</span>
      </div>

      <div className="demo-nav__sections">
        <div className="demo-nav__section">
          <div className="demo-nav__section-title">DESIGN GUIDE</div>
          <ul className="demo-nav__list">
            {designGuideItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.path === '/guide'}
                  className={({ isActive }) =>
                    `demo-nav__link ${isActive ? 'demo-nav__link--active' : ''}`
                  }
                >
                  <span className="demo-nav__link-label">{item.label}</span>
                  <span className="demo-nav__link-desc">{item.desc}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        <div className="demo-nav__section">
          <div className="demo-nav__section-title">DEV GUIDE</div>
          <ul className="demo-nav__list">
            {devGuideItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `demo-nav__link ${isActive ? 'demo-nav__link--active' : ''}`
                  }
                >
                  <span className="demo-nav__link-label">{item.label}</span>
                  <span className="demo-nav__link-desc">{item.desc}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        <div className="demo-nav__section">
          <div className="demo-nav__section-title">DEMOS</div>
          <ul className="demo-nav__list">
            {demos.map((demo) => (
              <li key={demo.path}>
                <NavLink
                  to={demo.path}
                  className={({ isActive }) =>
                    `demo-nav__link ${isActive ? 'demo-nav__link--active' : ''}`
                  }
                >
                  <span className="demo-nav__link-label">{demo.label}</span>
                  <span className="demo-nav__link-desc">{demo.desc}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="demo-nav__footer">
        <button className="demo-nav__theme-btn" onClick={cycleTheme}>
          THEME: {theme.toUpperCase()}
        </button>
        <div className="demo-nav__hint">[T] to cycle</div>
      </div>
    </nav>
  );
}
