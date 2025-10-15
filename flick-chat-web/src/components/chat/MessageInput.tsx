'use client';

import { useState, FormEvent, useRef, KeyboardEvent } from 'react';
import { Send, Smile, Paperclip, X } from 'lucide-react';

interface Message {
  id: string;
  encrypted_content: string;
  sender_id: string;
}

interface ChatInputProps {
  onSend: (message: string) => void;
  onTyping: () => void;
  disabled?: boolean;
  replyingTo?: Message | null;
  onCancelReply?: () => void;
}

export default function ChatInput({ 
  onSend, 
  onTyping, 
  disabled = false,
  replyingTo,
  onCancelReply,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [showEmojiTooltip, setShowEmojiTooltip] = useState(false);
  const [showAttachTooltip, setShowAttachTooltip] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim() || disabled) return;
    onSend(message.trim());
    setMessage('');
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    onTyping();
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  let repliedContent = '';
  if (replyingTo) {
    try {
      repliedContent = Buffer.from(replyingTo.encrypted_content, 'base64').toString('utf-8');
    } catch (e) {
      repliedContent = replyingTo.encrypted_content;
    }
  }

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
      {replyingTo && (
        <div className="px-4 py-3 bg-teal-50 dark:bg-teal-900/20 flex items-center justify-between border-b border-teal-200 dark:border-teal-800">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className="w-1 h-12 bg-teal-500 rounded flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-teal-600 dark:text-teal-400 mb-0.5">
                Replying to message
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                {repliedContent}
              </p>
            </div>
          </div>
          <button
            onClick={onCancelReply}
            className="p-1.5 hover:bg-teal-100 dark:hover:bg-teal-800 rounded-full transition-colors flex-shrink-0"
            aria-label="Cancel reply"
          >
            <X size={18} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-3 sm:p-4">
        <div className="flex items-end space-x-2 max-w-4xl mx-auto">
          <div className="relative">
            <button
              type="button"
              onMouseEnter={() => setShowEmojiTooltip(true)}
              onMouseLeave={() => setShowEmojiTooltip(false)}
              className="p-2.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
              disabled={disabled}
            >
              <Smile size={20} />
            </button>
            {showEmojiTooltip && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg whitespace-nowrap shadow-lg">
                Coming soon!
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
              </div>
            )}
          </div>

          <div className="relative">
            <button
              type="button"
              onMouseEnter={() => setShowAttachTooltip(true)}
              onMouseLeave={() => setShowAttachTooltip(false)}
              className="p-2.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
              disabled={disabled}
            >
              <Paperclip size={20} />
            </button>
            {showAttachTooltip && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg whitespace-nowrap shadow-lg">
                Coming soon!
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
              </div>
            )}
          </div>

          <div className="flex-1 relative min-w-0">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={disabled ? 'Connecting...' : 'Type a message...'}
              disabled={disabled}
              rows={1}
              className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-full text-sm text-gray-900 dark:text-white placeholder-gray-500 disabled:opacity-50 resize-none border-0 focus:outline-none focus:ring-2 focus:ring-teal-500 max-h-[120px] overflow-y-auto"
              style={{ minHeight: '44px' }}
              autoComplete="off"
            />
          </div>

          <button
            type="submit"
            disabled={disabled || !message.trim()}
            className="p-2.5 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-full disabled:cursor-not-allowed flex-shrink-0 transition-all shadow-md hover:shadow-lg disabled:shadow-none"
            aria-label="Send message"
          >
            <Send size={18} />
          </button>
        </div>
      </form>
    </div>
  );
}
