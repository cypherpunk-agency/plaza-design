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
  RouteItem,
  NetLogEntry,
} from '../plaza';

interface SidePanelProps {
  side: 'left' | 'right';
}

// Helper to format telemetry with dots alignment
function formatTelemetryLine(label: string, value: string | number, totalWidth = 28): string {
  const valueStr = String(value);
  const dots = '.'.repeat(Math.max(1, totalWidth - label.length - valueStr.length));
  return `${label}${dots} ${valueStr}`;
}

export function SidePanel({ side }: SidePanelProps) {
  const [telemetry, setTelemetry] = useState<TelemetryData>(() => generateTelemetry());
  const [netLog, setNetLog] = useState<NetLogEntry[]>(() => generateNetLog());
  const [hexData] = useState(() => generateHexData(600));

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
      setNetLog(generateNetLog());
    }, 3000);

    return () => {
      clearInterval(telemetryInterval);
      clearInterval(netLogInterval);
    };
  }, []);

  if (side === 'left') {
    return (
      <div className="plaza-side-panel plaza-side-panel--left">
        {/* Telemetry */}
        <div className="plaza-side-panel__block">
          <div className="plaza-side-panel__header">telemetry</div>
          <div>{formatTelemetryLine('peer_count', telemetry.peerCount)}</div>
          <div>{formatTelemetryLine('latency', `${telemetry.latency}ms`)}</div>
          <div>{formatTelemetryLine('packet_loss', `${telemetry.packetLoss.toFixed(2)}%`)}</div>
          <div>{formatTelemetryLine('mem_resident', `${telemetry.memResident}MB`)}</div>
          <div>{formatTelemetryLine('cpu_load', `${telemetry.cpuLoad}%`)}</div>
        </div>

        {/* Routes */}
        <div className="plaza-side-panel__block">
          <div className="plaza-side-panel__header">routes</div>
          {routes.map((route: RouteItem, i: number) => (
            <div key={i}>
              {route.disabled ? (
                <span className="route-disabled">{route.path}</span>
              ) : (
                <a href={route.href} target="_blank" rel="noopener noreferrer" className="route-link">
                  {route.path}
                </a>
              )}
            </div>
          ))}
        </div>

        {/* Keys */}
        <div className="plaza-side-panel__block">
          <div className="plaza-side-panel__header">keys</div>
          {keys.map((k, i) => (
            <div key={i}><span className="text-ambient-amber">{k.key}</span> {k.action}</div>
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
      {/* Processes */}
      <div className="plaza-side-panel__block">
        <div className="plaza-side-panel__header">processes</div>
        {netLog.map((entry: NetLogEntry, i: number) => (
          <div key={i}>
            <span className="text-ambient-amber">{entry.verb}</span>.{entry.chan}... {entry.code} ({entry.ms}ms)
          </div>
        ))}
      </div>

      {/* Updates */}
      <div className="plaza-side-panel__block">
        <div className="plaza-side-panel__header">updates</div>
        <div className="text-dim-red">{status.error}</div>
      </div>

      {/* Hex Scroll */}
      <div className="plaza-hex-scroll">
        <div>{hexData}</div>
      </div>
    </div>
  );
}
