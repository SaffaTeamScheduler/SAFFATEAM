import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface UseRealTimeSyncProps {
  table: string;
  onUpdate: () => void;
  filter?: string;
}

export function useRealTimeSync({ table, onUpdate, filter }: UseRealTimeSyncProps) {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`realtime-${table}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          filter: filter || `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log(`Real-time update for ${table}:`, payload);
          onUpdate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, table, onUpdate, filter]);
}