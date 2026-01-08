import { ReactNode, useState, useEffect } from 'react';
import { formatClock } from '../plaza';

interface WindowFrameProps {
  children: ReactNode;
}

export function WindowFrame({ children }: WindowFrameProps) {
  const [clock, setClock] = useState(formatClock('full'));
  const [nodeCount, setNodeCount] = useState(42);

  useEffect(() => {
    // Clock update every second
    const clockInterval = setInterval(() => {
      setClock(formatClock('full'));
    }, 1000);

    // Node count update every 8 seconds
    const nodeInterval = setInterval(() => {
      setNodeCount(Math.floor(Math.random() * 50) + 20);
    }, 8000);

    return () => {
      clearInterval(clockInterval);
      clearInterval(nodeInterval);
    };
  }, []);

  return (
    <div className="plaza-window demo-window">
      {/* Corner Brackets */}
      <div className="plaza-corner-bracket plaza-corner-bracket--tl" />
      <div className="plaza-corner-bracket plaza-corner-bracket--tr" />
      <div className="plaza-corner-bracket plaza-corner-bracket--bl" />
      <div className="plaza-corner-bracket plaza-corner-bracket--br" />

      {/* Header Bar */}
      <div className="plaza-window-header">
        <span>
          <span className="text-accent-400">&gt; INITIATE_ACCESS //</span>
          <span className="text-primary-500 text-shadow-neon-sm ml-2">PROTOCOL ONLINE</span>
        </span>
        <span className="text-primary-600">
          NODE: {nodeCount} ACTIVE
        </span>
      </div>

      {/* Main Content Area */}
      {children}

      {/* Footer Bar */}
      <div className="plaza-window-footer">
        <span className="text-accent-400">[SYSTEM ONLINE]</span>
        <span className="text-primary-500">
          READY<span className="terminal-cursor">_</span>
        </span>
        <span className="text-primary-600">{clock}</span>
      </div>
    </div>
  );
}
