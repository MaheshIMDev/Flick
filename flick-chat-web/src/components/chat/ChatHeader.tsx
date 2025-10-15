import Avatar from '../ui/Avatar';
import { Phone, Video, Menu } from 'lucide-react';

interface Friend {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  is_online: boolean;
  conversation_id: string | null;
}

interface ChatHeaderProps {
  friend: Friend;
  isTyping: boolean;
  onMenuClick: () => void;
  onAudioCall: () => void;
  onVideoCall: () => void;
  canCall: boolean;
}

export default function ChatHeader({
  friend,
  isTyping,
  onMenuClick,
  onAudioCall,
  onVideoCall,
  canCall,
}: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      {/* Left: Menu + Avatar + Info */}
      <div className="flex items-center space-x-3 min-w-0 flex-1">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <Menu size={20} className="text-gray-600 dark:text-gray-400" />
        </button>

        <Avatar
          src={friend.avatar_url}
          name={friend.display_name}
          size="sm"
          showOnline={true}
          isOnline={friend.is_online}
        />

        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {friend.display_name}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {isTyping ? (
              <span className="text-teal-600 dark:text-teal-400 font-medium">typing...</span>
            ) : friend.is_online ? (
              <span className="text-green-600 dark:text-green-400">🟢 Online</span>
            ) : (
              <span>Offline</span>
            )}
          </p>
        </div>
      </div>

      {/* Right: Call buttons */}
      {canCall && (
        <div className="flex items-center space-x-2">
          <button
            onClick={onAudioCall}
            disabled={!friend.is_online}
            className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors ${
              !friend.is_online ? 'opacity-40 cursor-not-allowed' : ''
            }`}
            title={friend.is_online ? 'Audio call' : 'User is offline'}
          >
            <Phone size={18} className="text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={onVideoCall}
            disabled={!friend.is_online}
            className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors ${
              !friend.is_online ? 'opacity-40 cursor-not-allowed' : ''
            }`}
            title={friend.is_online ? 'Video call' : 'User is offline'}
          >
            <Video size={18} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      )}
    </div>
  );
}
