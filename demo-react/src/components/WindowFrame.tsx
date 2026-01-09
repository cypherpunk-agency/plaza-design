import { ReactNode, useState, useEffect } from 'react';
import { formatClock, getNodeCount } from '../plaza';

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

    // Node count update every 8 seconds with drift
    const nodeInterval = setInterval(() => {
      setNodeCount(getNodeCount());
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
          <span>INITIATING CONNECTION...</span>
          <span style={{ color: 'rgba(80, 200, 120, 0.7)', marginLeft: '10px' }}>PROTOCOL ONLINE</span>
        </span>
        <span style={{ color: 'rgba(255,122,0,0.75)' }}>
          NODES: <span id="node-count">{nodeCount}</span> ACTIVE
        </span>
      </div>

      {/* Main Content Area */}
      {children}

      {/* Footer Bar */}
      <div className="plaza-window-footer">
        <span className="footer-timestamp"><span id="clock">{clock}</span></span>
        <span className="footer-terminal">TERMINAL</span>
        <span className="footer-prompt">&gt;</span>
        <span className="footer-input-area"><span className="footer-not-auth">[ NOT AUTHENTICATED ]</span></span>
        <button className="footer-send-btn footer-send-btn--disabled" disabled>▶ SEND</button>
      </div>
    </div>
  );
}
