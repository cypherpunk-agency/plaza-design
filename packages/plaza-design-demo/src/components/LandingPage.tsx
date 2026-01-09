import { GridBackground } from './GridBackground';
import { Particles } from './Particles';
import { WindowFrame } from './WindowFrame';
import { SidePanel } from './SidePanel';
import { CenterContent } from './CenterContent';
import './LandingPage.css';

export function LandingPage() {
  return (
    <div className="bg-black overflow-hidden h-screen">
      {/* Grid Canvas Background */}
      <GridBackground />

      {/* Floating Particles */}
      <Particles count={50} />

      {/* Main Window Container */}
      <div className="demo-container z-20">
        <WindowFrame>
          <div className="demo-content">
            {/* Left Side Panel */}
            <SidePanel side="left" />

            {/* Center Content */}
            <CenterContent />

            {/* Right Side Panel */}
            <SidePanel side="right" />
          </div>
        </WindowFrame>
      </div>
    </div>
  );
}
