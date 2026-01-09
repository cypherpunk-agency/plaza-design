import { useState, useCallback, useRef, useEffect } from 'react';

export function CenterContent() {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const evolutionRef = useRef<HTMLSpanElement>(null);
  const [isGlitching, setIsGlitching] = useState(false);

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
  }, []);

  // Keyboard shortcuts (Enter only - theme handled by App.tsx)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleEnter();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleEnter]);

  // Evolution text hover effect - glitch once then revert
  const handleEvolutionHover = useCallback(() => {
    if (isGlitching) return;
    setIsGlitching(true);
    setTimeout(() => {
      setIsGlitching(false);
    }, 400);
  }, [isGlitching]);

  return (
    <div className="demo-center">
      <h1
        id="title"
        ref={titleRef}
        className="demo-title font-bold text-primary-500 text-shadow-neon uppercase tracking-wider"
        style={{ transition: 'transform 0.2s, filter 0.2s' }}
      >
        [CYPHERPUNK.AGENCY]
      </h1>
      <p className="demo-subtitle text-accent-400 tracking-widest uppercase mb-8">
        DECENTRALIZED SOCIAL
        <span
          ref={evolutionRef}
          id="evolution-word"
          className={`evolution-text${isGlitching ? ' glitching' : ''}`}
          data-hover=" REVOLUTION"
          onMouseEnter={handleEvolutionHover}
        >
          &nbsp; EVOLUTION
        </span>
      </p>
      <div className="flex gap-4 justify-center flex-wrap" style={{ marginTop: '46px' }}>
        <button className="plaza-btn plaza-btn--tease">
          enter
        </button>
      </div>
    </div>
  );
}
