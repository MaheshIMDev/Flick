import express from 'express';
import { supabase } from '@/utils/supabaseClient';
import { authenticateToken, AuthenticatedRequest } from '@/middleware/auth';

const router = express.Router();

// Get user's groups
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { data, error } = await supabase
      .from('conversation_participants')
      .select(`
        conversation:conversations(
          id,
          type,
          name,
          description,
          avatar_url,
          message_count,
          last_message_at,
          created_at
        )
      `)
      .eq('user_id', req.user.id)
      .eq('is_active', true);

    if (error) throw error;

    // Filter only group conversations and sort
    const groups = data
      ?.map((p: any) => p.conversation)
      .filter((c: any) => c && c.type === 'group')
      .sort((a: any, b: any) => {
        // Sort by last_message_at descending (newest first)
        const dateA = new Date(a.last_message_at || a.created_at).getTime();
        const dateB = new Date(b.last_message_at || b.created_at).getTime();
        return dateB - dateA;
      }) || [];

    res.json({ groups });
  } catch (error) {
    console.error('Fetch groups error:', error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// Create group
router.post('/create', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const { name, description, member_ids = [] } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Group name required' });
  }

  try {
    // Create conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({
        type: 'group',
        name,
        description,
        created_by_user_id: req.user.id,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (convError) throw convError;

    // Add creator as owner
    const participants = [
      {
        conversation_id: conversation.id,
        user_id: req.user.id,
        role: 'owner',
        can_add_participants: true,
        can_remove_participants: true,
        can_edit_group_info: true,
        can_delete_messages: true,
        joined_at: new Date().toISOString(),
      },
    ];

    // Add other members
    member_ids.forEach((memberId: string) => {
      if (memberId !== req.user.id) {
        participants.push({
          conversation_id: conversation.id,
          user_id: memberId,
          role: 'member',
          can_add_participants: false,
          can_remove_participants: false,
          can_edit_group_info: false,
          can_delete_messages: false,
          joined_at: new Date().toISOString(),
        });
      }
    });

    await supabase.from('conversation_participants').insert(participants);

    res.json({ message: 'Group created!', group: conversation });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ error: 'Failed to create group' });
  }
});

export default router;
