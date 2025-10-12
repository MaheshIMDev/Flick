import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  gradient?: boolean;
}

export default function Card({ className, hover, gradient, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl p-6 backdrop-blur-lg transition-all duration-300',
        gradient 
          ? 'bg-gradient-to-br from-white/80 to-white/40 dark:from-gray-800/80 dark:to-gray-900/40'
          : 'bg-white/70 dark:bg-gray-800/70',
        'border border-gray-200/50 dark:border-gray-700/50',
        'shadow-xl shadow-gray-200/50 dark:shadow-black/50',
        hover && 'hover:scale-[1.02] hover:shadow-2xl',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
