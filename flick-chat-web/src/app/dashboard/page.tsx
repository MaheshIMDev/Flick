'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/hooks/useSocket';
import useWebRTC from '@/hooks/useWebRTC';
import { useActiveCallStore } from '@/hooks/useActiveCall';
import { MessageSquare, Search, Settings, LogOut, UserPlus, QrCode, User, MoreVertical, Send, Smile, Paperclip, Phone, Video, PhoneCall } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import VideoCallOverlay from '@/components/call/CallOverLay';
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
  const [selectedFriend, setSelectedFriend] = useState<FriendWithConv | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const processedIds = useRef(new Set<string>());
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ✅ Always use selected friend OR active call friend for WebRTC
  const callFriend = selectedFriend || (activeCall?.friendId ? friends.find(f => f.id === activeCall.friendId) : null);

  const webrtc = useWebRTC({
    friendId: callFriend?.id || '',
    conversationId: callFriend?.conversation_id || '',
    friendName: callFriend?.display_name || '',
  });

  // ✅ Auto-select friend when incoming call arrives
  useEffect(() => {
    if (webrtc.isIncomingCall && activeCall?.friendId && !selectedFriend) {
      const friend = friends.find(f => f.id === activeCall.friendId);
      if (friend) {
        setSelectedFriend(friend);
      }
    }
  }, [webrtc.isIncomingCall, activeCall, friends, selectedFriend]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
        api.get('/conversations')
      ]);

      const friendsList = friendsRes.data.friends || [];
      const conversations = convsRes.data.conversations || [];

      const friendsWithConvs = friendsList.map((friend: any) => {
        const conv = conversations.find((c: any) => 
          c.type === 'direct' && c.participants.some((p: any) => p.id === friend.id)
        );

        return {
          id: friend.id,
          username: friend.username,
          display_name: friend.display_name,
          avatar_url: friend.avatar_url,
          is_online: friend.is_online,
          conversation_id: conv?.id || null
        };
      });

      setFriends(friendsWithConvs);
    } catch (error) {
       error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedFriend?.conversation_id) return;

    const loadMessages = async () => {
      setMessagesLoading(true);
      processedIds.current.clear();
      
      try {
        const response = await api.get(`/messages/conversation/${selectedFriend.conversation_id}?limit=50`);
        const fetchedMessages = response.data.messages.reverse();
        fetchedMessages.forEach((msg: Message) => processedIds.current.add(msg.id));
        setMessages(fetchedMessages);
      } catch (error) {
         error);
      } finally {
        setMessagesLoading(false);
      }
    };

    loadMessages();
  }, [selectedFriend?.conversation_id]);

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
          const hasTempMessage = prev.some(msg => msg.id === message.tempId);
          if (hasTempMessage) {
            processedIds.current.add(message.id);
            return prev.map((msg) => msg.id === message.tempId ? { ...message, tempId: undefined } : msg);
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
      if (data.conversationId === conversationId && data.userId !== user?.id) setIsTyping(true);
    };

    const handleUserStoppedTyping = (data: { userId: string; conversationId: string }) => {
      if (data.conversationId === conversationId && data.userId !== user?.id) setIsTyping(false);
    };

    const handleFriendOnline = (data: { userId: string }) => {
      setFriends((prev) => prev.map((f) => (f.id === data.userId ? { ...f, is_online: true } : f)));
    };

    const handleFriendOffline = (data: { userId: string }) => {
      setFriends((prev) => prev.map((f) => (f.id === data.userId ? { ...f, is_online: false } : f)));
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_stopped_typing', handleUserStoppedTyping);
    socket.on('friend_online', handleFriendOnline);
    socket.on('friend_offline', handleFriendOffline);

    return () => {
      socket.off('receive_message');
      socket.off('user_typing');
      socket.off('user_stopped_typing');
      socket.off('friend_online');
      socket.off('friend_offline');
      socket.emit('leave_conversation', { conversationId });
    };
  }, [socket, isConnected, selectedFriend?.conversation_id, user?.id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
    if (!socket || !selectedFriend?.conversation_id) return;

    socket.emit('typing_start', { conversationId: selectedFriend.conversation_id });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing_stop', { conversationId: selectedFriend.conversation_id });
    }, 3000);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedFriend?.conversation_id || !socket) return;

    const encryptedContent = Buffer.from(messageInput.trim()).toString('base64');
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const tempMessage: Message = {
      id: tempId,
      conversation_id: selectedFriend.conversation_id,
      sender_id: user!.id,
      encrypted_content: encryptedContent,
      sent_at: new Date().toISOString(),
      tempId,
      sender: { id: user!.id, username: user!.username, display_name: user!.display_name, avatar_url: user!.avatar_url },
    };

    setMessages((prev) => [...prev, tempMessage]);
    processedIds.current.add(tempId);
    setMessageInput('');
    playSentSound();

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socket.emit('typing_stop', { conversationId: selectedFriend.conversation_id });
    socket.emit('send_message', { conversationId: selectedFriend.conversation_id, encryptedContent, messageType: 'text', tempId });
  };

  const filteredFriends = friends.filter(f =>
    f.display_name.toLowerCase().includes(search.toLowerCase()) || f.username.toLowerCase().includes(search.toLowerCase())
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
      {isCallStale() && activeCall && activeCall.friendId !== selectedFriend?.id && (
        <div className="fixed top-4 right-4 z-[9997] bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-pulse border-2 border-white/30">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <PhoneCall className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <p className="font-bold text-lg">Active call</p>
            <p className="text-sm opacity-90">with {activeCall.friendName}</p>
          </div>
          <button 
            onClick={() => {
              const friend = friends.find(f => f.id === activeCall.friendId);
              if (friend) setSelectedFriend(friend);
            }}
            className="px-6 py-2 bg-white text-green-600 hover:bg-gray-100 rounded-xl font-semibold transition-all"
          >
            View Call
          </button>
        </div>
      )}

      <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
        <aside className="w-96 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          <div className="h-16 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Avatar src={user.avatar_url} name={user.display_name || user.username} size="md" />
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{user.display_name || user.username}</h2>
                <p className="text-xs text-green-500">{isConnected ? 'Active now' : 'Connecting...'}</p>
              </div>
            </div>

            <div className="relative">
              <button onClick={() => setShowMenu(!showMenu)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                <MoreVertical size={20} className="text-gray-600 dark:text-gray-400" />
              </button>

              {showMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                  <div className="absolute top-full right-0 mt-1 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 py-2">
                    <button onClick={() => { router.push('/profile'); setShowMenu(false); }} className="w-full px-4 py-2.5 flex items-center space-x-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
                      <User size={18} /><span className="text-sm">Profile</span>
                    </button>
                    <button onClick={() => { router.push('/friends'); setShowMenu(false); }} className="w-full px-4 py-2.5 flex items-center space-x-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
                      <UserPlus size={18} /><span className="text-sm">Add Friend</span>
                    </button>
                    <button onClick={() => { router.push('/friends/qr'); setShowMenu(false); }} className="w-full px-4 py-2.5 flex items-center space-x-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
                      <QrCode size={18} /><span className="text-sm">QR Code</span>
                    </button>
                    <button onClick={() => { router.push('/settings'); setShowMenu(false); }} className="w-full px-4 py-2.5 flex items-center space-x-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
                      <Settings size={18} /><span className="text-sm">Settings</span>
                    </button>
                    <div className="border-t border-gray-200 dark:border-gray-700 my-2" />
                    <button onClick={logout} className="w-full px-4 py-2.5 flex items-center space-x-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-red-600 dark:text-red-400">
                      <LogOut size={18} /><span className="text-sm">Logout</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type="text" placeholder="Search friends..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredFriends.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full px-6 text-center">
                <MessageSquare size={64} className="text-gray-300 dark:text-gray-600 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No friends yet</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Scan QR codes to add friends</p>
                <button onClick={() => router.push('/friends/qr')} className="px-6 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-medium">Scan QR Code</button>
              </div>
            ) : (
              filteredFriends.map((friend) => (
                <button key={friend.id} onClick={() => setSelectedFriend(friend)} disabled={!friend.conversation_id} className={`w-full flex items-center space-x-3 px-4 py-3 transition-all border-b border-gray-100 dark:border-gray-700/50 ${selectedFriend?.id === friend.id ? 'bg-teal-50 dark:bg-teal-900/20 border-l-4 border-l-teal-500' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'} disabled:opacity-50 disabled:cursor-not-allowed`}>
                  <div className="relative flex-shrink-0">
                    <Avatar src={friend.avatar_url} name={friend.display_name} size="md" />
                    <span className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white dark:border-gray-800 rounded-full ${friend.is_online ? 'bg-green-500' : 'bg-gray-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{friend.display_name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{friend.is_online ? '🟢 Active' : 'Offline'}</p>
                  </div>
                  {!friend.conversation_id && <span className="text-xs text-amber-500">No chat</span>}
                </button>
              ))
            )}
          </div>
        </aside>

        <main className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900">
          {!selectedFriend ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-md px-6">
                <MessageSquare size={120} className="mx-auto text-gray-300 dark:text-gray-700 mb-8" />
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">SecureChat</h2>
                <p className="text-gray-600 dark:text-gray-400">End-to-end encrypted messaging.<br />Select a friend to start chatting.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Avatar src={selectedFriend.avatar_url} name={selectedFriend.display_name} size="md" />
                    <span className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white dark:border-gray-800 rounded-full ${selectedFriend.is_online ? 'bg-green-500' : 'bg-gray-400'}`} />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{selectedFriend.display_name}</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{isTyping ? <span className="text-teal-500">typing...</span> : selectedFriend.is_online ? <span className="text-green-500">Active</span> : 'Offline'}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <button onClick={() => webrtc.startCall('audio')} disabled={!selectedFriend.conversation_id} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50" title="Audio call"><Phone size={20} className="text-gray-700 dark:text-gray-300" /></button>
                  <button onClick={() => webrtc.startCall('video')} disabled={!selectedFriend.conversation_id} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50" title="Video call"><Video size={20} className="text-gray-700 dark:text-gray-300" /></button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {messagesLoading ? (
                  <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" /></div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full"><div className="text-center"><MessageSquare size={64} className="mx-auto text-teal-500 mb-4" /><p className="text-gray-500 dark:text-gray-400">No messages yet</p></div></div>
                ) : (
                  <div className="space-y-4 max-w-4xl mx-auto">
                    {messages.map((msg) => {
                      const isMe = msg.sender_id === user.id;
                      let content = msg.encrypted_content;
                      try { content = Buffer.from(msg.encrypted_content, 'base64').toString('utf-8'); } catch (e) {}

                      return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[75%] ${isMe ? '' : 'flex items-start space-x-2'}`}>
                            {!isMe && <Avatar src={selectedFriend.avatar_url} name={selectedFriend.display_name} size="sm" />}
                            <div>
                              <div className={`rounded-2xl px-4 py-2 ${isMe ? 'bg-teal-500 text-white rounded-br-none' : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-none'}`}><p className="text-sm">{content}</p></div>
                              <p className={`text-xs mt-1 ${isMe ? 'text-right text-gray-500' : 'text-gray-400'}`}>{new Date(msg.sent_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    {isTyping && (
                      <div className="flex justify-start"><div className="flex items-start space-x-2"><Avatar src={selectedFriend.avatar_url} name={selectedFriend.display_name} size="sm" /><div className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-3"><div className="flex space-x-1.5"><span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" /><span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} /><span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '400ms' }} /></div></div></div></div>
                    )}
                    
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              <form onSubmit={handleSendMessage} className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                <div className="flex items-center space-x-3 max-w-4xl mx-auto">
                  <button type="button" className="p-2 text-gray-500 hover:text-teal-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><Smile size={22} /></button>
                  <button type="button" className="p-2 text-gray-500 hover:text-teal-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><Paperclip size={22} /></button>
                  <input type="text" value={messageInput} onChange={handleInputChange} placeholder={isConnected ? "Type a message..." : "Connecting..."} disabled={!isConnected} className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-full text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50" />
                  <button type="submit" disabled={!isConnected || !messageInput.trim()} className="p-2.5 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-full disabled:cursor-not-allowed"><Send size={20} /></button>
                </div>
              </form>
            </>
          )}
        </main>
      </div>

      {/* ✅ GLOBAL Video Call Overlay - works even when no friend selected */}
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
