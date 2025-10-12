'use client';

import Avatar from '@/components/ui/Avatar';  // Assume you have this

interface WelcomeCardProps {
  user: any;  // From useAuth; add type later
}

export default function WelcomeCard({ user }: WelcomeCardProps) {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-8 shadow-lg text-center">
      <div className="flex flex-col items-center space-y-4">
        <Avatar 
          src={user.avatar_url} 
          alt={user.display_name} 
          size="xl" 
          online={user.is_online} 
        />
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {user.display_name}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">@{user.username}</p>
          <p className="text-sm text-gray-500 dark:text-gray-500">{user.email}</p>
          <p className="text-sm text-green-600 dark:text-green-400">
            {user.is_online ? 'Online' : `Last seen ${new Date(user.last_seen_at).toLocaleString()}`}
          </p>
        </div>
      </div>
    </div>
  );
}