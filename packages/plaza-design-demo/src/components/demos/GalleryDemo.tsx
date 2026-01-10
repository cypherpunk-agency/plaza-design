import { useState, useEffect, useRef } from 'react';
import { generateHexData } from '../../plaza';
import './GalleryDemo.css';

export function GalleryDemo() {
  const [evolutionGlitching, setEvolutionGlitching] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalVariant, setModalVariant] = useState<'default' | 'danger' | 'success'>('default');
  const hexRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hexRef.current) {
      hexRef.current.textContent = generateHexData(2000);
    }
  }, []);

  const handleEvolutionHover = () => {
    if (!evolutionGlitching) {
      setEvolutionGlitching(true);
      setTimeout(() => setEvolutionGlitching(false), 400);
    }
  };

  const openModal = (variant: 'default' | 'danger' | 'success') => {
    setModalVariant(variant);
    setShowModal(true);
  };

  return (
    <div className="gallery-demo">
      <header className="gallery-demo__header">
        <h1 className="text-2xl font-semibold text-primary-400 uppercase tracking-widest">
          Component Gallery
        </h1>
        <p className="text-gray-500 mt-2">
          Visual reference for all Plaza design kit components
        </p>
      </header>

      {/* HIERARCHY SECTION - The Core Principle */}
      <section className="gallery-section gallery-section--highlight">
        <h2 className="gallery-section__title">Interactive vs Decorative</h2>
        <p className="gallery-section__desc">
          The most important design decision: <strong>2px borders for interactive</strong>, <strong>1px borders for decorative</strong>.
        </p>

        <div className="hierarchy-comparison">
          <div className="hierarchy-side">
            <h3 className="hierarchy-label">INTERACTIVE</h3>
            <p className="hierarchy-rule">Demands attention. Users click it.</p>
            <div className="hierarchy-demo hierarchy-demo--interactive">
              <button className="plaza-btn plaza-btn--sm">CLICK ME</button>
            </div>
            <ul className="hierarchy-specs">
              <li>2px border</li>
              <li>Full opacity</li>
              <li>Glow effects</li>
              <li>Hover feedback</li>
            </ul>
          </div>

          <div className="hierarchy-divider">VS</div>

          <div className="hierarchy-side">
            <h3 className="hierarchy-label">DECORATIVE</h3>
            <p className="hierarchy-rule">Sets the mood. Users glance at it.</p>
            <div className="hierarchy-demo hierarchy-demo--decorative">
              <div className="plaza-side-panel__block">
                <span className="text-ambient-cyan">PEER_COUNT: 47</span>
              </div>
            </div>
            <ul className="hierarchy-specs">
              <li>1px border</li>
              <li>40-75% opacity</li>
              <li>Minimal glow</li>
              <li>Subtle hover</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Buttons Section */}
      <section className="gallery-section">
        <h2 className="gallery-section__title">Buttons</h2>
        <p className="gallery-section__desc">
          Interactive elements with neon glow, scanline hover effects, and press feedback.
        </p>

        <div className="gallery-grid">
          <div className="gallery-item">
            <span className="gallery-item__label">Primary</span>
            <button className="plaza-btn">ENTER</button>
          </div>

          <div className="gallery-item">
            <span className="gallery-item__label">Secondary</span>
            <button className="plaza-btn plaza-btn--secondary">CANCEL</button>
          </div>

          <div className="gallery-item">
            <span className="gallery-item__label">Accent</span>
            <button className="plaza-btn plaza-btn--accent">CONNECT</button>
          </div>

          <div className="gallery-item">
            <span className="gallery-item__label">Tease (disables on hover)</span>
            <button className="plaza-btn plaza-btn--tease">COMING SOON</button>
          </div>

          <div className="gallery-item">
            <span className="gallery-item__label">Disabled</span>
            <button className="plaza-btn" disabled>LOCKED</button>
          </div>
        </div>
      </section>

      {/* Button Sizes Section */}
      <section className="gallery-section">
        <h2 className="gallery-section__title">Button Sizes</h2>
        <p className="gallery-section__desc">
          Size variants for different contexts: inline actions, standard, and primary CTAs.
        </p>

        <div className="gallery-grid gallery-grid--sizes">
          <div className="gallery-item">
            <span className="gallery-item__label">Extra Small (xs)</span>
            <button className="plaza-btn plaza-btn--xs">XS</button>
          </div>

          <div className="gallery-item">
            <span className="gallery-item__label">Small (sm)</span>
            <button className="plaza-btn plaza-btn--sm">SMALL</button>
          </div>

          <div className="gallery-item">
            <span className="gallery-item__label">Default</span>
            <button className="plaza-btn">DEFAULT</button>
          </div>

          <div className="gallery-item">
            <span className="gallery-item__label">Large (lg)</span>
            <button className="plaza-btn plaza-btn--lg">LARGE</button>
          </div>

          <div className="gallery-item">
            <span className="gallery-item__label">Icon Button</span>
            <button className="plaza-btn plaza-btn--icon">X</button>
          </div>

          <div className="gallery-item">
            <span className="gallery-item__label">Icon Small</span>
            <button className="plaza-btn plaza-btn--icon plaza-btn--sm">+</button>
          </div>
        </div>
      </section>

      {/* Form Inputs Section */}
      <section className="gallery-section">
        <h2 className="gallery-section__title">Form Inputs</h2>
        <p className="gallery-section__desc">
          Interactive form elements with 2px borders and focus glow states.
        </p>

        <div className="gallery-forms">
          <div className="gallery-form-row">
            <div className="plaza-form-group">
              <label className="plaza-label">Text Input</label>
              <input type="text" className="plaza-input" placeholder="Enter value..." />
            </div>

            <div className="plaza-form-group">
              <label className="plaza-label plaza-label--required">Required Field</label>
              <input type="text" className="plaza-input" placeholder="Required..." />
            </div>
          </div>

          <div className="gallery-form-row">
            <div className="plaza-form-group">
              <label className="plaza-label">Error State</label>
              <input type="text" className="plaza-input plaza-input--error" value="Invalid input" readOnly />
              <span className="plaza-error-message">This field is required</span>
            </div>

            <div className="plaza-form-group">
              <label className="plaza-label">Success State</label>
              <input type="text" className="plaza-input plaza-input--success" value="Valid input" readOnly />
            </div>
          </div>

          <div className="gallery-form-row">
            <div className="plaza-form-group">
              <label className="plaza-label">Select</label>
              <select className="plaza-select">
                <option>Option 1</option>
                <option>Option 2</option>
                <option>Option 3</option>
              </select>
            </div>

            <div className="plaza-form-group">
              <label className="plaza-label">Textarea</label>
              <textarea className="plaza-textarea" placeholder="Enter message..." rows={3}></textarea>
            </div>
          </div>

          <div className="gallery-form-row">
            <div className="plaza-form-group">
              <label className="plaza-checkbox-label">
                <input type="checkbox" className="plaza-checkbox" />
                Checkbox option
              </label>
            </div>

            <div className="plaza-form-group">
              <label className="plaza-radio-label">
                <input type="radio" name="demo-radio" className="plaza-radio" />
                Radio option A
              </label>
              <label className="plaza-radio-label" style={{ marginLeft: '1rem' }}>
                <input type="radio" name="demo-radio" className="plaza-radio" />
                Radio option B
              </label>
            </div>
          </div>
        </div>
      </section>

      {/* Modal Section */}
      <section className="gallery-section">
        <h2 className="gallery-section__title">Modals</h2>
        <p className="gallery-section__desc">
          Dialog windows with backdrop blur. Click to preview each variant.
        </p>

        <div className="gallery-grid">
          <div className="gallery-item">
            <span className="gallery-item__label">Default Modal</span>
            <button className="plaza-btn plaza-btn--sm" onClick={() => openModal('default')}>
              OPEN
            </button>
          </div>

          <div className="gallery-item">
            <span className="gallery-item__label">Danger Modal</span>
            <button className="plaza-btn plaza-btn--sm" onClick={() => openModal('danger')}>
              OPEN
            </button>
          </div>

          <div className="gallery-item">
            <span className="gallery-item__label">Success Modal</span>
            <button className="plaza-btn plaza-btn--sm" onClick={() => openModal('success')}>
              OPEN
            </button>
          </div>
        </div>
      </section>

      {/* Side Panel Block Section */}
      <section className="gallery-section">
        <h2 className="gallery-section__title">Side Panel Blocks</h2>
        <p className="gallery-section__desc">
          Decorative containers that brighten on hover. 1px borders, reduced opacity.
        </p>

        <div className="gallery-panel-blocks">
          <div className="plaza-side-panel__block">
            <div className="plaza-side-panel__header">TELEMETRY</div>
            <div className="block-content">
              <div><span className="text-gray-500">PEER_COUNT:</span> <span className="text-ambient-cyan">47</span></div>
              <div><span className="text-gray-500">LATENCY:</span> <span className="text-ambient-cyan">32ms</span></div>
              <div><span className="text-gray-500">STATUS:</span> <span className="text-dim-green">ONLINE</span></div>
            </div>
          </div>

          <div className="plaza-side-panel__block">
            <div className="plaza-side-panel__header">PROCESSES</div>
            <div className="block-content">
              <div><span className="text-ambient-amber">SYNC</span>.L1... <span className="text-gray-500">200</span></div>
              <div><span className="text-ambient-amber">VERIFY</span>.P2P... <span className="text-gray-500">200</span></div>
              <div><span className="text-ambient-amber">ROUTE</span>.RPC... <span className="text-dim-red">500</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* Terminal Icons Section */}
      <section className="gallery-section">
        <h2 className="gallery-section__title">Terminal Icons</h2>
        <p className="gallery-section__desc">
          Typography-based icons. No graphics, just characters.
        </p>

        <div className="gallery-grid gallery-grid--icons">
          <div className="gallery-item">
            <span className="gallery-icon">&gt;</span>
            <span className="gallery-item__label">Prompt / Go</span>
          </div>

          <div className="gallery-item">
            <span className="gallery-icon">#</span>
            <span className="gallery-item__label">Channel</span>
          </div>

          <div className="gallery-item">
            <span className="gallery-icon">[ ]</span>
            <span className="gallery-item__label">Metadata</span>
          </div>

          <div className="gallery-item">
            <span className="gallery-icon">x</span>
            <span className="gallery-item__label">Close</span>
          </div>

          <div className="gallery-item">
            <span className="gallery-icon terminal-cursor">█</span>
            <span className="gallery-item__label">Cursor</span>
          </div>

          <div className="gallery-item">
            <span className="gallery-icon">▶</span>
            <span className="gallery-item__label">Send / Play</span>
          </div>

          <div className="gallery-item">
            <span className="gallery-icon text-warning">!</span>
            <span className="gallery-item__label">Warning</span>
          </div>

          <div className="gallery-item">
            <span className="gallery-icon text-success">✓</span>
            <span className="gallery-item__label">Success</span>
          </div>
        </div>
      </section>

      {/* Window Section */}
      <section className="gallery-section">
        <h2 className="gallery-section__title">Window</h2>
        <p className="gallery-section__desc">
          Terminal-style framed container with header, footer, and corner brackets.
        </p>

        <div className="gallery-window-demo">
          <div className="plaza-window">
            <div className="plaza-corner-bracket plaza-corner-bracket--top-left"></div>
            <div className="plaza-corner-bracket plaza-corner-bracket--top-right"></div>
            <div className="plaza-corner-bracket plaza-corner-bracket--bottom-left"></div>
            <div className="plaza-corner-bracket plaza-corner-bracket--bottom-right"></div>

            <div className="plaza-window-header">
              <span className="text-primary-500">STATUS:</span> CONNECTED
              <span className="ml-4 text-accent-400">NODE_COUNT: 47</span>
            </div>

            <div className="plaza-window-content" style={{ padding: '2rem' }}>
              <p className="text-gray-400">
                Window content area. This component provides a consistent framing
                for terminal-style interfaces.
              </p>
            </div>

            <div className="plaza-window-footer">
              <span className="footer-timestamp">14:32:05 UTC</span>
              <span className="footer-terminal">TERMINAL</span>
              <span className="footer-prompt">&gt;</span>
              <span className="footer-input-area">
                <span className="footer-not-auth">[ NOT AUTHENTICATED ]</span>
              </span>
              <button className="footer-send-btn footer-send-btn--disabled" disabled>[SEND]</button>
            </div>
          </div>
        </div>
      </section>

      {/* Text Effects Section */}
      <section className="gallery-section">
        <h2 className="gallery-section__title">Text Effects</h2>
        <p className="gallery-section__desc">
          Glows, glitches, and interactive text transformations.
        </p>

        <div className="gallery-grid gallery-grid--effects">
          <div className="gallery-item">
            <span className="gallery-item__label">Neon Glow</span>
            <span className="text-2xl text-shadow-neon text-primary-500 font-bold">
              GLOW
            </span>
          </div>

          <div className="gallery-item">
            <span className="gallery-item__label">Small Neon</span>
            <span className="text-lg text-shadow-neon-sm text-accent-400 font-semibold">
              SUBTLE
            </span>
          </div>

          <div className="gallery-item">
            <span className="gallery-item__label">Glitch (hover)</span>
            <span
              className="plaza-glitch plaza-glitch--layers text-xl font-bold text-primary-400"
              data-text="GLITCH"
            >
              GLITCH
            </span>
          </div>

          <div className="gallery-item">
            <span className="gallery-item__label">Evolution (hover)</span>
            <span
              className={`evolution-text text-xl font-bold ${evolutionGlitching ? 'glitching' : ''}`}
              data-hover="REVOLUTION"
              onMouseEnter={handleEvolutionHover}
            >
              EVOLUTION
            </span>
          </div>

          <div className="gallery-item">
            <span className="gallery-item__label">Blinking Cursor</span>
            <span className="text-primary-400">
              READY<span className="terminal-cursor">_</span>
            </span>
          </div>

          <div className="gallery-item">
            <span className="gallery-item__label">CRT Flicker</span>
            <span className="crt-flicker text-primary-400">FLICKERING</span>
          </div>
        </div>
      </section>

      {/* Ambient & Status Colors Section */}
      <section className="gallery-section">
        <h2 className="gallery-section__title">Ambient & Status Colors</h2>
        <p className="gallery-section__desc">
          Subdued text colors for decorative elements and ambient status display.
        </p>

        <div className="gallery-grid">
          <div className="gallery-item">
            <span className="gallery-item__label">Ambient Cyan</span>
            <span className="text-ambient-cyan">BACKGROUND DATA</span>
          </div>

          <div className="gallery-item">
            <span className="gallery-item__label">Ambient Amber</span>
            <span className="text-ambient-amber">DECORATIVE TEXT</span>
          </div>

          <div className="gallery-item">
            <span className="gallery-item__label">Dim Red</span>
            <span className="text-dim-red">ERROR: FAILED</span>
          </div>

          <div className="gallery-item">
            <span className="gallery-item__label">Dim Green</span>
            <span className="text-dim-green">STATUS: ONLINE</span>
          </div>

          <div className="gallery-item">
            <span className="gallery-item__label">Dim Amber</span>
            <span className="text-dim-amber">WARNING: SLOW</span>
          </div>
        </div>
      </section>

      {/* Links Section */}
      <section className="gallery-section">
        <h2 className="gallery-section__title">Links</h2>
        <p className="gallery-section__desc">
          Navigation links with hover glow states.
        </p>

        <div className="gallery-grid">
          <div className="gallery-item">
            <span className="gallery-item__label">Route Link</span>
            <a href="#" className="route-link" onClick={e => e.preventDefault()}>
              /dashboard
            </a>
          </div>

          <div className="gallery-item">
            <span className="gallery-item__label">Disabled Route</span>
            <span className="route-disabled">/admin</span>
          </div>
        </div>
      </section>

      {/* Hex Scroll Section */}
      <section className="gallery-section">
        <h2 className="gallery-section__title">Hex Scroll</h2>
        <p className="gallery-section__desc">
          Ambient scrolling hex data for atmospheric decoration.
        </p>

        <div className="gallery-hex-demo">
          <div className="plaza-hex-scroll">
            <div ref={hexRef}></div>
          </div>
        </div>
      </section>

      {/* Navigation Items Section */}
      <section className="gallery-section">
        <h2 className="gallery-section__title">Navigation Items</h2>
        <p className="gallery-section__desc">
          Menu items with optional subtitles. Used in sidebar navigation.
        </p>

        <div className="gallery-nav-items">
          <div className="gallery-nav-item-demo">
            <span className="gallery-item__label">With Subtitle</span>
            <div className="plaza-nav-item">
              <span className="plaza-nav-item-label">HIERARCHY</span>
              <span className="plaza-nav-item-desc">Interactive vs decorative</span>
            </div>
          </div>

          <div className="gallery-nav-item-demo">
            <span className="gallery-item__label">Active State</span>
            <div className="plaza-nav-item active">
              <span className="plaza-nav-item-label">COLOR</span>
              <span className="plaza-nav-item-desc">Palette & semantics</span>
            </div>
          </div>

          <div className="gallery-nav-item-demo">
            <span className="gallery-item__label">Without Subtitle</span>
            <div className="plaza-nav-item">
              <span className="plaza-nav-item-label">TYPOGRAPHY</span>
            </div>
          </div>

          <div className="gallery-nav-item-demo">
            <span className="gallery-item__label">Section Header</span>
            <button className="plaza-nav-section-header">
              <span className="plaza-nav-collapse-icon">▼</span>
              DESIGN GUIDE
            </button>
          </div>
        </div>
      </section>

      {/* Modal Portal */}
      {showModal && (
        <div className="plaza-modal-overlay" onClick={() => setShowModal(false)}>
          <div
            className={`plaza-modal plaza-modal--sm ${modalVariant === 'danger' ? 'plaza-modal--danger' : ''} ${modalVariant === 'success' ? 'plaza-modal--success' : ''}`}
            onClick={e => e.stopPropagation()}
          >
            <div className="plaza-modal__header">
              <h2 className="plaza-modal__title">
                {modalVariant === 'danger' ? 'CONFIRM DELETE' : modalVariant === 'success' ? 'SUCCESS' : 'CONFIRM ACTION'}
              </h2>
              <button className="plaza-modal__close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="plaza-modal__body">
              <p>
                {modalVariant === 'danger'
                  ? 'This action cannot be undone. Are you sure you want to proceed?'
                  : modalVariant === 'success'
                    ? 'Operation completed successfully.'
                    : 'Are you sure you want to proceed with this action?'}
              </p>
            </div>
            <div className="plaza-modal__footer">
              <button className="plaza-btn plaza-btn--secondary plaza-btn--sm" onClick={() => setShowModal(false)}>
                {modalVariant === 'success' ? 'CLOSE' : 'CANCEL'}
              </button>
              {modalVariant !== 'success' && (
                <button className="plaza-btn plaza-btn--sm" onClick={() => setShowModal(false)}>
                  CONFIRM
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
