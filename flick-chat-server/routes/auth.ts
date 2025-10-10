import { Router } from 'express';
import { supabase } from '../utils/supabaseClient';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import crypto from 'crypto';

const router = Router();

// Generate placeholder keys
function generatePlaceholderKeys() {
  return {
    identity_public_key: crypto.randomBytes(32).toString('base64'),
    signed_prekey_id: 1,
    signed_prekey_public: crypto.randomBytes(32).toString('base64'),
    signed_prekey_signature: crypto.randomBytes(64).toString('base64'),
  };
}

// ==================== SIGNUP ====================
router.post('/signup', async (req, res) => {
  try {
    const { email, password, username, display_name } = req.body;

    // Validation
    if (!email || !password || !username) {
      return res.status(400).json({ 
        error: 'Email, password, and username are required' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'Password must be at least 6 characters' 
      });
    }

    console.log('📝 Signup attempt:', email, username);

    // Check username exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('username')
      .eq('username', username)
      .maybeSingle();

    if (existingUser) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError || !authData.user) {
      console.error('❌ Auth error:', authError);
      return res.status(400).json({ error: authError?.message || 'Signup failed' });
    }

    console.log('✅ Auth user created:', authData.user.id);

    // Generate keys
    const keys = generatePlaceholderKeys();

    // Create profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: authData.user.email,
        username: username,
        display_name: display_name || username,
        ...keys,
        avatar_url: null,
        bio: null,
        phone_number: null,
        theme_preference: 'system',
        status: 'available',
        status_message: 'Hey there! I am using SecureChat',
        is_online: true,
        is_phone_verified: false,
        allow_unknown_contacts: false,
        message_preview_enabled: true,
        read_receipts_enabled: true,
        typing_indicators_enabled: true,
        last_seen_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (profileError) {
      console.error('❌ Profile error:', profileError);
      await supabase.auth.admin.deleteUser(authData.user.id);
      return res.status(500).json({ error: 'Failed to create profile' });
    }

    console.log('✅ Profile created:', profile.email);
    console.log('✅ Signup successful for:', email);

    // Return success with session
    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: authData.user,
      session: authData.session,
      access_token: authData.session?.access_token,
      refresh_token: authData.session?.refresh_token,
    });

  } catch (error: any) {
    console.error('❌ Signup error:', error);
    res.status(500).json({ error: 'Signup failed' });
  }
});

// ==================== LOGIN ====================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    console.log('🔐 Login attempt:', email);

    // Authenticate
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user || !authData.session) {
      console.error('❌ Login failed:', authError);
      return res.status(401).json({ error: authError?.message || 'Invalid credentials' });
    }

    console.log('✅ Auth successful:', email);

    // Get profile
    let { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (profileError) {
      console.error('❌ Profile fetch error:', profileError);
      return res.status(500).json({ error: 'Profile fetch failed' });
    }

    // Create profile if missing
    if (!profile) {
      console.log('⚠️ Profile missing, creating...');
      
      const keys = generatePlaceholderKeys();
      
      const { data: newProfile, error: createError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: authData.user.email,
          username: authData.user.email?.split('@')[0] || 'user',
          display_name: authData.user.email?.split('@')[0] || 'User',
          ...keys,
          status: 'available',
          is_online: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Profile creation failed:', createError);
        return res.status(500).json({ error: 'Failed to create profile' });
      }

      profile = newProfile;
    } else {
      // Update online status
      await supabase
        .from('users')
        .update({
          is_online: true,
          last_seen_at: new Date().toISOString(),
        })
        .eq('id', authData.user.id);
    }

    console.log('✅ Login successful for:', email);

    res.json({
      success: true,
      message: 'Login successful',
      user: authData.user,
      session: authData.session,
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
    });

  } catch (error: any) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ==================== GET PROFILE ====================
router.get('/profile', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('🔍 Fetching profile:', userId);

    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('❌ Profile fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch profile' });
    }

    if (!profile) {
      console.log('⚠️ Profile not found');
      return res.status(404).json({ error: 'Profile not found' });
    }

    console.log('✅ Profile found:', profile.email);
    res.json(profile);

  } catch (error: any) {
    console.error('❌ Profile error:', error);
    res.status(500).json({ error: 'Profile fetch failed' });
  }
});

// ==================== LOGOUT ====================
router.post('/logout', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;

    if (userId) {
      await supabase
        .from('users')
        .update({
          is_online: false,
          last_seen_at: new Date().toISOString(),
        })
        .eq('id', userId);
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('❌ Logout error:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ Logout successful:', userId);
    res.json({ success: true, message: 'Logged out successfully' });

  } catch (error: any) {
    console.error('❌ Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

export default router;
