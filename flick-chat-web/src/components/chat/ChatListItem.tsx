import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import { formatTimestamp, truncate } from '@/lib/utils';

interface ChatListItemProps {
  id: string;
  name: string;
  avatarUrl?: string | null;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  isOnline?: boolean;
  isGroup?: boolean;
  onClick: () => void;
}

export default function ChatListItem({
  name,
  avatarUrl,
  lastMessage,
  timestamp,
  unreadCount,
  isOnline = false,
  isGroup = false,
  onClick,
}: ChatListItemProps) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors border-b border-gray-200 dark:border-gray-700"
    >
      <Avatar
        src={avatarUrl}
        name={name}
        size="md"
        showOnline={!isGroup}
        isOnline={isOnline}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
            {name}
          </h3>
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
            {formatTimestamp(timestamp)}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <p
            className={`text-sm truncate ${
              unreadCount > 0
                ? 'text-gray-900 dark:text-gray-200 font-medium'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {truncate(lastMessage, 50)}
          </p>
          {unreadCount > 0 && <Badge count={unreadCount} className="ml-2" />}
        </div>
      </div>
    </div>
  );
}
