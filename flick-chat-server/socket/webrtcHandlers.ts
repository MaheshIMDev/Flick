import { Server as SocketIOServer } from 'socket.io';
import { AuthenticatedSocket } from './authMiddleware';
import { RedisService } from '../utils/redisClient';
import { supabase } from '../utils/supabaseClient';

export function registerWebRTCHandlers(io: SocketIOServer, socket: AuthenticatedSocket) {
  const userId = socket.data.userId;

  // ==================== INITIATE CALL ====================
  socket.on('webrtc_offer', async (data: {
    offer: any;
    to: string;
    conversationId: string;
    callType: 'audio' | 'video'
  }) => {
    try {
      const initiatedAt = new Date();
      console.log(`📞 Call offer from ${userId} to ${data.to}`);

      // ✅ CHECK FOR RACE CONDITION - Is the other user also calling?
      const existingCallFromOtherUser = await RedisService.cacheGet<any>(`call:${data.to}:${userId}`);
      
      if (existingCallFromOtherUser) {
        console.log(`⚡ Race condition detected! Both users calling each other`);
        
        // RULE: Lower user ID wins (deterministic)
        const shouldWin = userId < data.to;
        
        if (shouldWin) {
          console.log(`✅ ${userId} wins the race - proceeding with call`);
          // Cancel the other user's call
          io.to(`user:${data.to}`).emit('call:race_lost', {
            message: 'Call already in progress'
          });
        } else {
          console.log(`❌ ${userId} loses the race - canceling this call`);
          socket.emit('call:race_lost', {
            message: 'Call already in progress'
          });
          return;
        }
      }

      // ✅ CHECK: Is there already an active call between these users?
      const { data: activeCall } = await supabase
        .from('call_sessions')
        .select('id, call_status')
        .or(`and(caller_id.eq.${userId},callee_id.eq.${data.to}),and(caller_id.eq.${data.to},callee_id.eq.${userId})`)
        .in('call_status', ['ringing', 'active'])
        .order('initiated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (activeCall) {
        console.log(`⚠️ Call already in progress: ${activeCall.id}`);
        socket.emit('call:already_in_progress', {
          message: 'Call already in progress'
        });
        return;
      }

      // Create call session in database
      const { data: callSession, error } = await supabase
        .from('call_sessions')
        .insert({
          caller_id: userId,
          callee_id: data.to,
          call_type: data.callType === 'audio' ? 'voice' : 'video',
          call_status: 'ringing',
          initiated_at: initiatedAt.toISOString()
        })
        .select()
        .single();

      if (error || !callSession) {
        console.error('❌ Failed to create call session:', error);
        return;
      }

      // Store in Redis (60 seconds for missed call detection)
      await RedisService.cacheSet(`call:${userId}:${data.to}`, {
        sessionId: callSession.id,
        callerId: userId,
        calleeId: data.to,
        type: data.callType,
        initiatedAt: initiatedAt.getTime()
      }, 60);

      // Send to receiver
      io.to(`user:${data.to}`).emit('webrtc_incoming_call', {
        from: userId,
        callType: data.callType,
        sessionId: callSession.id
      });

      io.to(`user:${data.to}`).emit('webrtc_offer', {
        offer: data.offer,
        from: userId,
      });

    } catch (error) {
      console.error('❌ webrtc_offer error:', error);
    }
  });

  // ==================== ANSWER CALL ====================
  socket.on('webrtc_answer_call', async (data: { to: string; conversationId: string }) => {
    try {
      const answeredAt = new Date();
      console.log(`✅ Call answered by ${userId}`);

      // Get session from Redis
      const callData = await RedisService.cacheGet<any>(`call:${data.to}:${userId}`);

      if (!callData?.sessionId) {
        console.log('⚠️ Call session not found or expired');
        return;
      }

      // Update database
      await supabase
        .from('call_sessions')
        .update({
          answered_at: answeredAt.toISOString(),
          call_status: 'active'
        })
        .eq('id', callData.sessionId);

      // Update Redis with longer expiry (2 hours max call duration)
      callData.answeredAt = answeredAt.getTime();
      await RedisService.cacheSet(`call:${data.to}:${userId}`, callData, 7200);

      // Send synchronized start time to both users
      const callStartTime = answeredAt.getTime();

      io.to(`user:${data.to}`).emit('call:connected', {
        with: userId,
        callStartTime
      });

      socket.emit('call:connected', {
        with: data.to,
        callStartTime
      });

    } catch (error) {
      console.error('❌ webrtc_answer_call error:', error);
    }
  });

  // ==================== SEND ANSWER ====================
  socket.on('webrtc_answer', (data: { answer: any; to: string; conversationId: string }) => {
    console.log(`📥 Call answer from ${userId} to ${data.to}`);
    io.to(`user:${data.to}`).emit('webrtc_answer', {
      answer: data.answer,
      from: userId,
    });
  });

  // ==================== ICE CANDIDATES ====================
  socket.on('webrtc_ice_candidate', (data: { candidate: any; to: string; conversationId: string }) => {
    io.to(`user:${data.to}`).emit('webrtc_ice_candidate', {
      candidate: data.candidate,
      from: userId,
    });
  });

  // ==================== REJECT CALL ====================
  socket.on('webrtc_reject_call', async (data: { to: string; conversationId: string }) => {
    try {
      console.log(`❌ Call reject request from ${userId}`);
      
      const callData = await RedisService.cacheGet<any>(`call:${data.to}:${userId}`);

      if (!callData?.sessionId) {
        console.log('⚠️ No active call found - already ended');
        return;
      }

      // ✅ CHECK: Get current status
      const { data: existingCall } = await supabase
        .from('call_sessions')
        .select('call_status')
        .eq('id', callData.sessionId)
        .single();

      if (!existingCall) {
        console.log('⚠️ Call session not found');
        return;
      }

      // ✅ CHECK: Only reject if still ringing
      if (existingCall.call_status !== 'ringing') {
        console.log(`⚠️ Call already ${existingCall.call_status} - ignoring reject`);
        return;
      }

      // ✅ UPDATE with condition check (atomic operation)
      await supabase
        .from('call_sessions')
        .update({
          ended_at: new Date().toISOString(),
          call_status: 'declined',
          end_reason: 'declined'
        })
        .eq('id', callData.sessionId)
        .eq('call_status', 'ringing');

      await RedisService.cacheDel(`call:${data.to}:${userId}`);

      io.to(`user:${data.to}`).emit('webrtc_call_rejected', {
        from: userId,
      });

      console.log(`✅ Call declined by ${userId}`);
    } catch (error) {
      console.error('❌ webrtc_reject_call error:', error);
    }
  });

  // ==================== END CALL ====================
  socket.on('webrtc_end_call', async (data: {
    to: string;
    conversationId: string;
    callDuration?: number;
  }) => {
    try {
      console.log(`📵 Call end request from ${userId}`);

      // Try both directions
      let callData = await RedisService.cacheGet<any>(`call:${userId}:${data.to}`);
      if (!callData) {
        callData = await RedisService.cacheGet<any>(`call:${data.to}:${userId}`);
      }

      if (!callData?.sessionId) {
        console.log('⚠️ No active call found - already ended');
        return;
      }

      // ✅ CHECK: Get current call status
      const { data: existingCall } = await supabase
        .from('call_sessions')
        .select('call_status, answered_at')
        .eq('id', callData.sessionId)
        .single();

      if (!existingCall) {
        console.log('⚠️ Call session not found');
        return;
      }

      // ✅ CHECK: Is call already ended?
      if (['ended', 'declined', 'missed'].includes(existingCall.call_status)) {
        console.log(`⚠️ Call already ${existingCall.call_status} - ignoring end request`);
        return;
      }

      const updateData: any = {
        ended_at: new Date().toISOString(),
        call_status: 'ended',
        ended_by_user_id: userId
      };

      // Calculate duration if call was answered
      if (existingCall.answered_at && data.callDuration && data.callDuration > 0) {
        updateData.duration_seconds = Math.floor(data.callDuration);
        updateData.end_reason = 'completed';
        console.log(`✅ Call completed: ${data.callDuration}s`);
      } else if (existingCall.answered_at) {
        // Answered but no duration (very short call)
        updateData.duration_seconds = 0;
        updateData.end_reason = 'completed';
        console.log(`✅ Call completed: 0s`);
      } else {
        // Never answered - cancelled by caller
        updateData.duration_seconds = null;
        updateData.end_reason = 'cancelled';
        console.log(`🚫 Call cancelled before answer`);
      }

      // ✅ UPDATE with condition check (atomic operation)
      await supabase
        .from('call_sessions')
        .update(updateData)
        .eq('id', callData.sessionId)
        .in('call_status', ['ringing', 'active']);

      // Clean up Redis
      await RedisService.cacheDel(`call:${userId}:${data.to}`);
      await RedisService.cacheDel(`call:${data.to}:${userId}`);

      // Notify peer
      const peerSockets = await RedisService.getUserSockets(data.to);
      peerSockets.forEach(socketId => {
        io.to(socketId).emit('webrtc_call_ended', { from: userId });
      });

    } catch (error) {
      console.error('❌ webrtc_end_call error:', error);
    }
  });
}
