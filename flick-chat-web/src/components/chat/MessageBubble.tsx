import Avatar from '../ui/Avatar';
import { formatMessageTime } from '@/lib/utils';

interface MessageBubbleProps {
  content: string;
  timestamp: string;
  isMe: boolean;
  senderName?: string;
  senderAvatar?: string | null;
  isRead?: boolean;
  showAvatar?: boolean;
}

export default function MessageBubble({
  content,
  timestamp,
  isMe,
  senderName,
  senderAvatar,
  isRead = false,
  showAvatar = true,
}: MessageBubbleProps) {
  return (
    <div
      className={`flex gap-2 px-4 mb-3 ${isMe ? 'justify-end' : 'justify-start'}`}
    >
      {!isMe && showAvatar && (
        <Avatar src={senderAvatar} name={senderName || 'User'} size="sm" />
      )}

      <div className={`max-w-[70%] ${!isMe && !showAvatar ? 'ml-10' : ''}`}>
        {!isMe && senderName && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 ml-3">
            {senderName}
          </p>
        )}
        
        <div
          className={`rounded-2xl px-4 py-2 shadow-sm ${
            isMe
              ? 'bg-teal-500 text-white rounded-tr-sm'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-tl-sm'
          }`}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {content}
          </p>
          
          <div
            className={`flex items-center justify-end gap-1 mt-1 text-xs ${
              isMe ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <span>{formatMessageTime(timestamp)}</span>
            {isMe && (
              <span className="ml-1">
                {isRead ? '✓✓' : '✓'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
