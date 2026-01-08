import { useState, useEffect } from 'react';
import {
  generateTelemetry,
  generateRoutes,
  generateKeys,
  generateNetLog,
  generateStatus,
  generateHexData,
  TelemetryData,
  StatusData,
} from '../plaza';

interface SidePanelProps {
  side: 'left' | 'right';
}

export function SidePanel({ side }: SidePanelProps) {
  const [telemetry, setTelemetry] = useState<TelemetryData>(() => generateTelemetry());
  const [netLog, setNetLog] = useState<string[]>(() => generateNetLog(5));
  const [hexData, setHexData] = useState(() => generateHexData(600));

  const routes = generateRoutes();
  const keys = generateKeys();
  const status: StatusData = generateStatus();

  useEffect(() => {
    // Update telemetry every 5 seconds
    const telemetryInterval = setInterval(() => {
      setTelemetry(generateTelemetry());
    }, 5000);

    // Update net log every 3 seconds
    const netLogInterval = setInterval(() => {
      setNetLog(generateNetLog(5));
    }, 3000);

    // Update hex data every 2.5 seconds
    const hexInterval = setInterval(() => {
      setHexData(generateHexData(600));
    }, 2500);

    return () => {
      clearInterval(telemetryInterval);
      clearInterval(netLogInterval);
      clearInterval(hexInterval);
    };
  }, []);

  if (side === 'left') {
    return (
      <div className="plaza-side-panel plaza-side-panel--left">
        {/* Telemetry */}
        <div className="mb-4">
          <div className="plaza-side-panel__header">TELEMETRY:</div>
          <div className="plaza-side-panel__divider">----------------</div>
          <div>NODE_ID: {telemetry.nodeId}</div>
          <div>LATENCY: {telemetry.latency}</div>
          <div>PEERS: {telemetry.peers}</div>
          <div>BLOCKS: {telemetry.blocks.toLocaleString()}</div>
          <div>HASH_RATE: {telemetry.hashRate}</div>
          <div>UPTIME: {telemetry.uptime}</div>
          <div>MEMPOOL: {telemetry.mempool.toLocaleString()}</div>
          <div>SYNC: {telemetry.syncStatus}</div>
        </div>

        {/* Routes */}
        <div className="mb-4">
          <div className="plaza-side-panel__header">ROUTES:</div>
          <div className="plaza-side-panel__divider">----------------</div>
          {routes.map((route, i) => (
            <div key={i}>{route}</div>
          ))}
        </div>

        {/* Keys */}
        <div className="mb-4">
          <div className="plaza-side-panel__header">KEYS:</div>
          <div className="plaza-side-panel__divider">----------------</div>
          {keys.map((k, i) => (
            <div key={i}>{k.key} {k.action}</div>
          ))}
        </div>

        {/* Hex Scroll */}
        <div className="plaza-hex-scroll">
          <div>{hexData}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="plaza-side-panel plaza-side-panel--right">
      {/* Net Log */}
      <div className="mb-4">
        <div className="plaza-side-panel__header">NET:</div>
        <div className="plaza-side-panel__divider">----------------</div>
        {netLog.map((log, i) => (
          <div key={i}>{log}</div>
        ))}
      </div>

      {/* Status */}
      <div className="mb-4">
        <div className="plaza-side-panel__header">STATUS:</div>
        <div className="plaza-side-panel__divider">----------------</div>
        <div>CONNECTIONS: {status.connections}</div>
        <div>BANDWIDTH: {status.bandwidth}</div>
        <div>ENCRYPTION: {status.encryption}</div>
        <div>PROTOCOL: {status.protocol}</div>
        <div>TLS: {status.tls}</div>
        <div>MODE: {status.mode}</div>
      </div>

      {/* Hex Scroll */}
      <div className="plaza-hex-scroll">
        <div>{hexData}</div>
      </div>
    </div>
  );
}
