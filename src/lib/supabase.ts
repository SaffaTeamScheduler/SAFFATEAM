import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseKey ? 'Set' : 'Missing');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  }
);

export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          nama: string;
          role: 'admin' | 'user';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nama?: string;
          role?: 'admin' | 'user';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nama?: string;
          role?: 'admin' | 'user';
          updated_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          name: string;
          start_date: string | null;
          end_date: string | null;
          status: 'Not Started' | 'Ongoing' | 'Completed';
          user_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          start_date?: string | null;
          end_date?: string | null;
          status?: 'Not Started' | 'Ongoing' | 'Completed';
          user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          start_date?: string | null;
          end_date?: string | null;
          status?: 'Not Started' | 'Ongoing' | 'Completed';
          updated_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          title: string;
          project_id: string | null;
          due_date: string | null;
          status: 'Not Started' | 'Ongoing' | 'Completed';
          assigned_to: string | null;
          progress: number;
          user_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          project_id?: string | null;
          due_date?: string | null;
          status?: 'Not Started' | 'Ongoing' | 'Completed';
          assigned_to?: string | null;
          progress?: number;
          user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          project_id?: string | null;
          due_date?: string | null;
          status?: 'Not Started' | 'Ongoing' | 'Completed';
          assigned_to?: string | null;
          progress?: number;
          updated_at?: string;
        };
      };
      calendar_notes: {
        Row: {
          id: string;
          user_id: string | null;
          note_date: string;
          note: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          note_date: string;
          note: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          note?: string;
          updated_at?: string;
        };
      };
      content_log: {
        Row: {
          id: string;
          user_id: string | null;
          log_date: string;
          content_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          log_date: string;
          content_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          content_count?: number;
          updated_at?: string;
        };
      };
      live_log: {
        Row: {
          id: string;
          user_id: string | null;
          log_date: string;
          start_time: string | null;
          end_time: string | null;
          total_hours: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          log_date: string;
          start_time?: string | null;
          end_time?: string | null;
          total_hours?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          start_time?: string | null;
          end_time?: string | null;
          total_hours?: number;
          updated_at?: string;
        };
      };
      live_manual_log: {
        Row: {
          id: string;
          user_id: string | null;
          host_name: string;
          live_date: string;
          total_hours: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          host_name: string;
          live_date: string;
          total_hours: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          host_name?: string;
          live_date?: string;
          total_hours?: number;
          updated_at?: string;
        };
      };
      templates: {
        Row: {
          id: string;
          title: string;
          category: 'Product' | 'Daily' | 'General';
          type: 'image' | 'pdf';
          file_url: string | null;
          uploaded_by: string | null;
          uploaded_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          category: 'Product' | 'Daily' | 'General';
          type: 'image' | 'pdf';
          file_url?: string | null;
          uploaded_by?: string | null;
          uploaded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          category?: 'Product' | 'Daily' | 'General';
          type?: 'image' | 'pdf';
          file_url?: string | null;
          updated_at?: string;
        };
      };
      activity_log: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          log_timestamp: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          action: string;
          log_timestamp?: string;
        };
        Update: {
          id?: string;
          action?: string;
        };
      };
    };
  };
};