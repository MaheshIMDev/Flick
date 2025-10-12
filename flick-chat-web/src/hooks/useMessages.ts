'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from './useSocket';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  encrypted_content: string;
  message_type: string;
  sent_at: string;
  tempId?: string;
  sender?: {
    id: string;
    username: string;
    display_name?: string;
    avatar_url?: string;
  };
}

export function useMessages(conversationId: string) {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const processedMessageIds = useRef(new Set<string>());

  // Fetch initial messages
  useEffect(() => {
    if (!conversationId) return;

    const fetchMessages = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/messages/conversation/${conversationId}?limit=50`);
        const fetchedMessages = response.data.messages.reverse();
        
        // Track all fetched message IDs
        fetchedMessages.forEach((msg: Message) => {
          processedMessageIds.current.add(msg.id);
        });
        
        setMessages(fetchedMessages);
        setError(null);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load messages');
        // Fetch error err);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [conversationId]);

  // Listen for new messages
  useEffect(() => {
    if (!socket || !isConnected || !conversationId) return;

    const handleReceiveMessage = (message: Message) => {
      if (message.conversation_id === conversationId) {
        // Check if we've already processed this message
        if (processedMessageIds.current.has(message.id)) {
          return; // Skip duplicate
        }

        // Check if tempId matches (our own message coming back)
        if (message.tempId) {
          setMessages((prev) => 
            prev.map((msg) => 
              msg.id === message.tempId ? { ...message, tempId: undefined } : msg
            )
          );
          processedMessageIds.current.add(message.id);
          return;
        }

        // New message from someone else
        setMessages((prev) => [...prev, message]);
        processedMessageIds.current.add(message.id);
      }
    };

    socket.on('receive_message', handleReceiveMessage);

    // Join conversation room
    socket.emit('join_conversation', { conversationId });

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.emit('leave_conversation', { conversationId });
    };
  }, [socket, isConnected, conversationId]);

  const sendMessage = useCallback(
    (content: string) => {
      if (!socket || !isConnected || !content.trim() || !user) return;

      // Encrypt content (base64 encode for now)
      const encryptedContent = Buffer.from(content).toString('base64');
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Optimistic update
      const tempMessage: Message = {
        id: tempId,
        conversation_id: conversationId,
        sender_id: user.id,
        encrypted_content: encryptedContent,
        message_type: 'text',
        sent_at: new Date().toISOString(),
        tempId,
        sender: {
          id: user.id,
          username: user.username || '',
          display_name: user.display_name,
          avatar_url: user.avatar_url,
        },
      };

      setMessages((prev) => [...prev, tempMessage]);
      processedMessageIds.current.add(tempId);

      // Send to server
      socket.emit('send_message', {
        conversationId,
        encryptedContent,
        messageType: 'text',
        tempId,
      });
    },
    [socket, isConnected, conversationId, user]
  );

  return { messages, loading, error, sendMessage };
}
