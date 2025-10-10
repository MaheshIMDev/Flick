import { Server as SocketIOServer } from 'socket.io';
import { AuthenticatedSocket } from './authMiddleware';
import { RedisService } from '../utils/redisClient';
import { supabase } from '../utils/supabaseClient';
import { getConversationParticipants } from '../utils/socketHelpers';

export function registerMessageHandlers(io: SocketIOServer, socket: AuthenticatedSocket) {
  const userId = socket.data.userId;

  // ==================== SEND MESSAGE ====================
  socket.on('send_message', async (data: {
    conversationId: string;
    encryptedContent: string;
    messageType?: string;
    tempId?: string;
  }) => {
    const { conversationId, encryptedContent, messageType = 'text', tempId } = data;

    try {
      // Rate limiting
      const canSend = await RedisService.checkRateLimit(userId, 'messages', 60, 60);
      if (!canSend) {
        return socket.emit('error', { message: 'Too many messages. Please slow down.', tempId });
      }

      // Verify user is participant
      const { data: participant } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', conversationId)
        .eq('user_id', userId)
        .single();

      if (!participant) {
        return socket.emit('error', { message: 'Not a conversation member', tempId });
      }

      // Save to database
      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: userId,
          encrypted_content: encryptedContent,
          message_type: messageType,
          sent_at: new Date().toISOString(),
        })
        .select(`
          *,
          sender:users!messages_sender_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;

      // Update conversation timestamp
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);

      // Broadcast to ALL users in conversation (including sender for multi-device)
      const messagePayload = { ...message, tempId };
      io.to(`conversation:${conversationId}`).emit('receive_message', messagePayload);

      // Handle offline users & unread counts
      const participants = await getConversationParticipants(conversationId);
      for (const participantId of participants) {
        if (participantId !== userId) {
          await RedisService.incrementUnread(participantId, conversationId);
          
          const isOnline = await RedisService.isUserOnline(participantId);
          if (!isOnline) {
            // Queue for push notification
            await RedisService.queueMessage(conversationId, message);
            console.log(`📱 Queued notification for offline user: ${participantId}`);
          } else {
            // Send unread count update
            io.to(`user:${participantId}`).emit('unread_update', {
              conversationId,
              unreadCount: await RedisService.getUnreadCount(participantId, conversationId),
            });
          }
        }
      }

      // Stop typing indicator
      await RedisService.stopTyping(conversationId, userId);
      socket.to(`conversation:${conversationId}`).emit('user_stopped_typing', {
        userId,
        conversationId,
      });

    } catch (error: any) {
      console.error('❌ send_message error:', error);
      socket.emit('error', { message: 'Failed to send message', tempId });
    }
  });

  // ==================== MARK AS READ ====================
  socket.on('mark_read', async ({ conversationId, messageId }: {
    conversationId: string;
    messageId?: string;
  }) => {
    try {
      await RedisService.clearUnread(userId, conversationId);

      socket.to(`conversation:${conversationId}`).emit('message_read', {
        userId,
        messageId,
        conversationId,
        readAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ mark_read error:', error);
    }
  });
}
