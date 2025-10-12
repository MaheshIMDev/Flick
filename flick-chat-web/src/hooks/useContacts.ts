'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

export interface Contact {
  id: string;
  display_name: string;
  username: string;
  avatar_url?: string;
  is_online: boolean;
  last_seen_at: string;
}

export interface Group {
  id: string;
  name: string;
  avatar_url?: string;
  member_count: number;
}

export function useContacts() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch real friends
        const { data: friendsData } = await api.get('/friends');
        setContacts(friendsData.friends || []);

        // Fetch groups
        const { data: groupsData } = await api.get('/groups');
        setGroups(groupsData.groups || []);
      } catch (error) {
        // Error handled error);
        setContacts([]);
        setGroups([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  return { contacts, groups, loading };
}
