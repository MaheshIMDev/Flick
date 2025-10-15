'use client';

import { useState, useEffect, useRef, ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useMessages } from '@/hooks/useMessages';
import { useSocket } from '@/hooks/useSocket';
import useWebRTC  from '@/hooks/useWebRTC';
import Avatar from '@/components/ui/Avatar';
import VideoCallOverlay from '@/components/call/CallOverLay';
import { Phone, Video, MoreVertical, ArrowLeft, Send, Smile, Paperclip } from 'lucide-react';
import api from '@/lib/api';

interface ConversationInfo {
  id: string;
  name: string;
  avatar_url?: string | null;
  is_online?: boolean;
  friend_id?: string;
}

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const conversationId = params.id as string;
  
  const { messages, loading, sendMessage } = useMessages(conversationId);
  const { socket, isConnected } = useSocket();
  
  const [conversationInfo, setConversationInfo] = useState<ConversationInfo | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [headerCallControls, setHeaderCallControls] = useState<ReactNode>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const webrtc = useWebRTC({
    friendId: conversationInfo?.friend_id || '',
    conversationId: conversationId || '',
  });

  useEffect(() => {
    const fetchConversationInfo = async () => {
      try {
        const [friendsRes, convsRes] = await Promise.all([
          api.get('/friends'),
          api.get('/conversations')
        ]);

        const friends = friendsRes.data.friends || [];
        const conversations = convsRes.data.conversations || [];
        const conversation = conversations.find((c: any) => c.id === conversationId);
        
        if (conversation) {
          const participant = conversation.participants?.find((p: any) => p.id !== user?.id);
          const friend = friends.find((f: any) => f.id === participant?.id);
          
          if (friend) {
            setConversationInfo({
              id: conversationId,
              name: friend.display_name || friend.username,
              avatar_url: friend.avatar_url,
              is_online: friend.is_online,
              friend_id: friend.id,
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch conversation info:', error);
      }
    };

    if (conversationId) {
      fetchConversationInfo();
    }
  }, [conversationId, user?.id]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleUserTyping = (data: { userId: string; conversationId: string }) => {
      if (data.conversationId === conversationId && data.userId !== user?.id) {
        setTypingUsers((prev) => [...new Set([...prev, data.userId])]);
      }
    };

    const handleUserStoppedTyping = (data: { userId: string; conversationId: string }) => {
      if (data.conversationId === conversationId) {
        setTypingUsers((prev) => prev.filter((id) => id !== data.userId));
      }
    };

    socket.on('user_typing', handleUserTyping);
    socket.on('user_stopped_typing', handleUserStoppedTyping);

    return () => {
      socket.off('user_typing', handleUserTyping);
      socket.off('user_stopped_typing', handleUserStoppedTyping);
    };
  }, [socket, isConnected, conversationId, user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);

    if (socket && isConnected) {
      socket.emit('typing_start', { conversationId });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing_stop', { conversationId });
      }, 3000);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedMessage = messageInput.trim();
    if (!trimmedMessage) return;

    sendMessage(trimmedMessage);
    setMessageInput('');

    if (socket && isConnected) {
      socket.emit('typing_stop', { conversationId });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }
  };

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <>
      <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
        <div className="flex-1 flex flex-col bg-white dark:bg-gray-800">
          
          {/* Header */}
          <div className="h-16 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} className="text-gray-700 dark:text-gray-300" />
              </button>

              {conversationInfo && !headerCallControls && (
                <>
                  <div className="relative">
                    <Avatar
                      src={conversationInfo.avatar_url}
                      name={conversationInfo.name}
                      size="md"
                    />
                    {conversationInfo.is_online && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                      {conversationInfo.name}
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {typingUsers.length > 0 
                        ? 'typing...'
                        : conversationInfo.is_online ? 'online' : 'offline'
                      }
                    </p>
                  </div>
                </>
              )}

              {conversationInfo && headerCallControls && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {conversationInfo.name}
                  </h2>
                </div>
              )}
            </div>

            {/* Call controls or call buttons */}
            {headerCallControls || (
              <div className="flex items-center space-x-1">
                <button 
                  onClick={() => webrtc.startCall('audio')}
                  disabled={!conversationInfo?.friend_id}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Audio call"
                >
                  <Phone size={20} className="text-gray-700 dark:text-gray-300" />
                </button>
                <button 
                  onClick={() => webrtc.startCall('video')}
                  disabled={!conversationInfo?.friend_id}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Video call"
                >
                  <Video size={20} className="text-gray-700 dark:text-gray-300" />
                </button>
                <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                  <MoreVertical size={20} className="text-gray-700 dark:text-gray-300" />
                </button>
              </div>
            )}
          </div>

          {/* Messages Area */}
          <div 
            className="flex-1 overflow-y-auto p-4 space-y-3"
            style={{ 
              backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(0,0,0,0.02) 40px, rgba(0,0,0,0.02) 41px)`
            }}
          >
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-gray-500 dark:text-gray-400 mb-2">No messages yet</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500">Send a message to start the conversation</p>
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => {
                  const isMe = message.sender_id === user.id;
                  let content = message.encrypted_content;
                  try {
                    content = Buffer.from(message.encrypted_content, 'base64').toString('utf-8');
                  } catch (e) {
                    content = message.encrypted_content;
                  }

                  return (
                    <div
                      key={message.id}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg px-4 py-2 ${
                          isMe
                            ? 'bg-teal-500 text-white rounded-br-none'
                            : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-none shadow'
                        }`}
                      >
                        <p className="text-sm break-words">{content}</p>
                        <p className={`text-xs mt-1 ${isMe ? 'text-teal-100' : 'text-gray-500'}`}>
                          {new Date(message.sent_at).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {typingUsers.length > 0 && (
                  <div className="flex justify-start">
                    <div className="bg-white dark:bg-gray-700 rounded-lg px-4 py-2 shadow">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Message Input */}
          <form onSubmit={handleSendMessage} className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3">
            <div className="flex items-center space-x-2">
              <button type="button" className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                <Smile size={22} />
              </button>
              <button type="button" className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                <Paperclip size={22} />
              </button>
              
              <input
                type="text"
                value={messageInput}
                onChange={handleInputChange}
                placeholder={isConnected ? "Type a message" : "Connecting..."}
                disabled={!isConnected}
                className="flex-1 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              
              <button
                type="submit"
                disabled={!isConnected || !messageInput.trim()}
                className="p-2 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-full transition-colors disabled:cursor-not-allowed"
              >
                <Send size={20} />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* VideoCall Overlay */}
      {conversationInfo && conversationInfo.friend_id && (
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
        friendName={conversationInfo.name}
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
