interface AboutModalProps {
  onClose: () => void;
}

export function AboutModal({ onClose }: AboutModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.85)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="plaza-window w-full max-w-lg mx-4 p-0">
        {/* Corner Brackets */}
        <div className="plaza-corner-bracket plaza-corner-bracket--tl" />
        <div className="plaza-corner-bracket plaza-corner-bracket--tr" />
        <div className="plaza-corner-bracket plaza-corner-bracket--bl" />
        <div className="plaza-corner-bracket plaza-corner-bracket--br" />

        <div className="plaza-window-header">
          <span className="text-primary-500">ABOUT // PLAZA</span>
          <button
            onClick={onClose}
            className="text-primary-600 hover:text-primary-400 transition-colors cursor-pointer"
            style={{ background: 'none', border: 'none' }}
          >
            [X]
          </button>
        </div>

        <div className="p-6">
          <p className="text-primary-400 text-sm mb-4">
            <span className="text-accent-400">Mission:</span> Build decentralized social infrastructure that preserves{' '}
            <span className="text-primary-300">sovereignty</span>,{' '}
            <span className="text-primary-300">privacy</span>, and{' '}
            <span className="text-primary-300">credible neutrality</span>.
          </p>
          <p className="text-primary-400 text-sm mb-4">
            <span className="text-accent-400">Stack:</span> Polkadot Asset Hub, Solidity smart contracts, encrypted messaging, session wallet delegates.
          </p>
          <p className="text-primary-400 text-sm">
            <span className="text-accent-400">Design:</span> Terminal retro-futurism. No rounded corners. Neon glows. Monospace everything.
          </p>
        </div>

        <div className="plaza-window-footer justify-center">
          <button className="plaza-btn plaza-btn--secondary" onClick={onClose}>
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
