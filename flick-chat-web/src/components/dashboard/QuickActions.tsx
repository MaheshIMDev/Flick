'use client';

import { UserPlus, QrCode, Phone, Video } from 'lucide-react';  // Add icons for future calls
import Button from '@/components/ui/Button';  // Your Button

interface QuickActionsProps {
  onAddFriend: () => void;
  onScanQR: () => void;
  // Add more: onStartCall, etc.
}

export default function QuickActions({ onAddFriend, onScanQR }: QuickActionsProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Quick Actions</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Button 
          variant="primary" 
          icon={<UserPlus size={20} />} 
          className="w-full" 
          onClick={onAddFriend}
        >
          Add Friend
        </Button>
        <Button 
          variant="secondary" 
          icon={<QrCode size={20} />} 
          className="w-full" 
          onClick={onScanQR}
        >
          Scan QR
        </Button>
        <Button 
          variant="outline" 
          icon={<Phone size={20} />} 
          className="w-full" 
          disabled  // Placeholder for Phase 4
        >
          Start Call
        </Button>
        <Button 
          variant="outline" 
          icon={<Video size={20} />} 
          className="w-full" 
          disabled
        >
          Video Chat
        </Button>
      </div>
    </div>
  );
}