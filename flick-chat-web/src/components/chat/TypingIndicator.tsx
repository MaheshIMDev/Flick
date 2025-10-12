interface TypingIndicatorProps {
    username: string;
  }
  
  export default function TypingIndicator({ username }: TypingIndicatorProps) {
    return (
      <div className="flex items-center gap-2 px-4 py-2">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {username} is typing...
        </span>
      </div>
    );
  }
  