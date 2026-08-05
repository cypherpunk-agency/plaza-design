import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './components/LandingPage';
import { DemoLayout } from './components/shared/DemoLayout';
import { GuideRoute } from './components/guide';
import { GalleryDemo } from './components/demos/GalleryDemo';
import { DashboardDemo } from './components/demos/DashboardDemo';
import { ChatDemo } from './components/demos/ChatDemo';
import { ForumDemo } from './components/demos/ForumDemo';
import { MarkdownDemo } from './components/demos/MarkdownDemo';
import { initPlazaTheme, cycleTheme } from './plaza';

function App() {
  useEffect(() => {
    // Initialize theme from localStorage
    initPlazaTheme();

    // Global keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only cycle theme with 't' if not in an input/textarea
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      if (e.key.toLowerCase() === 't' && !isInput) {
        cycleTheme();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* This domain is the design system, so the guide is the front door.
            Redirecting rather than rendering the guide here keeps one canonical
            URL per page instead of serving the index at both / and /guide. */}
        <Route path="/" element={<Navigate to="/guide" replace />} />
        <Route path="/guide" element={<DemoLayout />}>
          <Route index element={<GuideRoute />} />
          <Route path=":page" element={<GuideRoute />} />
        </Route>
        {/* The landing page is a full-screen takeover (h-screen, its own window
            frame), so it sits outside DemoLayout rather than inside its <main>.
            It is listed in the demos nav for discoverability. */}
        <Route path="/demos/landing" element={<LandingPage />} />
        <Route path="/demos" element={<DemoLayout />}>
          <Route path="gallery" element={<GalleryDemo />} />
          <Route path="dashboard" element={<DashboardDemo />} />
          <Route path="chat" element={<ChatDemo />} />
          <Route path="forum" element={<ForumDemo />} />
          <Route path="markdown" element={<MarkdownDemo />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
