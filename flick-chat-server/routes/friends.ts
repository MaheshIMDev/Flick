import express from 'express';
import { supabase } from '../utils/supabaseClient';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { randomBytes } from 'crypto';

const router = express.Router();

// ==================== SEARCH USERS ====================
router.get('/search', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const { query } = req.query;
  
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Search query required' });
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, display_name, avatar_url, email, is_online')
      .or(`username.ilike.%${query}%,email.ilike.%${query}%,display_name.ilike.%${query}%`)
      .neq('id', req.user.id)
      .limit(20);

    if (error) throw error;

    res.json({ users: data || [] });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// ==================== GENERATE QR CODE ====================
router.post('/qr/generate', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const { max_uses = 1, expires_in_minutes = 60 } = req.body;

  try {
    // Generate unique QR value
    const qr_code_value = `SCHAT_${req.user.id}_${randomBytes(16).toString('hex')}`;
    
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expires_in_minutes);

    // Deactivate old QR codes
    await supabase
      .from('qr_code_sessions')
      .update({ is_active: false })
      .eq('user_id', req.user.id)
      .eq('is_active', true);

    // Insert new QR session
    const { data, error } = await supabase
      .from('qr_code_sessions')
      .insert({
        user_id: req.user.id,
        qr_code_value,
        qr_type: 'friend_add',
        max_uses,
        current_uses: 0,
        expires_at: expiresAt.toISOString(),
        is_active: true,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      qr_code: qr_code_value,
      qr_session_id: data.id,
      expires_at: data.expires_at,
      max_uses: data.max_uses,
    });
  } catch (error) {
    console.error('QR generation error:', error);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// ==================== SCAN QR CODE ====================
router.post('/qr/scan', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const { qr_code_value } = req.body;

  if (!qr_code_value) {
    return res.status(400).json({ error: 'QR code value required' });
  }

  try {
    // Fetch QR session
    const { data: qrSession, error: qrError } = await supabase
      .from('qr_code_sessions')
      .select('*, users!qr_code_sessions_user_id_fkey(id, username, display_name, avatar_url)')
      .eq('qr_code_value', qr_code_value)
      .eq('is_active', true)
      .single();

    if (qrError || !qrSession) {
      return res.status(404).json({ error: 'Invalid or expired QR code' });
    }

    // Check expiration
    if (new Date(qrSession.expires_at) < new Date()) {
      await supabase
        .from('qr_code_sessions')
        .update({ is_active: false })
        .eq('id', qrSession.id);
      return res.status(400).json({ error: 'QR code has expired' });
    }

    // Check max uses
    if (qrSession.current_uses >= qrSession.max_uses) {
      await supabase
        .from('qr_code_sessions')
        .update({ is_active: false })
        .eq('id', qrSession.id);
      return res.status(400).json({ error: 'QR code has reached maximum uses' });
    }

    // Check if already friends
    const { data: existing } = await supabase
      .from('user_connections')
      .select('*')
      .or(`and(user_id.eq.${req.user.id},connected_user_id.eq.${qrSession.user_id}),and(user_id.eq.${qrSession.user_id},connected_user_id.eq.${req.user.id})`)
      .eq('connection_type', 'friend')
      .eq('status', 'active')
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Already friends with this user' });
    }

    // Create bidirectional connection
    await supabase.from('user_connections').insert([
      {
        user_id: req.user.id,
        connected_user_id: qrSession.user_id,
        connection_type: 'friend',
        status: 'active',
        connection_method: 'qr_code',
        connected_at: new Date().toISOString(),
      },
      {
        user_id: qrSession.user_id,
        connected_user_id: req.user.id,
        connection_type: 'friend',
        status: 'active',
        connection_method: 'qr_code',
        connected_at: new Date().toISOString(),
      },
    ]);

    // Create 1:1 conversation
    const { data: conversation } = await supabase
      .from('conversations')
      .insert({
        type: 'direct',
        created_by_user_id: req.user.id,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (conversation) {
      await supabase.from('conversation_participants').insert([
        {
          conversation_id: conversation.id,
          user_id: req.user.id,
          role: 'member',
          joined_at: new Date().toISOString(),
        },
        {
          conversation_id: conversation.id,
          user_id: qrSession.user_id,
          role: 'member',
          joined_at: new Date().toISOString(),
        },
      ]);
    }

    // Update QR usage
    await supabase
      .from('qr_code_sessions')
      .update({
        current_uses: qrSession.current_uses + 1,
        last_scanned_at: new Date().toISOString(),
      })
      .eq('id', qrSession.id);

    res.json({
      message: `Now friends with ${qrSession.users.display_name}!`,
      user: qrSession.users,
      conversation_id: conversation?.id,
    });
  } catch (error) {
    console.error('QR scan error:', error);
    res.status(500).json({ error: 'Failed to scan QR code' });
  }
});

// ==================== GET ALL FRIENDS ====================
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { data, error } = await supabase
      .from('user_connections')
      .select(`
        id,
        connected_at,
        connected_user:users!user_connections_connected_user_id_fkey(
          id, username, display_name, avatar_url, is_online, last_seen_at, status_message, status
        )
      `)
      .eq('user_id', req.user.id)
      .eq('connection_type', 'friend')
      .eq('status', 'active')
      .order('connected_at', { ascending: false });

    if (error) throw error;

    const friends = data.map((conn: any) => conn.connected_user);

    res.json({ friends });
  } catch (error) {
    console.error('Fetch friends error:', error);
    res.status(500).json({ error: 'Failed to fetch friends' });
  }
});

// ==================== SEND FRIEND REQUEST (Fallback) ====================
router.post('/request', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const { recipient_id, message } = req.body;
  
  if (!recipient_id) {
    return res.status(400).json({ error: 'Recipient ID required' });
  }

  try {
    // Check if already connected or pending
    const { data: existing } = await supabase
      .from('friend_requests')
      .select('*')
      .or(`and(sender_id.eq.${req.user.id},recipient_id.eq.${recipient_id}),and(sender_id.eq.${recipient_id},recipient_id.eq.${req.user.id})`)
      .in('status', ['pending', 'accepted'])
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Request already exists or you are already friends' });
    }

    // Create request
    const { error } = await supabase
      .from('friend_requests')
      .insert({
        sender_id: req.user.id,
        recipient_id,
        status: 'pending',
        message,
        connection_method: 'username_search',
        sent_at: new Date().toISOString(),
      });

    if (error) throw error;

    res.json({ message: 'Friend request sent!' });
  } catch (error) {
    console.error('Request error:', error);
    res.status(500).json({ error: 'Failed to send request' });
  }
});

// ==================== GET PENDING REQUESTS ====================
router.get('/requests', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { data, error } = await supabase
      .from('friend_requests')
      .select(`
        id,
        message,
        sent_at,
        connection_method,
        sender:users!friend_requests_sender_id_fkey(id, username, display_name, avatar_url)
      `)
      .eq('recipient_id', req.user.id)
      .eq('status', 'pending')
      .order('sent_at', { ascending: false });

    if (error) throw error;

    res.json({ requests: data || [] });
  } catch (error) {
    console.error('Fetch requests error:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// ==================== ACCEPT REQUEST ====================
router.post('/accept/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;

  try {
    // Get request
    const { data: request, error: fetchError } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('id', id)
      .eq('recipient_id', req.user.id)
      .eq('status', 'pending')
      .single();

    if (fetchError || !request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Update request status
    await supabase
      .from('friend_requests')
      .update({ status: 'accepted', responded_at: new Date().toISOString() })
      .eq('id', id);

    // Create bidirectional connection
    await supabase.from('user_connections').insert([
      {
        user_id: req.user.id,
        connected_user_id: request.sender_id,
        connection_type: 'friend',
        status: 'active',
        connection_method: request.connection_method,
        connected_at: new Date().toISOString(),
      },
      {
        user_id: request.sender_id,
        connected_user_id: req.user.id,
        connection_type: 'friend',
        status: 'active',
        connection_method: request.connection_method,
        connected_at: new Date().toISOString(),
      },
    ]);

    // Create conversation
    const { data: conversation } = await supabase
      .from('conversations')
      .insert({
        type: 'direct',
        created_by_user_id: req.user.id,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (conversation) {
      await supabase.from('conversation_participants').insert([
        {
          conversation_id: conversation.id,
          user_id: req.user.id,
          role: 'member',
          joined_at: new Date().toISOString(),
        },
        {
          conversation_id: conversation.id,
          user_id: request.sender_id,
          role: 'member',
          joined_at: new Date().toISOString(),
        },
      ]);
    }

    res.json({ message: 'Friend request accepted!', conversation_id: conversation?.id });
  } catch (error) {
    console.error('Accept error:', error);
    res.status(500).json({ error: 'Failed to accept request' });
  }
});

// ==================== DECLINE REQUEST ====================
router.delete('/decline/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from('friend_requests')
      .update({ status: 'declined', responded_at: new Date().toISOString() })
      .eq('id', id)
      .eq('recipient_id', req.user.id);

    if (error) throw error;

    res.json({ message: 'Friend request declined' });
  } catch (error) {
    console.error('Decline error:', error);
    res.status(500).json({ error: 'Failed to decline request' });
  }
});

export default router;
