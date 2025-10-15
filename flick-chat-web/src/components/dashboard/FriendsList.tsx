import { MessageSquare } from 'lucide-react';
import Avatar from '../ui/Avatar';

interface Friend {
  id: string;
  username: string; // ✅ ADD THIS
  display_name: string;
  avatar_url?: string;
  is_online: boolean;
  conversation_id: string | null;
}

interface FriendsListProps {
  friends: Friend[];
  selectedId?: string;
  onSelect: (friend: Friend) => void;
  onAddFriend: () => void;
}

export default function FriendsList({
  friends,
  selectedId,
  onSelect,
  onAddFriend,
}: FriendsListProps) {
  if (friends.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center py-8">
        <MessageSquare size={48} className="text-gray-300 dark:text-gray-600 mb-4" />
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
          No friends yet
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Add friends to start chatting
        </p>
        <button
          onClick={onAddFriend}
          className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Add Friend
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto">
      {friends.map((friend) => (
        <button
          key={friend.id}
          onClick={() => onSelect(friend)}
          disabled={!friend.conversation_id}
          className={`w-full flex items-center space-x-3 px-3 sm:px-4 py-3 transition-colors border-b border-gray-100 dark:border-gray-700/50 ${
            selectedId === friend.id
              ? 'bg-teal-50 dark:bg-teal-900/20 border-l-4 border-l-teal-500'
              : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <Avatar
            src={friend.avatar_url}
            name={friend.display_name}
            size="sm"
            showOnline={true}
            isOnline={friend.is_online}
          />
          <div className="flex-1 min-w-0 text-left">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {friend.display_name}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {friend.is_online ? '🟢 Active' : 'Offline'}
            </p>
          </div>
          {!friend.conversation_id && (
            <span className="text-xs text-amber-500 flex-shrink-0">No chat</span>
          )}
        </button>
      ))}
    </div>
  );
}
