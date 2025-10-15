import Avatar from '../ui/Avatar';

interface FriendListItemProps {
  friend: {
    id: string;
    display_name: string;
    avatar_url?: string;
    is_online: boolean;
    conversation_id: string | null;
  };
  isSelected: boolean;
  onClick: () => void;
}

export default function FriendListItem({ friend, isSelected, onClick }: FriendListItemProps) {
  return (
    <button
      onClick={onClick}
      disabled={!friend.conversation_id}
      className={`w-full flex items-center space-x-3 px-3 sm:px-4 py-3 transition-colors border-b border-gray-100 dark:border-gray-700/50 ${
        isSelected
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
  );
}
