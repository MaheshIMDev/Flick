'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ActiveCall {
  friendId: string;
  friendName: string;
  conversationId: string;
  callType: 'audio' | 'video';
  callStartTime: number | null;
  isCallActive: boolean;
  timestamp: number;
}

interface ActiveCallStore {
  activeCall: ActiveCall | null;
  setActiveCall: (call: ActiveCall | null) => void;
  clearActiveCall: () => void;
  isCallStale: () => boolean;
}

export const useActiveCallStore = create<ActiveCallStore>()(
  persist(
    (set, get) => ({
      activeCall: null,
      
      setActiveCall: (call) => {
        if (call) {
          set({ activeCall: { ...call, timestamp: Date.now() } });
        } else {
          set({ activeCall: null });
        }
      },
      
      clearActiveCall: () => set({ activeCall: null }),
      
      isCallStale: () => {
        const call = get().activeCall;
        if (!call) return true;
        
        const age = Date.now() - call.timestamp;
        return age > 120000;
      },
    }),
    {
      name: 'active-call-storage',
    }
  )
);
