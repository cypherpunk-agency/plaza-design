import { useEffect } from 'react';
import { LandingPage } from './components/LandingPage';
import { initPlazaTheme, toggleTheme } from './plaza';

function App() {
  useEffect(() => {
    // Initialize theme from localStorage
    initPlazaTheme();

    // Global keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        // Could navigate to main app
        console.log('ENTER pressed - would navigate to main app');
      } else if (e.key.toLowerCase() === 't') {
        toggleTheme();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return <LandingPage />;
}

export default App;
