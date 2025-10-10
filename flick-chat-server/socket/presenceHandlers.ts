import { Server as SocketIOServer } from 'socket.io';
import { AuthenticatedSocket } from './authMiddleware';
import { RedisService } from '../utils/redisClient';
import { broadcastToFriends } from '../utils/socketHelpers';

export function registerPresenceHandlers(io: SocketIOServer, socket: AuthenticatedSocket) {
  const userId = socket.data.userId;

  // ==================== TYPING INDICATORS ====================
  
  socket.on('typing_start', async ({ conversationId }: { conversationId: string }) => {
    try {
      await RedisService.setTyping(conversationId, userId);
      
      socket.to(`conversation:${conversationId}`).emit('user_typing', {
        userId,
        conversationId,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('typing_start error:', error);
    }
  });

  socket.on('typing_stop', async ({ conversationId }: { conversationId: string }) => {
    try {
      await RedisService.stopTyping(conversationId, userId);
      
      socket.to(`conversation:${conversationId}`).emit('user_stopped_typing', {
        userId,
        conversationId,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('typing_stop error:', error);
    }
  });

  // ==================== ONLINE STATUS ====================
  
  socket.on('update_presence', async ({ status }: { status: 'online' | 'away' | 'busy' }) => {
    try {
      if (status === 'online') {
        await RedisService.setUserOnline(userId);
      }

      await broadcastToFriends(io, userId, 'friend_presence_update', {
        userId,
        status,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('update_presence error:', error);
    }
  });

  // ==================== READ RECEIPTS ====================
  
  socket.on('mark_read', async ({ conversationId, messageId }: { 
    conversationId: string; 
    messageId: string;
  }) => {
    try {
      // Clear unread count
      await RedisService.clearUnread(userId, conversationId);

      // Broadcast read receipt
      socket.to(`conversation:${conversationId}`).emit('message_read', {
        userId,
        messageId,
        conversationId,
        readAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('mark_read error:', error);
    }
  });
}
