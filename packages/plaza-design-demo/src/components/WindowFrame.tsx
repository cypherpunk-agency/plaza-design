import { ReactNode, useState, useEffect } from 'react';
import { Window } from 'plaza-react-components';
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

  const header = (
    <>
      <span>
        <span>INITIATING CONNECTION...</span>
        <span style={{ color: 'rgba(80, 200, 120, 0.7)', marginLeft: '10px' }}>PROTOCOL ONLINE</span>
      </span>
      <span style={{ color: 'rgba(255,122,0,0.75)' }}>
        NODES: <span id="node-count">{nodeCount}</span> ACTIVE
      </span>
    </>
  );

  const footer = (
    <>
      <span className="footer-timestamp"><span id="clock">{clock}</span></span>
      <span className="footer-terminal">TERMINAL</span>
      <span className="footer-prompt">&gt;</span>
      <span className="footer-input-area"><span className="footer-not-auth">[ NOT AUTHENTICATED ]</span></span>
      <button className="footer-send-btn footer-send-btn--disabled" disabled>▶ SEND</button>
    </>
  );

  return (
    <Window className="demo-window" header={header} footer={footer}>
      {children}
    </Window>
  );
}
