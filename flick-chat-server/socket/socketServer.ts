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
      // ==================== SETUP & CLEANUP ====================
      // Clean up any stale sockets for this user first
      const existingSockets = await RedisService.getUserSockets(userId);
      if (existingSockets.length > 5) {
        console.warn(`⚠️  User ${userId} has ${existingSockets.length} sockets, cleaning up old ones`);
        // Keep only the 3 most recent, remove others
        const socketsToRemove = existingSockets.slice(0, -3);
        for (const oldSocket of socketsToRemove) {
          await RedisService.removeUserSocket(userId, oldSocket);
        }
        console.log(`🧹 Cleaned up ${socketsToRemove.length} old sockets for user ${userId}`);
      }

      // Mark user as online
      await RedisService.setUserOnline(userId, 30);
      await RedisService.addUserSocket(userId, socket.id);
      console.log(`✅ Added socket ${socket.id} for user ${userId}`);

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

      console.log(`🟢 User ${userId} marked as ONLINE in Redis`);

      // ✅ BROADCAST ONLINE STATUS TO FRIENDS
      await broadcastToFriends(io, userId, 'friend_online', {
        userId,
        timestamp: Date.now(),
      });

      console.log(`📡 Broadcasted online status for user ${userId}`);

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
          console.log(`📞 User ${userId} requesting online friends`);

          const { data: friends } = await supabase
            .from('user_connections')
            .select('connected_user_id')
            .eq('user_id', userId)
            .eq('status', 'active');

          if (!friends || friends.length === 0) {
            socket.emit('online_friends', []);
            return;
          }

          const onlineStatus = await Promise.all(
            friends.map(async (friend: any) => {
              const friendId = friend.connected_user_id;
              const isOnline = await RedisService.isUserOnline(friendId);
              const lastSeen = await RedisService.getLastSeen(friendId);
              
              return {
                userId: friendId,
                isOnline,
                lastSeen,
              };
            })
          );

          console.log(`📊 Sending online status for ${onlineStatus.length} friends to user ${userId}`);
          socket.emit('online_friends', onlineStatus);
        } catch (error) {
          console.error('get_online_friends error:', error);
          socket.emit('online_friends', []);
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
          // Remove this specific socket
          await RedisService.removeUserSocket(userId, socket.id);
          console.log(`🗑️  Removed socket ${socket.id} for user ${userId}`);

          // Get remaining sockets
          const userSockets = await RedisService.getUserSockets(userId);
          console.log(`🔍 User ${userId} has ${userSockets.length} remaining sockets`);

          // If no sockets left, mark offline
          if (userSockets.length === 0) {
            await RedisService.setUserOffline(userId);
            console.log(`🔴 User ${userId} marked as OFFLINE in Redis`);

            // Broadcast offline status to friends
            await broadcastToFriends(io, userId, 'friend_offline', {
              userId,
              lastSeen: Date.now(),
            });

            console.log(`📡 Broadcasted offline status for user ${userId}`);

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
          } else {
            console.log(`⚠️  User ${userId} still has ${userSockets.length} active connections, keeping online`);
          }
        } catch (error) {
          console.error('❌ Disconnect cleanup error:', error);
          
          // Force cleanup on error
          try {
            await RedisService.setUserOffline(userId);
            await broadcastToFriends(io, userId, 'friend_offline', {
              userId,
              lastSeen: Date.now(),
            });
            console.log(`🔴 Force marked user ${userId} offline after error`);
          } catch (fallbackError) {
            console.error('❌ Fallback cleanup failed:', fallbackError);
          }
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
