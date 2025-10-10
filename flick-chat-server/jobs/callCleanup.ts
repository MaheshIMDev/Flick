import { supabase } from '../utils/supabaseClient';

// Run this every minute to mark old ringing calls as missed
export async function markMissedCalls() {
  try {
    const sixtySecondsAgo = new Date(Date.now() - 60000);
    
    const { data: missedCalls, error } = await supabase
      .from('call_sessions')
      .select('id, caller_id, callee_id')
      .eq('call_status', 'ringing')
      .lt('initiated_at', sixtySecondsAgo.toISOString());
    
    if (error) {
      console.error('❌ Error fetching missed calls:', error);
      return;
    }
    
    if (missedCalls && missedCalls.length > 0) {
      const { error: updateError } = await supabase
        .from('call_sessions')
        .update({
          ended_at: new Date().toISOString(),
          call_status: 'missed',
          end_reason: 'no_answer',
          duration_seconds: null
        })
        .in('id', missedCalls.map(c => c.id));
      
      if (updateError) {
        console.error('❌ Error updating missed calls:', error);
      } else {
        console.log(`⏰ Marked ${missedCalls.length} calls as missed`);
      }
    }
  } catch (error) {
    console.error('❌ Missed call cleanup error:', error);
  }
}

// Start the cleanup job
export function startCallCleanupJob() {
  // Run every 60 seconds
  setInterval(markMissedCalls, 60000);
  console.log('✅ Call cleanup job started');
}
