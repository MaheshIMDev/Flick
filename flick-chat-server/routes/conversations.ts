import express from 'express';
import { supabase } from '../utils/supabaseClient';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

router.get('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user.id;

    const { data: participantData, error: participantError } = await supabase
      .from('conversation_participants')
      .select(`
        conversation_id,
        conversations (
          id,
          type,
          name,
          avatar_url,
          created_at,
          last_message_at
        )
      `)
      .eq('user_id', userId)
      .eq('is_active', true);

    if (participantError) throw participantError;

    const conversationIds = participantData?.map((p: any) => p.conversation_id) || [];

    if (conversationIds.length === 0) {
      return res.json({ conversations: [] });
    }

    const { data: allParticipants, error: allParticipantsError } = await supabase
      .from('conversation_participants')
      .select(`
        conversation_id,
        user_id,
        users (
          id,
          username,
          display_name,
          avatar_url,
          is_online
        )
      `)
      .in('conversation_id', conversationIds)
      .eq('is_active', true);

    if (allParticipantsError) throw allParticipantsError;

    const conversations = participantData?.map((p: any) => {
      const conv = p.conversations;
      
      const participants = allParticipants
        ?.filter((ap: any) => 
          ap.conversation_id === conv.id && ap.user_id !== userId
        )
        .map((ap: any) => ap.users) || [];

      return {
        id: conv.id,
        type: conv.type,
        name: conv.name,
        avatar_url: conv.avatar_url,
        created_at: conv.created_at,
        last_message_at: conv.last_message_at,
        participants
      };
    }) || [];

    res.json({ conversations });
  } catch (error: any) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

export default router;
