export interface User {
    id: string;
    email: string;
    username: string;
    display_name: string;
    avatar_url?: string;
    bio?: string;
    theme_preference: 'light' | 'dark' | 'system';
    status: 'available' | 'busy' | 'away' | 'invisible';
    is_online: boolean;
    created_at: string;
  }
  
  export interface Session {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  }
  
  export interface AuthResponse {
    user: User;
    session: Session | null;
    message?: string;
  }
  