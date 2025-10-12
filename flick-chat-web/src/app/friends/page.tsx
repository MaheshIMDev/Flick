'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, UserPlus, Check, X, Clock, ArrowLeft, QrCode } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import toast from 'react-hot-toast';

interface SearchResult {
  id: string;
  username: string;
  display_name: string;
  email: string;
  avatar_url?: string;
}

interface FriendRequest {
  id: string;
  created_at: string;
  sender: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
}

export default function FriendsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPendingRequests();
  }, []);

  const loadPendingRequests = async () => {
    try {
      const { data } = await api.get('/friends/requests');
      setPendingRequests(data.requests || []);
    } catch (error) {
      // Error handled error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const { data } = await api.get(`/friends/search?query=${encodeURIComponent(searchQuery)}`);
      setSearchResults(data.users || []);
      if (data.users.length === 0) {
        toast('No users found', { icon: '🔍' });
      }
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (userId: string) => {
    try {
      await api.post('/friends/request', { recipient_id: userId });
      toast.success('Friend request sent!');
      setSearchResults(prev => prev.filter(u => u.id !== userId));
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to send request');
    }
  };

  const handleAccept = async (requestId: string) => {
    try {
      await api.post(`/friends/accept/${requestId}`);
      toast.success('Friend request accepted!');
      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
      router.push('/dashboard');
    } catch (error) {
      toast.error('Failed to accept request');
    }
  };

  const handleDecline = async (requestId: string) => {
    try {
      await api.delete(`/friends/decline/${requestId}`);
      toast.success('Request declined');
      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (error) {
      toast.error('Failed to decline request');
    }
  };

  return (
    <div className="min-h-screen bg-[#111b21] p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            leftIcon={<ArrowLeft size={20} />}
            onClick={() => router.back()}
            className="text-[#8696a0]"
          >
            Back
          </Button>
          <h1 className="text-2xl font-semibold text-[#e9edef]">
            Add Friends
          </h1>
          <Button
            variant="ghost"
            leftIcon={<QrCode size={20} />}
            onClick={() => router.push('/friends/qr')}
            className="text-[#8696a0]"
          >
            QR
          </Button>
        </div>

        {/* Search */}
        <div className="bg-[#202c33] rounded-2xl p-6 mb-4">
          <h2 className="text-lg font-semibold text-[#e9edef] mb-4">
            Search by Email or Username
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter email or username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 px-4 py-3 rounded-xl bg-[#2a3942] border-0 text-[#e9edef] focus:outline-none focus:ring-2 focus:ring-[#00a884] placeholder-[#8696a0]"
            />
            <Button
              variant="primary"
              leftIcon={<Search size={18} />}
              onClick={handleSearch}
              loading={searching}
            >
              Search
            </Button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 space-y-2"
            >
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 bg-[#2a3942] rounded-xl"
                >
                  <div className="flex items-center space-x-3">
                    <Avatar src={user.avatar_url} name={user.display_name} size="md" />
                    <div>
                      <p className="font-semibold text-[#e9edef]">
                        {user.display_name}
                      </p>
                      <p className="text-sm text-[#8696a0]">@{user.username}</p>
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<UserPlus size={16} />}
                    onClick={() => handleSendRequest(user.id)}
                  >
                    Add
                  </Button>
                </div>
              ))}
            </motion.div>
          )}
        </div>

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <div className="bg-[#202c33] rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-[#e9edef] mb-4 flex items-center">
              <Clock size={20} className="mr-2 text-[#00a884]" />
              Pending Requests ({pendingRequests.length})
            </h2>
            <div className="space-y-2">
              {pendingRequests.map((request) => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between p-4 bg-[#2a3942] rounded-xl"
                >
                  <div className="flex items-center space-x-3">
                    <Avatar
                      src={request.sender.avatar_url}
                      name={request.sender.display_name}
                      size="md"
                    />
                    <div>
                      <p className="font-semibold text-[#e9edef]">
                        {request.sender.display_name}
                      </p>
                      <p className="text-sm text-[#8696a0]">@{request.sender.username}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<Check size={16} />}
                      onClick={() => handleAccept(request.id)}
                    >
                      Accept
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<X size={16} />}
                      onClick={() => handleDecline(request.id)}
                      className="border-[#2a3942] text-[#e9edef]"
                    >
                      Decline
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
