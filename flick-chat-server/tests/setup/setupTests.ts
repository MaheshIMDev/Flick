import { supabase } from '@/utils/supabaseClient';

// Global test setup
beforeAll(async () => {
  console.log('🧪 Starting test suite...');
});

afterAll(async () => {
  console.log('✅ Test suite complete');
});

// Helper to clean up test data
export async function cleanupTestData(emails?: string[]) {
  try {
    if (emails && emails.length > 0) {
      // Delete specific test users
      const { data: testUsers } = await supabase
        .from('users')
        .select('id')
        .in('email', emails);

      if (testUsers && testUsers.length > 0) {
        const userIds = testUsers.map(u => u.id);
        
        // Clean up related data
        await supabase.from('user_connections').delete().in('user_id', userIds);
        await supabase.from('friend_requests').delete().in('sender_id', userIds);
        await supabase.from('qr_code_sessions').delete().in('user_id', userIds);
        await supabase.from('conversation_participants').delete().in('user_id', userIds);
        await supabase.from('user_prekeys').delete().in('user_id', userIds);
        
        // Delete auth users (this will cascade delete users table)
        for (const userId of userIds) {
          try {
            await supabase.auth.admin.deleteUser(userId);
          } catch (error) {
            console.log(`Could not delete user ${userId}:`, error);
          }
        }
      }
    }
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}
