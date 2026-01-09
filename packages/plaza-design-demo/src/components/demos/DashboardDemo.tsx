import { useState, useEffect, useRef } from 'react';
import {
  generateTelemetry,
  generateNetLog,
  generateHexData,
  getNodeCount,
  formatClock,
  TelemetryData,
  NetLogEntry
} from '../../plaza';
import './DashboardDemo.css';

export function DashboardDemo() {
  const [clock, setClock] = useState(formatClock('time'));
  const [telemetry, setTelemetry] = useState<TelemetryData>(generateTelemetry());
  const [netLog, setNetLog] = useState<NetLogEntry[]>(generateNetLog());
  const [nodeCount, setNodeCount] = useState(getNodeCount());
  const hexRef1 = useRef<HTMLDivElement>(null);
  const hexRef2 = useRef<HTMLDivElement>(null);

  // Clock update
  useEffect(() => {
    const interval = setInterval(() => {
      setClock(formatClock('time'));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Telemetry update
  useEffect(() => {
    const interval = setInterval(() => {
      setTelemetry(generateTelemetry());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Net log update
  useEffect(() => {
    const interval = setInterval(() => {
      setNetLog(generateNetLog());
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Node count update
  useEffect(() => {
    const interval = setInterval(() => {
      setNodeCount(getNodeCount());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Generate hex data
  useEffect(() => {
    if (hexRef1.current) hexRef1.current.textContent = generateHexData(1500);
    if (hexRef2.current) hexRef2.current.textContent = generateHexData(1500);
  }, []);

  return (
    <div className="dashboard-demo">
      <header className="dashboard-demo__header">
        <h1 className="text-2xl font-semibold text-primary-400 uppercase tracking-widest">
          System Dashboard
        </h1>
        <div className="dashboard-demo__status">
          <span className="text-accent-400">{clock} UTC</span>
          <span className="text-gray-600 mx-2">|</span>
          <span className="text-primary-500">{nodeCount} NODES</span>
        </div>
      </header>

      <div className="dashboard-grid">
        {/* Telemetry Panel */}
        <div className="dashboard-panel">
          <div className="plaza-window">
            <div className="plaza-corner-bracket plaza-corner-bracket--top-left"></div>
            <div className="plaza-corner-bracket plaza-corner-bracket--top-right"></div>
            <div className="plaza-corner-bracket plaza-corner-bracket--bottom-left"></div>
            <div className="plaza-corner-bracket plaza-corner-bracket--bottom-right"></div>

            <div className="plaza-window-header">
              <span className="text-primary-500">TELEMETRY</span>
              <span className="text-gray-600 ml-2">// SYS_METRICS</span>
            </div>

            <div className="dashboard-panel__content">
              <div className="telemetry-grid">
                <TelemetryItem label="PEERS" value={telemetry.peerCount} />
                <TelemetryItem label="LATENCY" value={`${telemetry.latency}ms`} />
                <TelemetryItem label="PKT_LOSS" value={`${telemetry.packetLoss.toFixed(2)}%`} />
                <TelemetryItem label="MEM_RES" value={`${telemetry.memResident}MB`} />
                <TelemetryItem label="CPU" value={`${telemetry.cpuLoad}%`} />
              </div>
            </div>
          </div>
        </div>

        {/* Network Log Panel */}
        <div className="dashboard-panel">
          <div className="plaza-window">
            <div className="plaza-corner-bracket plaza-corner-bracket--top-left"></div>
            <div className="plaza-corner-bracket plaza-corner-bracket--top-right"></div>
            <div className="plaza-corner-bracket plaza-corner-bracket--bottom-left"></div>
            <div className="plaza-corner-bracket plaza-corner-bracket--bottom-right"></div>

            <div className="plaza-window-header">
              <span className="text-primary-500">NET_LOG</span>
              <span className="text-gray-600 ml-2">// OPERATIONS</span>
            </div>

            <div className="dashboard-panel__content">
              <div className="netlog-list">
                {netLog.map((entry, idx) => (
                  <div key={idx} className="netlog-entry">
                    <span className="netlog-entry__verb">{entry.verb}</span>
                    <span className="netlog-entry__chan">{entry.chan}</span>
                    <span className={`netlog-entry__code ${entry.code === 200 ? 'text-success' : 'text-accent-400'}`}>
                      {entry.code}
                    </span>
                    <span className="netlog-entry__ms">{entry.ms}ms</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Status Panel */}
        <div className="dashboard-panel">
          <div className="plaza-window">
            <div className="plaza-corner-bracket plaza-corner-bracket--top-left"></div>
            <div className="plaza-corner-bracket plaza-corner-bracket--top-right"></div>
            <div className="plaza-corner-bracket plaza-corner-bracket--bottom-left"></div>
            <div className="plaza-corner-bracket plaza-corner-bracket--bottom-right"></div>

            <div className="plaza-window-header">
              <span className="text-primary-500">STATUS</span>
              <span className="text-gray-600 ml-2">// SYS_STATE</span>
            </div>

            <div className="dashboard-panel__content">
              <div className="status-grid">
                <StatusItem label="NETWORK" status="ONLINE" variant="success" />
                <StatusItem label="SYNC" status="ACTIVE" variant="success" />
                <StatusItem label="VALIDATOR" status="PENDING" variant="warning" />
                <StatusItem label="RPC" status="ERROR" variant="error" />
              </div>

              <div className="status-error mt-4">
                <span className="text-dim-red">ERR: 500 connection reset</span>
              </div>
            </div>
          </div>
        </div>

        {/* Hex Stream Panel */}
        <div className="dashboard-panel dashboard-panel--wide">
          <div className="plaza-window">
            <div className="plaza-corner-bracket plaza-corner-bracket--top-left"></div>
            <div className="plaza-corner-bracket plaza-corner-bracket--top-right"></div>
            <div className="plaza-corner-bracket plaza-corner-bracket--bottom-left"></div>
            <div className="plaza-corner-bracket plaza-corner-bracket--bottom-right"></div>

            <div className="plaza-window-header">
              <span className="text-primary-500">DATA_STREAM</span>
              <span className="text-gray-600 ml-2">// RAW_FEED</span>
            </div>

            <div className="dashboard-panel__content">
              <div className="hex-streams">
                <div className="hex-stream">
                  <span className="hex-stream__label text-accent-400">CHAN_A</span>
                  <div className="plaza-hex-scroll">
                    <div ref={hexRef1}></div>
                  </div>
                </div>
                <div className="hex-stream">
                  <span className="hex-stream__label text-accent-400">CHAN_B</span>
                  <div className="plaza-hex-scroll">
                    <div ref={hexRef2}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="dashboard-panel">
          <div className="plaza-window">
            <div className="plaza-corner-bracket plaza-corner-bracket--top-left"></div>
            <div className="plaza-corner-bracket plaza-corner-bracket--top-right"></div>
            <div className="plaza-corner-bracket plaza-corner-bracket--bottom-left"></div>
            <div className="plaza-corner-bracket plaza-corner-bracket--bottom-right"></div>

            <div className="plaza-window-header">
              <span className="text-primary-500">ACTIONS</span>
            </div>

            <div className="dashboard-panel__content">
              <div className="action-buttons">
                <button className="plaza-btn plaza-btn--secondary">SYNC NOW</button>
                <button className="plaza-btn plaza-btn--secondary">CLEAR LOG</button>
                <button className="plaza-btn plaza-btn--accent">RECONNECT</button>
                <button className="plaza-btn plaza-btn--tease">EXPORT</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TelemetryItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="telemetry-item">
      <span className="telemetry-item__label">{label}</span>
      <span className="telemetry-item__value">{value}</span>
    </div>
  );
}

function StatusItem({
  label,
  status,
  variant
}: {
  label: string;
  status: string;
  variant: 'success' | 'warning' | 'error';
}) {
  const variantClass = {
    success: 'text-success',
    warning: 'text-warning',
    error: 'text-error'
  }[variant];

  return (
    <div className="status-item">
      <span className="status-item__label">{label}</span>
      <span className={`status-item__value ${variantClass}`}>{status}</span>
    </div>
  );
}
