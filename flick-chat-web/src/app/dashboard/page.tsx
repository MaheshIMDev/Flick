'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/hooks/useSocket';
import useWebRTC from '@/hooks/useWebRTC';
import { useActiveCallStore } from '@/hooks/useActiveCall';
import {
  MessageSquare,
  Search,
  LogOut,
  UserPlus,
  QrCode,
  User,
  MoreVertical,
  PhoneCall,
  X,
  Settings,
} from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import ThemeToggle from '@/components/ui/ThemeToggle';
import VideoCallOverlay from '@/components/call/CallOverLay';
import MessageBubble from '@/components/chat/MessageBubble';
import ChatHeader from '@/components/chat/ChatHeader';
import ChatInput from '@/components/chat/MessageInput';
import FriendsList from '@/components/dashboard/FriendsList';
import api from '@/lib/api';
import { playMessageSound, playSentSound } from '@/lib/sounds';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  encrypted_content: string;
  sent_at: string;
  tempId?: string;
  sender?: any;
  reply_to?: string | null;
  replied_message?: Message | null;
}

interface FriendWithConv {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  is_online: boolean;
  conversation_id: string | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout, loading: authLoading } = useAuth();
  const { socket, isConnected } = useSocket();
  const { activeCall, isCallStale } = useActiveCallStore();

  const [search, setSearch] = useState('');
  const [friends, setFriends] = useState<FriendWithConv[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [selectedFriend, setSelectedFriend] = useState<FriendWithConv | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const processedIds = useRef(new Set<string>());
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onlineStatusRequestedRef = useRef(false);

  const callFriend =
    selectedFriend ||
    (activeCall?.friendId ? friends.find((f) => f.id === activeCall.friendId) : null);

  const webrtc = useWebRTC({
    friendId: callFriend?.id || '',
    conversationId: callFriend?.conversation_id || '',
    friendName: callFriend?.display_name || '',
  });

  useEffect(() => {
    if (webrtc.isIncomingCall && activeCall?.friendId && !selectedFriend) {
      const friend = friends.find((f) => f.id === activeCall.friendId);
      if (friend) {
        setSelectedFriend(friend);
        setShowSidebar(false);
      }
    }
  }, [webrtc.isIncomingCall, activeCall, friends, selectedFriend]);

  useEffect(() => {
    if (messages.length === 0) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Check auth and load data
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      fetchData();
    }
  }, [user, authLoading, router]);

  const fetchData = async () => {
    try {
      const [friendsRes, convsRes] = await Promise.all([
        api.get('/friends'),
        api.get('/conversations'),
      ]);

      const friendsList = friendsRes.data.friends || [];
      const conversations = convsRes.data.conversations || [];

      const friendsWithConvs = friendsList.map((friend: any) => {
        const conv = conversations.find(
          (c: any) =>
            c.type === 'direct' && c.participants.some((p: any) => p.id === friend.id)
        );

        return {
          id: friend.id,
          username: friend.username,
          display_name: friend.display_name,
          avatar_url: friend.avatar_url,
          is_online: false, // Will be updated by socket events
          conversation_id: conv?.id || null,
        };
      });

      setFriends(friendsWithConvs);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Request initial online status when socket connects
  useEffect(() => {
    if (!socket || !isConnected || friends.length === 0 || onlineStatusRequestedRef.current) return;

    const timer = setTimeout(() => {
      console.log('📞 Requesting initial online status...');
      socket.emit('get_online_friends');
      onlineStatusRequestedRef.current = true;
    }, 500);

    return () => clearTimeout(timer);
  }, [socket, isConnected, friends.length]);

  // Listen for initial online status response
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleOnlineFriends = (data: Array<{userId: string; isOnline: boolean; lastSeen?: number}>) => {
      console.log('📊 Received initial online status:', data);
      
      setFriends(prev => 
        prev.map(friend => {
          const status = data.find(s => s.userId === friend.id);
          if (status) {
            console.log(`Friend ${friend.display_name}: ${status.isOnline ? 'ONLINE' : 'OFFLINE'}`);
            return { ...friend, is_online: status.isOnline };
          }
          return friend;
        })
      );
    };

    socket.on('online_friends', handleOnlineFriends);

    return () => {
      socket.off('online_friends', handleOnlineFriends);
    };
  }, [socket, isConnected]);

  // Listen for real-time online/offline events
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleFriendOnline = (data: { userId: string; timestamp?: number }) => {
      console.log('✅ [EVENT] Friend came online:', data.userId);
      setFriends((prev) =>
        prev.map((f) => {
          if (f.id === data.userId) {
            console.log(`Updated ${f.display_name} to ONLINE`);
            return { ...f, is_online: true };
          }
          return f;
        })
      );
    };

    const handleFriendOffline = (data: { userId: string; lastSeen?: number }) => {
      console.log('❌ [EVENT] Friend went offline:', data.userId);
      setFriends((prev) =>
        prev.map((f) => {
          if (f.id === data.userId) {
            console.log(`Updated ${f.display_name} to OFFLINE`);
            return { ...f, is_online: false };
          }
          return f;
        })
      );
    };

    socket.on('friend_online', handleFriendOnline);
    socket.on('friend_offline', handleFriendOffline);

    return () => {
      socket.off('friend_online', handleFriendOnline);
      socket.off('friend_offline', handleFriendOffline);
    };
  }, [socket, isConnected]);

  // Load messages for selected conversation
  useEffect(() => {
    if (!selectedFriend?.conversation_id) return;

    const loadMessages = async () => {
      setMessagesLoading(true);
      processedIds.current.clear();

      try {
        const response = await api.get(
          `/messages/conversation/${selectedFriend.conversation_id}?limit=50`
        );
        const fetchedMessages = response.data.messages.reverse();
        fetchedMessages.forEach((msg: Message) => processedIds.current.add(msg.id));
        setMessages(fetchedMessages);
      } catch (error) {
        console.error('Failed to load messages:', error);
      } finally {
        setMessagesLoading(false);
      }
    };

    loadMessages();
  }, [selectedFriend?.conversation_id]);

  // Socket handlers for messages and typing
  useEffect(() => {
    if (!socket || !isConnected || !selectedFriend?.conversation_id) return;

    const conversationId = selectedFriend.conversation_id;
    socket.emit('join_conversation', { conversationId });

    const handleReceiveMessage = (message: Message) => {
      if (message.sender_id !== user?.id) playMessageSound();
      if (message.conversation_id !== conversationId) return;
      if (processedIds.current.has(message.id)) return;

      if (message.tempId) {
        setMessages((prev) => {
          const hasTempMessage = prev.some((msg) => msg.id === message.tempId);
          if (hasTempMessage) {
            processedIds.current.add(message.id);
            return prev.map((msg) =>
              msg.id === message.tempId ? { ...message, tempId: undefined } : msg
            );
          } else {
            processedIds.current.add(message.id);
            return [...prev, { ...message, tempId: undefined }];
          }
        });
        return;
      }

      setMessages((prev) => [...prev, message]);
      processedIds.current.add(message.id);
    };

    const handleUserTyping = (data: { userId: string; conversationId: string }) => {
      if (data.conversationId === conversationId && data.userId !== user?.id) {
        setIsTyping(true);
      }
    };

    const handleUserStoppedTyping = (data: { userId: string; conversationId: string }) => {
      if (data.conversationId === conversationId && data.userId !== user?.id) {
        setIsTyping(false);
      }
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_stopped_typing', handleUserStoppedTyping);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_stopped_typing', handleUserStoppedTyping);
      socket.emit('leave_conversation', { conversationId });
    };
  }, [socket, isConnected, selectedFriend?.conversation_id, user?.id]);

  const handleTyping = () => {
    if (!socket || !selectedFriend?.conversation_id) return;

    socket.emit('typing_start', { conversationId: selectedFriend.conversation_id });
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing_stop', { conversationId: selectedFriend.conversation_id });
    }, 3000);
  };

  const handleSendMessage = (message: string) => {
    if (!selectedFriend?.conversation_id || !socket) return;

    const encryptedContent = Buffer.from(message).toString('base64');
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const tempMessage: Message = {
      id: tempId,
      conversation_id: selectedFriend.conversation_id,
      sender_id: user!.id,
      encrypted_content: encryptedContent,
      sent_at: new Date().toISOString(),
      tempId,
      reply_to: replyingTo?.id || null,
      replied_message: replyingTo || null,
      sender: {
        id: user!.id,
        username: user!.username,
        display_name: user!.display_name,
        avatar_url: user!.avatar_url,
      },
    };

    setMessages((prev) => [...prev, tempMessage]);
    processedIds.current.add(tempId);
    playSentSound();
    setReplyingTo(null);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socket.emit('typing_stop', { conversationId: selectedFriend.conversation_id });
    socket.emit('send_message', {
      conversationId: selectedFriend.conversation_id,
      encryptedContent,
      messageType: 'text',
      tempId,
      replyTo: replyingTo?.id || null,
    });
  };

  const filteredFriends = friends.filter(
    (f) =>
      f.display_name.toLowerCase().includes(search.toLowerCase()) ||
      f.username.toLowerCase().includes(search.toLowerCase())
  );

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      {/* Active Call Banner */}
      {isCallStale() && activeCall && activeCall.friendId !== selectedFriend?.id && (
        <div className="fixed top-4 right-4 z-[9997] bg-green-500 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 max-w-sm">
          <PhoneCall className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate">Active call</p>
            <p className="text-xs opacity-90 truncate">with {activeCall.friendName}</p>
          </div>
          <button
            onClick={() => {
              const friend = friends.find((f) => f.id === activeCall.friendId);
              if (friend) {
                setSelectedFriend(friend);
                setShowSidebar(false);
              }
            }}
            className="px-3 py-1 bg-white text-green-600 rounded-lg font-semibold text-sm hover:bg-gray-100 transition-colors"
          >
            View
          </button>
        </div>
      )}

      <div className="flex h-screen bg-gray-100 dark:bg-gray-900 overflow-hidden">
        {/* Mobile Overlay */}
        {showSidebar && selectedFriend && (
          <div
            className="fixed inset-0 bg-black/50 z-20 lg:hidden"
            onClick={() => setShowSidebar(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`${
            showSidebar ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 fixed lg:relative z-30 w-full sm:w-80 lg:w-96 bg-white dark:bg-gray-800 flex flex-col transition-transform duration-300 h-full border-r border-gray-200 dark:border-gray-700`}
        >
          {/* Header */}
          <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                <Avatar
                  src={user.avatar_url}
                  name={user.display_name || user.username}
                  size="md"
                  showOnline={true}
                  isOnline={true}
                />
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                    {user.display_name || user.username}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {isConnected ? 'Online' : 'Connecting...'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* <ThemeToggle /> */}
                
                {selectedFriend && (
                  <button
                    onClick={() => setShowSidebar(false)}
                    className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <X size={18} className="text-gray-600 dark:text-gray-400" />
                  </button>
                )}

                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <MoreVertical size={18} className="text-gray-600 dark:text-gray-400" />
                  </button>

                  {showMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowMenu(false)}
                      />
                      <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 py-1 overflow-hidden">
                        <button
                          onClick={() => {
                            router.push('/profile');
                            setShowMenu(false);
                          }}
                          className="w-full px-4 py-2.5 flex items-center space-x-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm transition-colors"
                        >
                          <User size={16} />
                          <span>Profile</span>
                        </button>
                        <button
                          onClick={() => {
                            router.push('/friends');
                            setShowMenu(false);
                          }}
                          className="w-full px-4 py-2.5 flex items-center space-x-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm transition-colors"
                        >
                          <UserPlus size={16} />
                          <span>Add Friend</span>
                        </button>
                        <button
                          onClick={() => {
                            router.push('/friends/qr');
                            setShowMenu(false);
                          }}
                          className="w-full px-4 py-2.5 flex items-center space-x-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm transition-colors"
                        >
                          <QrCode size={16} />
                          <span>QR Code</span>
                        </button>
                        <button
                          onClick={() => {
                            router.push('/settings');
                            setShowMenu(false);
                          }}
                          className="w-full px-4 py-2.5 flex items-center space-x-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm transition-colors"
                        >
                          <Settings size={16} />
                          <span>Settings</span>
                        </button>
                        <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                        <button
                          onClick={logout}
                          className="w-full px-4 py-2.5 flex items-center space-x-3 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 text-sm transition-colors"
                        >
                          <LogOut size={16} />
                          <span>Logout</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Search conversations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Friends List */}
          <FriendsList
            friends={filteredFriends}
            selectedId={selectedFriend?.id}
            onSelect={(friend) => {
              setSelectedFriend(friend);
              setShowSidebar(false);
            }}
            onAddFriend={() => router.push('/friends/qr')}
          />
        </aside>

        {/* Main Chat Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-gray-50 dark:bg-gray-900">
          {!selectedFriend ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6">
              <div className="w-24 h-24 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center mb-6">
                <MessageSquare size={48} className="text-teal-600 dark:text-teal-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Welcome to FlickChat
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">
                Select a conversation to start messaging
              </p>
            </div>
          ) : (
            <>
              <ChatHeader
                friend={selectedFriend}
                isTyping={isTyping}
                onMenuClick={() => setShowSidebar(true)}
                onAudioCall={() => webrtc.startCall('audio')}
                onVideoCall={() => webrtc.startCall('video')}
                canCall={!!selectedFriend.conversation_id}
              />

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4">
                {messagesLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-500" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <MessageSquare size={56} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                      <p className="text-gray-500 dark:text-gray-400 text-lg font-medium mb-2">
                        No messages yet
                      </p>
                      <p className="text-gray-400 dark:text-gray-500 text-sm">
                        Start the conversation with a message
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 max-w-4xl mx-auto">
                    {messages.map((msg) => {
                      const isMe = msg.sender_id === user.id;
                      let content = msg.encrypted_content;
                      try {
                        content = Buffer.from(msg.encrypted_content, 'base64').toString('utf-8');
                      } catch (e) {}

                      return (
                        <MessageBubble
                          key={msg.id}
                          content={content}
                          timestamp={msg.sent_at}
                          isMe={isMe}
                          senderName={selectedFriend.display_name}
                          senderAvatar={selectedFriend.avatar_url}
                          showAvatar={!isMe}
                          repliedMessage={msg.replied_message}
                          onReply={() => setReplyingTo(msg)}
                        />
                      );
                    })}

                    {isTyping && (
                      <div className="flex justify-start">
                        <div className="flex items-start space-x-2">
                          <Avatar
                            src={selectedFriend.avatar_url}
                            name={selectedFriend.display_name}
                            size="sm"
                            className="flex-shrink-0"
                          />
                          <div className="bg-white dark:bg-gray-800 rounded-2xl px-5 py-3 shadow-sm">
                            <div className="flex space-x-1.5">
                              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                              <span
                                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                                style={{ animationDelay: '200ms' }}
                              />
                              <span
                                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                                style={{ animationDelay: '400ms' }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              <ChatInput
                onSend={handleSendMessage}
                onTyping={handleTyping}
                disabled={!isConnected}
                replyingTo={replyingTo}
                onCancelReply={() => setReplyingTo(null)}
              />
            </>
          )}
        </main>
      </div>

      {/* Video Call Overlay */}
      {callFriend && callFriend.conversation_id && (
        <VideoCallOverlay
          localStream={webrtc.localStream}
          remoteStream={webrtc.remoteStream}
          isCallActive={webrtc.isCallActive}
          isIncomingCall={webrtc.isIncomingCall}
          isOutgoingCall={webrtc.isOutgoingCall}
          callType={webrtc.callType}
          isMuted={webrtc.isMuted}
          isVideoOff={webrtc.isVideoOff}
          isScreenSharing={webrtc.isScreenSharing}
          remoteScreenSharing={webrtc.remoteScreenSharing}
          friendName={callFriend.display_name}
          onAnswer={webrtc.answerCall}
          onReject={webrtc.rejectCall}
          onEnd={webrtc.endCall}
          onToggleMute={webrtc.toggleMute}
          onToggleVideo={webrtc.toggleVideo}
          onStartScreenShare={webrtc.startScreenShare}
          onStopScreenShare={webrtc.stopScreenShare}
          callStartTime={webrtc.callStartTime}
          connectionState={webrtc.connectionState}
        />
      )}
    </>
  );
}
