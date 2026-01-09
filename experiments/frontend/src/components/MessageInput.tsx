import { useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';

interface MessageInputProps {
  onSend: (message: string) => Promise<boolean>;
  disabled: boolean;
  isSending: boolean;
  onConnectWallet?: () => void;
}

export function MessageInput({ onSend, disabled, isSending, onConnectWallet }: MessageInputProps) {
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!message.trim() || disabled || isSending) return;

    try {
      const success = await onSend(message);

      if (success) {
        setMessage('');
      } else {
        toast.error('✖ TRANSMISSION FAILED');
      }
    } catch (error) {
      toast.error('✖ TRANSMISSION ERROR');
    }
  };

  // Handle click on disabled input area - prompt wallet connection
  const handleDisabledClick = () => {
    if (disabled && onConnectWallet) {
      onConnectWallet();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t-2 border-primary-500 bg-black p-3 md:p-4">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-500 font-mono text-sm">
            &gt;
          </span>
          {disabled && onConnectWallet ? (
            // Clickable overlay when disabled - triggers wallet connection
            <button
              type="button"
              onClick={handleDisabledClick}
              className="w-full pl-8 pr-4 py-3 bg-black border-2 border-primary-600 text-primary-600 font-mono text-base md:text-sm text-left cursor-pointer hover:border-primary-500 hover:text-primary-500 transition-all touch-target"
            >
              <span className="hidden sm:inline">[CONNECT WALLET TO POST]</span>
              <span className="sm:hidden">[CONNECT TO POST]</span>
            </button>
          ) : (
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={disabled ? '[CONNECT TO TRANSMIT]' : '[ENTER MESSAGE]'}
              disabled={disabled || isSending}
              className="w-full pl-8 pr-4 py-3 bg-black border-2 border-primary-500 text-primary-400 font-mono text-base md:text-sm focus:outline-none focus:border-primary-400 disabled:border-gray-700 disabled:text-gray-600 disabled:shadow-none placeholder-primary-800 transition-all shadow-neon-input touch-target"
              maxLength={500}
            />
          )}
        </div>
        <button
          type="submit"
          disabled={disabled || isSending || !message.trim()}
          className="bg-primary-900 hover:bg-primary-800 disabled:bg-gray-900 text-primary-400 disabled:text-gray-700 font-mono text-sm px-4 md:px-8 py-3 border-2 border-primary-500 hover:border-primary-400 disabled:border-gray-700 disabled:shadow-none transition-all uppercase tracking-wider font-bold shadow-neon-button touch-target"
        >
          {isSending ? (
            <span className="flex items-center gap-2">
              <span className="terminal-cursor">█</span>
              <span className="hidden sm:inline">SENDING</span>
            </span>
          ) : (
            <>
              <span className="hidden sm:inline">▶ SEND</span>
              <span className="sm:hidden">▶</span>
            </>
          )}
        </button>
      </div>
      <div className="mt-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 font-mono text-xs">
        <span className="text-primary-700 hidden sm:inline">
          [BLOCKCHAIN STORAGE ACTIVE]
        </span>
        <span className={`${message.length > 450 ? 'text-red-500' : 'text-primary-600'}`}>
          {message.length}/500
        </span>
      </div>
    </form>
  );
}
