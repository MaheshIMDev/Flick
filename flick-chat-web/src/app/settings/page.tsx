'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { ArrowLeft, Bell, Shield, Volume2, Eye, Trash2 } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  
  const [notifications, setNotifications] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-teal-600 dark:bg-teal-700 px-4 py-4 flex items-center space-x-3">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-white/20 rounded-full transition-colors"
        >
          <ArrowLeft size={20} className="text-white" />
        </button>
        <h1 className="text-xl font-bold text-white">Settings</h1>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white">Appearance</h2>
          </div>
          <div className="p-4">
            <label className="flex items-center justify-between">
              <span className="text-gray-700 dark:text-gray-300">Theme</span>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as 'light' | 'dark')}
                className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white border-0 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center space-x-2">
            <Bell size={18} className="text-gray-600 dark:text-gray-400" />
            <h2 className="font-semibold text-gray-900 dark:text-white">Notifications</h2>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            <ToggleItem
              label="Push notifications"
              description="Receive notifications for new messages"
              checked={notifications}
              onChange={setNotifications}
            />
            <ToggleItem
              label="Sound effects"
              description="Play sounds for messages and calls"
              checked={soundEffects}
              onChange={setSoundEffects}
              icon={<Volume2 size={18} />}
            />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center space-x-2">
            <Shield size={18} className="text-gray-600 dark:text-gray-400" />
            <h2 className="font-semibold text-gray-900 dark:text-white">Privacy</h2>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            <ToggleItem
              label="Read receipts"
              description="Let others know when you've read their messages"
              checked={readReceipts}
              onChange={setReadReceipts}
              icon={<Eye size={18} />}
            />
            <ToggleItem
              label="Show online status"
              description="Let friends see when you're online"
              checked={showOnlineStatus}
              onChange={setShowOnlineStatus}
            />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden border-2 border-red-200 dark:border-red-900">
          <div className="px-4 py-3 border-b border-red-200 dark:border-red-900 flex items-center space-x-2">
            <Trash2 size={18} className="text-red-600 dark:text-red-400" />
            <h2 className="font-semibold text-red-600 dark:text-red-400">Danger Zone</h2>
          </div>
          <div className="p-4">
            <button className="w-full px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors font-medium">
              Clear all messages
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleItem({
  label,
  description,
  checked,
  onChange,
  icon,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon?: React.ReactNode;
}) {
  return (
    <div className="px-4 py-4 flex items-center justify-between">
      <div className="flex-1">
        <div className="flex items-center space-x-2 mb-1">
          {icon && <span className="text-gray-500 dark:text-gray-400">{icon}</span>}
          <p className="font-medium text-gray-900 dark:text-white">{label}</p>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-teal-500' : 'bg-gray-300 dark:bg-gray-600'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
