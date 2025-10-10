import { Server as SocketIOServer } from 'socket.io';
import { supabase } from './supabaseClient';

export async function broadcastToFriends(
  io: SocketIOServer,
  userId: string,
  event: string,
  data: any
) {
  try {
    const { data: friends } = await supabase
      .from('user_connections')
      .select('connected_user_id')
      .eq('user_id', userId)
      .eq('status', 'active');

    friends?.forEach((friend: any) => {
      io.to(`user:${friend.connected_user_id}`).emit(event, data);
    });
  } catch (error) {
    console.error('broadcastToFriends error:', error);
  }
}

export async function getConversationParticipants(conversationId: string): Promise<string[]> {
  try {
    const { data } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .eq('is_active', true);

    return data?.map((p: any) => p.user_id) || [];
  } catch (error) {
    console.error('getConversationParticipants error:', error);
    return [];
  }
}

export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function sanitizeMessage(content: string): string {
  // Basic XSS prevention
  return content
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .trim();
}
