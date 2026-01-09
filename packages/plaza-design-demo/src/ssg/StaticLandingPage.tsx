/**
 * StaticLandingPage - Static version of the landing page for SSG
 *
 * Renders the same HTML structure as the dynamic LandingPage but:
 * - No React hooks (useState, useEffect)
 * - Empty containers with IDs for plaza.js to populate
 * - Static placeholders for dynamic values
 */
export function StaticLandingPage() {
  return (
    <>
      {/* Grid Canvas Background */}
      <canvas id="grid-canvas" className="fixed inset-0 z-0"></canvas>

      {/* Floating Particles - plaza.js will populate */}
      <div id="particles" className="fixed inset-0 z-10 pointer-events-none"></div>

      {/* Main Window Container */}
      <div className="plaza-window demo-window z-20">
        {/* Corner Brackets */}
        <div className="plaza-corner-bracket plaza-corner-bracket--tl"></div>
        <div className="plaza-corner-bracket plaza-corner-bracket--tr"></div>
        <div className="plaza-corner-bracket plaza-corner-bracket--bl"></div>
        <div className="plaza-corner-bracket plaza-corner-bracket--br"></div>

        {/* Header Bar */}
        <div className="plaza-window-header">
          <span>
            <span>INITIATING CONNECTION...</span>
            <span style={{ color: 'rgba(80, 200, 120, 0.7)', marginLeft: '10px' }}>PROTOCOL ONLINE</span>
          </span>
          <span style={{ color: 'rgba(255,122,0,0.75)' }}>
            NODES: <span id="node-count">--</span> ACTIVE
          </span>
        </div>

        {/* Main Content Area */}
        <div className="demo-content">
          {/* Left Side Panel */}
          <div className="plaza-side-panel plaza-side-panel--left">
            <div id="telemetry"></div>
            <div id="routes"></div>
            <div id="keys"></div>
            <div className="plaza-hex-scroll"><div id="hex-left"></div></div>
          </div>

          {/* Center Content */}
          <div className="demo-center">
            <h1 id="title" className="demo-title font-bold text-primary-500 text-shadow-neon uppercase tracking-wider">
              [CYPHERPUNK.AGENCY]
            </h1>
            <p className="demo-subtitle text-accent-400 tracking-widest uppercase mb-8">
              DECENTRALIZED SOCIAL
              <span id="evolution-word" className="evolution-text" data-hover=" REVOLUTION">
                &nbsp; EVOLUTION
              </span>
            </p>
            <div className="flex gap-4 justify-center flex-wrap" style={{ marginTop: '46px' }}>
              <button className="plaza-btn plaza-btn--tease">enter</button>
            </div>
          </div>

          {/* Right Side Panel */}
          <div className="plaza-side-panel plaza-side-panel--right">
            <div id="netlog"></div>
            <div id="status"></div>
            <div className="plaza-hex-scroll"><div id="hex-right"></div></div>
          </div>
        </div>

        {/* Footer Bar */}
        <div className="plaza-window-footer">
          <span className="footer-timestamp"><span id="clock"></span></span>
          <span className="footer-terminal">TERMINAL</span>
          <span className="footer-prompt">&gt;</span>
          <span className="footer-input-area"><span className="footer-not-auth">[ NOT AUTHENTICATED ]</span></span>
          <button className="footer-send-btn footer-send-btn--disabled" disabled>&#9654; SEND</button>
        </div>
      </div>
    </>
  );
}
