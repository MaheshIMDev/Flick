import { Request, Response, NextFunction } from 'express';
import { supabase } from '../utils/supabaseClient';

export interface AuthenticatedRequest extends Request {
  user?: any;
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ No authorization header or invalid format');
      return res.status(401).json({ error: 'Unauthorized - No token provided' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    console.log('🔍 Authenticating token:', token.substring(0, 20) + '...');

    // Verify token with Supabase
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      console.error('❌ Token verification failed:', error?.message);
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }

    console.log('✅ Token verified for user:', data.user.email);

    // Attach user to request
    req.user = data.user;
    next();
  } catch (error: any) {
    console.error('❌ Auth middleware error:', error);
    res.status(401).json({ error: 'Unauthorized' });
  }
};
