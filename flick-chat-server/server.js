// flick-chat-server/server.js - Complete Socket.io server with real database integration
require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const server = http.createServer(app);

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Configure CORS for Socket.io
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors());
app.use(express.json());

// Store active users and calls
const users = new Map(); // userId -> socketId
const userSockets = new Map(); // socketId -> userId
const calls = new Map(); // callId -> call data

// 💬 REAL-TIME MESSAGING WITH DATABASE
io.on('connection', (socket) => {
  console.log(`🔌 User connected: ${socket.id}`);

  // User authentication
  socket.on('authenticate', async (userId) => {
    users.set(userId, socket.id);
    userSockets.set(socket.id, userId);
    socket.userId = userId;
    console.log(`✅ User ${userId} authenticated`);
    
    // Update user online status in database
    try {
      await supabase
        .from('profiles')
        .update({ 
          is_online: true,
          last_seen: new Date().toISOString()
        })
        .eq('id', userId);
    } catch (error) {
      console.error('Error updating online status:', error);
    }
    
    // Broadcast user online status
    socket.broadcast.emit('user_online', userId);
  });

  // Join conversation room
  socket.on('join_conversation', (conversationId) => {
    socket.join(conversationId);
    console.log(`👥 User ${socket.userId} joined conversation ${conversationId}`);
  });

  // Leave conversation room
  socket.on('leave_conversation', (conversationId) => {
    socket.leave(conversationId);
    console.log(`👋 User ${socket.userId} left conversation ${conversationId}`);
  });

  // 📨 SEND MESSAGE (Real Database Integration)
  socket.on('send_message', async (data) => {
    const { conversationId, content, tempId } = data;
    const senderId = socket.userId;
    
    try {
      console.log(`💬 Sending message from ${senderId} to conversation ${conversationId}`);
      
      // Save message to database
      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          content: content,
          content_type: 'text'
        })
        .select(`
          id,
          conversation_id,
          sender_id,
          content,
          created_at,
          profiles (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .single();

      if (error) {
        console.error('❌ Database error:', error);
        socket.emit('message_error', { tempId, error: error.message });
        return;
      }

      // Broadcast message to all users in conversation
      const messageData = {
        id: message.id,
        conversation_id: message.conversation_id,
        sender_id: message.sender_id,
        content: message.content,
        created_at: message.created_at,
        sender: {
          id: message.profiles.id,
          username: message.profiles.username,
          display_name: message.profiles.display_name,
          avatar_url: message.profiles.avatar_url
        },
        tempId // Send back temp ID for client matching
      };

      // Send to all users in the conversation room
      io.to(conversationId).emit('new_message', messageData);
      
      // Update conversation's last message
      await supabase
        .from('conversations')
        .update({ 
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);

      console.log(`✅ Message sent successfully: ${message.id}`);

    } catch (error) {
      console.error('❌ Error sending message:', error);
      socket.emit('message_error', { tempId, error: error.message });
    }
  });

  // ⌨️ TYPING INDICATORS
  socket.on('typing_start', (conversationId) => {
    socket.to(conversationId).emit('user_typing', {
      userId: socket.userId,
      conversationId
    });
  });

  socket.on('typing_stop', (conversationId) => {
    socket.to(conversationId).emit('user_stopped_typing', {
      userId: socket.userId,
      conversationId
    });
  });

  // 📞 VOICE/VIDEO CALLING
  socket.on('initiate_call', (data) => {
    const { targetUserId, conversationId, callType } = data;
    const targetSocketId = users.get(targetUserId);
    
    if (targetSocketId) {
      const callId = `call_${Date.now()}_${socket.userId}`;
      calls.set(callId, {
        callId,
        callerId: socket.userId,
        targetId: targetUserId,
        conversationId,
        callType,
        status: 'ringing'
      });

      console.log(`📞 ${callType} call initiated: ${socket.userId} → ${targetUserId}`);

      // Send call invitation to target user
      io.to(targetSocketId).emit('incoming_call', {
        callId,
        callerId: socket.userId,
        conversationId,
        callType
      });

      // Confirm call initiated to caller
      socket.emit('call_initiated', { callId });
    } else {
      socket.emit('call_failed', { error: 'User is offline' });
    }
  });

  socket.on('accept_call', (callId) => {
    const call = calls.get(callId);
    if (call) {
      call.status = 'accepted';
      const callerSocketId = users.get(call.callerId);
      
      console.log(`✅ Call accepted: ${callId}`);
      
      if (callerSocketId) {
        io.to(callerSocketId).emit('call_accepted', { callId });
        socket.emit('call_accepted', { callId });
      }
    }
  });

  socket.on('reject_call', (callId) => {
    const call = calls.get(callId);
    if (call) {
      console.log(`❌ Call rejected: ${callId}`);
      
      const callerSocketId = users.get(call.callerId);
      if (callerSocketId) {
        io.to(callerSocketId).emit('call_rejected', { callId });
      }
      calls.delete(callId);
    }
  });

  socket.on('end_call', (callId) => {
    const call = calls.get(callId);
    if (call) {
      console.log(`📴 Call ended: ${callId}`);
      
      const otherUserId = call.callerId === socket.userId ? call.targetId : call.callerId;
      const otherSocketId = users.get(otherUserId);
      
      if (otherSocketId) {
        io.to(otherSocketId).emit('call_ended', { callId });
      }
      calls.delete(callId);
    }
  });

  // 🔄 WEBRTC SIGNALING
  socket.on('webrtc_offer', (data) => {
    const { callId, offer } = data;
    const call = calls.get(callId);
    
    if (call) {
      const targetId = call.callerId === socket.userId ? call.targetId : call.callerId;
      const targetSocketId = users.get(targetId);
      
      if (targetSocketId) {
        io.to(targetSocketId).emit('webrtc_offer', { callId, offer });
      }
    }
  });

  socket.on('webrtc_answer', (data) => {
    const { callId, answer } = data;
    const call = calls.get(callId);
    
    if (call) {
      const targetId = call.callerId === socket.userId ? call.targetId : call.callerId;
      const targetSocketId = users.get(targetId);
      
      if (targetSocketId) {
        io.to(targetSocketId).emit('webrtc_answer', { callId, answer });
      }
    }
  });

  socket.on('webrtc_ice_candidate', (data) => {
    const { callId, candidate } = data;
    const call = calls.get(callId);
    
    if (call) {
      const targetId = call.callerId === socket.userId ? call.targetId : call.callerId;
      const targetSocketId = users.get(targetId);
      
      if (targetSocketId) {
        io.to(targetSocketId).emit('webrtc_ice_candidate', { callId, candidate });
      }
    }
  });

  // 🔌 DISCONNECT HANDLING
  socket.on('disconnect', async () => {
    const userId = userSockets.get(socket.id);
    console.log(`🔌 User disconnected: ${socket.id} (${userId})`);
    
    if (userId) {
      // Update user offline status in database
      try {
        await supabase
          .from('profiles')
          .update({ 
            is_online: false,
            last_seen: new Date().toISOString()
          })
          .eq('id', userId);
      } catch (error) {
        console.error('Error updating offline status:', error);
      }
      
      // Clean up user mapping
      users.delete(userId);
      userSockets.delete(socket.id);
      
      // Broadcast user offline status
      socket.broadcast.emit('user_offline', userId);
      
      // End any active calls
      calls.forEach((call, callId) => {
        if (call.callerId === userId || call.targetId === userId) {
          const otherUserId = call.callerId === userId ? call.targetId : call.callerId;
          const otherSocketId = users.get(otherUserId);
          
          if (otherSocketId) {
            io.to(otherSocketId).emit('call_ended', { 
              callId, 
              reason: 'user_disconnected' 
            });
          }
          calls.delete(callId);
        }
      });
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    users: users.size,
    calls: calls.size,
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Flick Socket Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});
