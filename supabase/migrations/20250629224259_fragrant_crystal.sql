/*
  # Update RLS policies for admin access

  1. Policy Updates
    - Add admin bypass policies for all tables
    - Maintain user data isolation for regular users
    - Allow admins to see all data across the system

  2. Security
    - Admin role check using user_profiles table
    - Proper RLS policies for multi-user access
*/

-- Drop existing policies and recreate with admin support

-- Projects table
DROP POLICY IF EXISTS "Users can manage own projects" ON projects;
CREATE POLICY "Users can manage own projects"
  ON projects FOR ALL TO authenticated
  USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Tasks table
DROP POLICY IF EXISTS "Users can manage own tasks" ON tasks;
CREATE POLICY "Users can manage own tasks"
  ON tasks FOR ALL TO authenticated
  USING (
    auth.uid() = user_id OR 
    auth.uid() = assigned_to OR
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    auth.uid() = user_id OR 
    auth.uid() = assigned_to OR
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Calendar notes table
DROP POLICY IF EXISTS "Users can manage own calendar notes" ON calendar_notes;
CREATE POLICY "Users can manage own calendar notes"
  ON calendar_notes FOR ALL TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Content log table
DROP POLICY IF EXISTS "Users can manage own content logs" ON content_log;
CREATE POLICY "Users can manage own content logs"
  ON content_log FOR ALL TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Live manual log table
DROP POLICY IF EXISTS "Users can manage own live manual logs" ON live_manual_log;
CREATE POLICY "Users can manage own live manual logs"
  ON live_manual_log FOR ALL TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Templates table
DROP POLICY IF EXISTS "Users can manage own templates" ON templates;
DROP POLICY IF EXISTS "Users can read all templates" ON templates;

CREATE POLICY "Users can read all templates"
  ON templates FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can manage own templates"
  ON templates FOR ALL TO authenticated
  USING (
    auth.uid() = uploaded_by OR
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    auth.uid() = uploaded_by OR
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Activity log table
DROP POLICY IF EXISTS "Users can read own activity logs" ON activity_log;
DROP POLICY IF EXISTS "Users can insert own activity logs" ON activity_log;

CREATE POLICY "Users can read own activity logs"
  ON activity_log FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can insert own activity logs"
  ON activity_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);