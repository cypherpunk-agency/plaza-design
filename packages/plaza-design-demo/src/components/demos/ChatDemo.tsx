import { useState, useRef, useEffect } from 'react';
import { formatClock } from '../../plaza';
import './ChatDemo.css';

interface Message {
  id: number;
  author: string;
  content: string;
  timestamp: string;
  isSystem?: boolean;
}

interface User {
  name: string;
  messageCount: number;
  status: 'online' | 'idle' | 'offline';
}

const initialMessages: Message[] = [
  { id: 1, author: 'SYSTEM', content: 'Channel #general initialized', timestamp: '14:20:00', isSystem: true },
  { id: 2, author: '0xA3F2...8C91', content: 'anyone working on the new validator code?', timestamp: '14:22:15' },
  { id: 3, author: '0xB7E1...4D22', content: 'yeah, im looking at the staking module rn', timestamp: '14:23:42' },
  { id: 4, author: '0xA3F2...8C91', content: 'cool, let me know if you need help with the reward distribution', timestamp: '14:24:18' },
  { id: 5, author: '0xC9D4...7F33', content: 'just pushed a fix for the slashing bug - check PR #847', timestamp: '14:26:05' },
  { id: 6, author: 'SYSTEM', content: '0xD2E5...1A44 joined the channel', timestamp: '14:27:30', isSystem: true },
  { id: 7, author: '0xD2E5...1A44', content: 'hey all, whats the status on testnet?', timestamp: '14:28:12' },
  { id: 8, author: '0xB7E1...4D22', content: 'testnet is live, syncing at block 847,293', timestamp: '14:29:45' },
];

const users: User[] = [
  { name: '0xA3F2...8C91', messageCount: 23, status: 'online' },
  { name: '0xB7E1...4D22', messageCount: 47, status: 'online' },
  { name: '0xC9D4...7F33', messageCount: 12, status: 'idle' },
  { name: '0xD2E5...1A44', messageCount: 3, status: 'online' },
  { name: '0xE6F7...2B55', messageCount: 0, status: 'offline' },
];

export function ChatDemo() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [clock, setClock] = useState(formatClock('time'));
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setClock(formatClock('time'));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const newMessage: Message = {
      id: messages.length + 1,
      author: '0xYOU...R_ID',
      content: inputValue,
      timestamp: formatClock('time'),
    };

    setMessages([...messages, newMessage]);
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-demo">
      <header className="chat-demo__header">
        <h1 className="text-2xl font-semibold text-primary-400 uppercase tracking-widest">
          Chat Interface
        </h1>
        <p className="text-gray-500 mt-2">
          Terminal-style messaging with user list and real-time updates
        </p>
      </header>

      <div className="chat-layout">
        {/* Main Chat Window */}
        <div className="chat-main">
          <div className="plaza-window">
            <div className="plaza-corner-bracket plaza-corner-bracket--top-left"></div>
            <div className="plaza-corner-bracket plaza-corner-bracket--top-right"></div>
            <div className="plaza-corner-bracket plaza-corner-bracket--bottom-left"></div>
            <div className="plaza-corner-bracket plaza-corner-bracket--bottom-right"></div>

            <div className="plaza-window-header">
              <span className="text-primary-500">#GENERAL</span>
              <span className="text-gray-600 ml-2">// PUBLIC CHANNEL</span>
              <span className="text-accent-400 ml-auto">{messages.length} MSGS</span>
            </div>

            <div className="chat-messages">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`chat-message ${msg.isSystem ? 'chat-message--system' : ''}`}
                >
                  <span className="chat-message__time">{msg.timestamp}</span>
                  <span className={`chat-message__author ${msg.isSystem ? 'text-gray-600' : 'text-accent-400'}`}>
                    {msg.author}
                  </span>
                  <span className="chat-message__content">{msg.content}</span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="plaza-window-footer">
              <span className="footer-timestamp">{clock} UTC</span>
              <span className="footer-terminal">TERMINAL</span>
              <span className="footer-prompt">&gt;</span>
              <input
                type="text"
                className="chat-input"
                placeholder="Type message..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button className="footer-send-btn" onClick={handleSend}>[SEND]</button>
            </div>
          </div>
        </div>

        {/* User List Sidebar */}
        <div className="chat-sidebar">
          <div className="plaza-side-panel plaza-side-panel--inline">
            <div className="plaza-side-panel__header">USERS ({users.length})</div>
            <div className="plaza-side-panel__divider"></div>

            <div className="user-list">
              {users.map((user) => (
                <div key={user.name} className="user-item">
                  <span className={`user-item__status user-item__status--${user.status}`}></span>
                  <span className="user-item__name">{user.name}</span>
                  <span className="user-item__count">{user.messageCount}</span>
                </div>
              ))}
            </div>

            <div className="plaza-side-panel__divider mt-4"></div>
            <div className="plaza-side-panel__header">CHANNEL INFO</div>

            <div className="channel-info">
              <div className="channel-info__item">
                <span className="channel-info__label">MODE</span>
                <span className="channel-info__value">OPEN</span>
              </div>
              <div className="channel-info__item">
                <span className="channel-info__label">CREATED</span>
                <span className="channel-info__value">2024-01-15</span>
              </div>
              <div className="channel-info__item">
                <span className="channel-info__label">OWNER</span>
                <span className="channel-info__value text-accent-400">0xA3F2...8C91</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
