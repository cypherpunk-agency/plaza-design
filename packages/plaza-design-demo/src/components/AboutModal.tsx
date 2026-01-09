import { Modal, Button } from 'plaza-react-components';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="ABOUT // PLAZA"
      className="w-full max-w-lg mx-4"
      footer={
        <div className="flex justify-center">
          <Button variant="secondary" onClick={onClose}>
            CLOSE
          </Button>
        </div>
      }
    >
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
    </Modal>
  );
}
