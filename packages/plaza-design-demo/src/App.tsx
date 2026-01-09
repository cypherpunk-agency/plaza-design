import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
        <Route path="/" element={<LandingPage />} />
        <Route path="/guide" element={<DemoLayout />}>
          <Route index element={<GuideRoute />} />
          <Route path=":page" element={<GuideRoute />} />
        </Route>
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
