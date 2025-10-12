interface BadgeProps {
    count: number;
    max?: number;
    className?: string;
  }
  
  export default function Badge({ count, max = 99, className = '' }: BadgeProps) {
    if (count <= 0) return null;
  
    const displayCount = count > max ? `${max}+` : count.toString();
  
    return (
      <div
        className={`min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-teal-500 text-white text-xs font-semibold ${className}`}
      >
        {displayCount}
      </div>
    );
  }
  