import { useState, useCallback, useRef, useEffect } from 'react';
import { AboutModal } from './AboutModal';

export function CenterContent() {
  const [showAbout, setShowAbout] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);

  const handleEnter = useCallback(() => {
    // Flash effect
    const title = titleRef.current;
    if (title) {
      title.style.transform = 'scale(1.02)';
      title.style.filter = 'brightness(1.3)';
      setTimeout(() => {
        title.style.transform = '';
        title.style.filter = '';
      }, 200);
    }
    console.log('ENTER pressed - would navigate to main app');
  }, []);

  const handleAbout = useCallback(() => {
    setShowAbout(true);
  }, []);

  const closeAbout = useCallback(() => {
    setShowAbout(false);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleEnter();
      } else if (e.key.toLowerCase() === 'a' && !showAbout) {
        handleAbout();
      } else if (e.key === 'Escape' && showAbout) {
        closeAbout();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleEnter, handleAbout, closeAbout, showAbout]);

  return (
    <>
      <div className="demo-center">
        <h1
          ref={titleRef}
          className="demo-title font-bold text-primary-500 text-shadow-neon uppercase tracking-wider plaza-glitch"
          data-text="PLAZA"
          style={{ transition: 'transform 0.2s, filter 0.2s' }}
        >
          PLAZA
        </h1>
        <p className="demo-subtitle text-accent-400 tracking-widest uppercase mb-8">
          Decentralized Social Protocol
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <button className="plaza-btn" onClick={handleEnter}>
            ENTER
          </button>
          <button className="plaza-btn plaza-btn--secondary" onClick={handleAbout}>
            ABOUT
          </button>
        </div>
      </div>

      {showAbout && <AboutModal onClose={closeAbout} />}
    </>
  );
}
