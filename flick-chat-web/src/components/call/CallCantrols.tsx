'use client';

import { Phone, Video } from 'lucide-react';

interface CallControlsProps {
  onAudioCall: () => void;
  onVideoCall: () => void;
  disabled?: boolean;
}

export default function CallControls({ onAudioCall, onVideoCall, disabled }: CallControlsProps) {
  return (
    <div className="flex items-center space-x-1">
      <button 
        onClick={onAudioCall}
        disabled={disabled}
        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Audio call"
      >
        <Phone size={20} className="text-gray-700 dark:text-gray-300" />
      </button>
      <button 
        onClick={onVideoCall}
        disabled={disabled}
        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Video call"
      >
        <Video size={20} className="text-gray-700 dark:text-gray-300" />
      </button>
    </div>
  );
}
