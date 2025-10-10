import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Server as HTTPServer } from 'http';
import { redisPub, redisSub, RedisService } from '../utils/redisClient';
import { supabase } from '../utils/supabaseClient';
import { authenticateSocket, AuthenticatedSocket } from './authMiddleware';
import { registerMessageHandlers } from './messageHandlers';
import { registerPresenceHandlers } from './presenceHandlers';
import { broadcastToFriends } from '../utils/socketHelpers';
import { registerWebRTCHandlers } from './webrtcHandlers';

export function initializeSocketIO(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      credentials: true,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Use Redis adapter for horizontal scaling
  try {
    io.adapter(createAdapter(redisPub, redisSub));
    console.log('✅ Socket.io Redis adapter configured');
  } catch (error) {
    console.warn('⚠️ Redis adapter failed, using in-memory adapter');
  }

  // Authentication middleware
  io.use(authenticateSocket);

  // Connection handler
  io.on('connection', async (socket: AuthenticatedSocket) => {
    const userId = socket.data.userId;
    const userEmail = socket.data.userEmail;

    console.log(`✅ User connected: ${userEmail} (${socket.id})`);

    try {
      // ==================== SETUP ====================
      
      // Mark user as online
      await RedisService.setUserOnline(userId, 30);
      await RedisService.addUserSocket(userId, socket.id);

      // Join user's personal room
      socket.join(`user:${userId}`);

      // Load user's conversations and join rooms
      const { data: conversations } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (conversations) {
        conversations.forEach((conv: any) => {
          socket.join(`conversation:${conv.conversation_id}`);
        });
      }

      // Broadcast online status to friends
      await broadcastToFriends(io, userId, 'friend_online', {
        userId,
        timestamp: Date.now(),
      });

      // Send user their unread counts
      if (conversations) {
        for (const conv of conversations) {
          const unreadCount = await RedisService.getUnreadCount(userId, conv.conversation_id);
          if (unreadCount > 0) {
            socket.emit('unread_update', {
              conversationId: conv.conversation_id,
              unreadCount,
            });
          }
        }
      }

      // ==================== REGISTER HANDLERS ====================
      
      registerMessageHandlers(io, socket);
      registerPresenceHandlers(io, socket);
      registerWebRTCHandlers(io, socket);

      // ==================== JOIN CONVERSATION ====================
      
      socket.on('join_conversation', async ({ conversationId }: { conversationId: string }) => {
        try {
          // Verify user is participant
          const { data: participant } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', conversationId)
            .eq('user_id', userId)
            .single();

          if (participant) {
            socket.join(`conversation:${conversationId}`);
            socket.emit('joined_conversation', { conversationId });

            // Clear unread count
            await RedisService.clearUnread(userId, conversationId);

            // Get typing users
            const typingUsers = await RedisService.getTypingUsers(conversationId);
            if (typingUsers.length > 0) {
              socket.emit('typing_users', {
                conversationId,
                userIds: typingUsers.filter(id => id !== userId),
              });
            }
          } else {
            socket.emit('error', { message: 'Not a conversation participant' });
          }
        } catch (error) {
          console.error('join_conversation error:', error);
          socket.emit('error', { message: 'Failed to join conversation' });
        }
      });

      // ==================== LEAVE CONVERSATION ====================
      
      socket.on('leave_conversation', ({ conversationId }: { conversationId: string }) => {
        socket.leave(`conversation:${conversationId}`);
        socket.emit('left_conversation', { conversationId });
      });

      // ==================== GET ONLINE FRIENDS ====================
      
      socket.on('get_online_friends', async () => {
        try {
          const { data: friends } = await supabase
            .from('user_connections')
            .select('connected_user_id')
            .eq('user_id', userId)
            .eq('status', 'active');

          if (!friends) return;

          const onlineStatus = await Promise.all(
            friends.map(async (friend: any) => ({
              userId: friend.connected_user_id,
              isOnline: await RedisService.isUserOnline(friend.connected_user_id),
              lastSeen: await RedisService.getLastSeen(friend.connected_user_id),
            }))
          );

          socket.emit('online_friends', onlineStatus);
        } catch (error) {
          console.error('get_online_friends error:', error);
        }
      });

      // ==================== HEARTBEAT ====================
      
      socket.on('heartbeat', async () => {
        await RedisService.setUserOnline(userId, 30);
      });

      // Auto heartbeat every 20 seconds
      const heartbeatInterval = setInterval(async () => {
        await RedisService.setUserOnline(userId, 30);
      }, 20000);

      // ==================== DISCONNECT ====================
      
      socket.on('disconnect', async (reason) => {
        console.log(`❌ User disconnected: ${userEmail} (${reason})`);

        clearInterval(heartbeatInterval);

        try {
          await RedisService.removeUserSocket(userId, socket.id);

          // Check if user has other active sockets
          const userSockets = await RedisService.getUserSockets(userId);

          if (userSockets.length === 0) {
            // User is fully offline
            await RedisService.setUserOffline(userId);

            // Broadcast offline status to friends
            await broadcastToFriends(io, userId, 'friend_offline', {
              userId,
              lastSeen: Date.now(),
            });

            // Clear all typing indicators for this user
            if (conversations) {
              for (const conv of conversations) {
                await RedisService.stopTyping(conv.conversation_id, userId);
                socket.to(`conversation:${conv.conversation_id}`).emit('user_stopped_typing', {
                  userId,
                  conversationId: conv.conversation_id,
                });
              }
            }
          }
        } catch (error) {
          console.error('disconnect cleanup error:', error);
        }
      });

      // ==================== ERROR HANDLING ====================
      
      socket.on('error', (error) => {
        console.error(`Socket error for ${userEmail}:`, error);
      });

    } catch (error) {
      console.error('Connection setup error:', error);
      socket.disconnect();
    }
  });

  // Global error handler
  io.engine.on('connection_error', (err) => {
    console.error('Connection error:', err);
  });

  console.log('✅ Socket.io server initialized');
  return io;
}
