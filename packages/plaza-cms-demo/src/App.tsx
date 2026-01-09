import { useState, useEffect } from 'react';
import { ContentLayout } from 'plaza-cms';
import { Window } from 'plaza-react-components';
import { cmsContent, cmsMenu } from './cms-content';

function getPathFromUrl(): string {
  const path = window.location.pathname.slice(1); // Remove leading /
  return path || 'index';
}

export function App() {
  const [currentPath, setCurrentPath] = useState(getPathFromUrl);

  // Sync URL → state (back/forward buttons)
  useEffect(() => {
    const handlePopState = () => setCurrentPath(getPathFromUrl());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Navigate: update URL path
  const navigate = (path: string) => {
    const urlPath = path === 'index' ? '/' : `/${path}`;
    if (window.location.pathname !== urlPath) {
      history.pushState({ path }, '', urlPath);
      setCurrentPath(path);
    }
  };

  const content = cmsContent[currentPath] || cmsContent.index;

  return (
    <div className="min-h-screen p-8" style={{ background: 'var(--color-bg-primary)' }}>
      <Window className="max-w-6xl mx-auto">
        <ContentLayout
          menu={cmsMenu}
          content={content}
          currentPath={currentPath}
          onNavigate={navigate}
        />
      </Window>
    </div>
  );
}
