import Avatar from '../ui/Avatar';
import { Reply } from 'lucide-react';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  encrypted_content: string;
  sent_at: string;
}

interface MessageBubbleProps {
  content: string;
  timestamp: string;
  isMe: boolean;
  senderName?: string;
  senderAvatar?: string | null;
  showAvatar?: boolean;
  repliedMessage?: Message | null;
  onReply?: () => void;
}

export default function MessageBubble({
  content,
  timestamp,
  isMe,
  senderName,
  senderAvatar,
  showAvatar = true,
  repliedMessage,
  onReply,
}: MessageBubbleProps) {
  let repliedContent = '';
  if (repliedMessage) {
    try {
      repliedContent = Buffer.from(repliedMessage.encrypted_content, 'base64').toString('utf-8');
    } catch (e) {
      repliedContent = repliedMessage.encrypted_content;
    }
  }

  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
      <div className={`max-w-[85%] sm:max-w-[75%] ${isMe ? '' : 'flex items-start space-x-2'}`}>
        {!isMe && showAvatar && (
          <Avatar 
            src={senderAvatar} 
            name={senderName || 'User'} 
            size="sm" 
            className="flex-shrink-0 mt-1" 
          />
        )}
        
        <div className="flex-1 min-w-0 relative">
          {onReply && (
            <button
              onClick={onReply}
              className={`absolute top-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-gray-200 dark:bg-gray-700 rounded-full shadow-md hover:bg-gray-300 dark:hover:bg-gray-600 ${
                isMe ? 'left-0 -translate-x-full -ml-2' : 'right-0 translate-x-full -mr-2'
              }`}
              title="Reply"
            >
              <Reply size={14} className="text-gray-700 dark:text-gray-300" />
            </button>
          )}

          <div
            className={`rounded-2xl px-3 sm:px-4 py-2 shadow-sm ${
              isMe
                ? 'bg-teal-500 text-white rounded-br-none'
                : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-none'
            }`}
          >
            {repliedMessage && (
              <div className={`mb-2 pl-2 border-l-3 rounded py-1 ${
                isMe 
                  ? 'border-white/50 bg-black/10' 
                  : 'border-teal-500 bg-gray-50 dark:bg-gray-700/50'
              }`}>
                <p className={`text-xs font-semibold mb-0.5 ${
                  isMe ? 'text-white' : 'text-teal-600 dark:text-teal-400'
                }`}>
                  Replying to
                </p>
                <p className={`text-xs line-clamp-2 ${
                  isMe ? 'text-white/80' : 'text-gray-600 dark:text-gray-400'
                }`}>
                  {repliedContent}
                </p>
              </div>
            )}

            <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
          </div>

          <p className={`text-xs mt-1 ${isMe ? 'text-right text-gray-500 dark:text-gray-400' : 'text-gray-400'}`}>
            {new Date(timestamp).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
