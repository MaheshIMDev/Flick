import { Socket } from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';
import { supabase } from '../utils/supabaseClient';

export interface AuthenticatedSocket extends Socket {
  data: {
    userId: string;
    userEmail: string;
  };
}

export async function authenticateSocket(
  socket: Socket,
  next: (err?: ExtendedError) => void
) {
  const token = socket.handshake.auth.token;

  if (!token) {
    console.error('❌ No token provided');
    return next(new Error('Authentication token required'));
  }

  try {
    // Verify Supabase token
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error('❌ Invalid token:', error?.message);
      return next(new Error('Invalid or expired token'));
    }

    console.log('✅ Socket authenticated:', user.email);

    (socket as AuthenticatedSocket).data = {
      userId: user.id,
      userEmail: user.email || '',
    };

    next();
  } catch (error: any) {
    console.error('❌ Socket authentication error:', error.message);
    next(new Error('Authentication failed'));
  }
}
