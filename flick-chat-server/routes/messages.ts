import express from 'express';
import { supabase } from '../utils/supabaseClient';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

// ==================== GET MESSAGES ====================
router.get('/conversation/:conversationId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const { conversationId } = req.params;
  const { limit = 50 } = req.query;

  try {
    // Verify user is participant
    const { data: participant } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .eq('user_id', req.user.id)
      .single();

    if (!participant) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Fetch messages (simplified - removed reply_to and reactions for now)
    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users!messages_sender_id_fkey(
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('conversation_id', conversationId)
      .is('deleted_at', null)
      .order('sent_at', { ascending: false })
      .limit(parseInt(limit as string));

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    res.json({ messages: messages || [], cached: false });
  } catch (error: any) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// ==================== GET MESSAGE BY ID ====================
router.get('/:messageId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const { messageId } = req.params;

  try {
    const { data: message, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users!messages_sender_id_fkey(
          id,
          username,
          display_name,
          avatar_url
        ),
        conversation:conversations(id, type)
      `)
      .eq('id', messageId)
      .single();

    if (error) throw error;

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Verify user has access
    const { data: participant } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', message.conversation_id)
      .eq('user_id', req.user.id)
      .single();

    if (!participant) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ message });
  } catch (error: any) {
    console.error('Get message error:', error);
    res.status(500).json({ error: 'Failed to fetch message' });
  }
});

// ==================== SEARCH MESSAGES ====================
router.get('/search/:conversationId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const { conversationId } = req.params;
  const { query, limit = 20 } = req.query;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Search query required' });
  }

  try {
    // Verify participant
    const { data: participant } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .eq('user_id', req.user.id)
      .single();

    if (!participant) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users!messages_sender_id_fkey(id, username, display_name)
      `)
      .eq('conversation_id', conversationId)
      .ilike('encrypted_content', `%${query}%`)
      .is('deleted_at', null)
      .order('sent_at', { ascending: false })
      .limit(parseInt(limit as string));

    if (error) throw error;

    res.json({ messages });
  } catch (error: any) {
    console.error('Search messages error:', error);
    res.status(500).json({ error: 'Failed to search messages' });
  }
});

export default router;
