'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import { Camera, ArrowLeft, User, Mail, AtSign, Check } from 'lucide-react';
import api from '@/lib/api';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [saving, setSaving] = useState(false);

  if (!user) {
    router.push('/login');
    return null;
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/users/profile', { display_name: displayName });
      setIsEditing(false);
    } catch (error) {
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/dashboard')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <ArrowLeft size={20} className="text-gray-700 dark:text-gray-300" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Profile</h1>
            <div className="w-10" />
          </div>
        </div>
      </div>

      {/* Profile Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          
          {/* Avatar Section */}
          <div className="bg-gradient-to-br from-blue-600 to-purple-600 h-32 relative">
            <div className="absolute -bottom-16 left-1/2 -translate-x-1/2">
              <div className="relative">
                <Avatar
                  src={user.avatar_url}
                  name={user.display_name || user.username}
                  size="xl"
                  className="ring-4 ring-white dark:ring-gray-800"
                />
                <button className="absolute bottom-0 right-0 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg">
                  <Camera size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Info Section */}
          <div className="pt-20 px-6 pb-6 space-y-6">
            
            {/* Display Name */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <User size={16} className="mr-2" />
                Display Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                <p className="text-lg text-gray-900 dark:text-white">{user.display_name || 'Not set'}</p>
              )}
            </div>

            {/* Username */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <AtSign size={16} className="mr-2" />
                Username
              </label>
              <p className="text-lg text-gray-900 dark:text-white">@{user.username}</p>
            </div>

            {/* Email */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Mail size={16} className="mr-2" />
                Email
              </label>
              <p className="text-lg text-gray-900 dark:text-white">{user.email}</p>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 flex gap-3">
              {isEditing ? (
                <>
                  <Button
                    variant="primary"
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      setDisplayName(user.display_name || '');
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  variant="primary"
                  onClick={() => setIsEditing(true)}
                  className="w-full"
                >
                  Edit Profile
                </Button>
              )}
            </div>

            {/* Logout */}
            <Button
              variant="outline"
              onClick={logout}
              className="w-full text-red-600 border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              Logout
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
