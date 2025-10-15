import { cn } from '@/lib/utils';

interface AvatarProps {
  src?: string | null;
  name: string; // Required
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showOnline?: boolean;
  isOnline?: boolean;
  className?: string;
  alt?: string;
  online?: boolean; // Backward compatibility
}

export default function Avatar({
  src,
  name,
  size = 'md',
  showOnline = false,
  isOnline = false,
  online = false,
  className,
  alt,
}: AvatarProps) {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-20 h-20 text-2xl',
  };

  const onlineStatusSizes = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
    xl: 'w-4 h-4',
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const displayOnline = showOnline || online;
  const isUserOnline = isOnline || online;

  return (
    <div className={cn('relative inline-block flex-shrink-0', className)}>
      {src ? (
        <img
          src={src}
          alt={alt || name}
          className={cn('rounded-full object-cover', sizes[size])}
        />
      ) : (
        <div
          className={cn(
            'rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center font-semibold text-white',
            sizes[size]
          )}
        >
          {getInitials(name)}
        </div>
      )}
      {displayOnline && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-2 border-white dark:border-gray-800',
            isUserOnline ? 'bg-green-500' : 'bg-gray-400',
            onlineStatusSizes[size]
          )}
        />
      )}
    </div>
  );
}
