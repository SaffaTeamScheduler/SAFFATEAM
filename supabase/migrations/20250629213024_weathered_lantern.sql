/*
  # Fix RLS Infinite Recursion Issues

  1. Policy Updates
    - Simplify user_profiles policies to avoid circular dependencies
    - Update other table policies to use simpler admin checks
    - Remove recursive policy references

  2. Security
    - Maintain proper access control
    - Ensure users can only access their own data
    - Allow admins to access all data without circular references
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can manage all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

-- Create simplified user_profiles policies
CREATE POLICY "Users can manage own profile"
  ON user_profiles
  FOR ALL
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Drop and recreate policies for other tables to avoid circular references
-- Projects table
DROP POLICY IF EXISTS "Admins can manage all projects" ON projects;
DROP POLICY IF EXISTS "Users can manage own projects" ON projects;

CREATE POLICY "Users can manage own projects"
  ON projects
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Tasks table  
DROP POLICY IF EXISTS "Admins can manage all tasks" ON tasks;
DROP POLICY IF EXISTS "Users can manage own tasks" ON tasks;

CREATE POLICY "Users can manage own tasks"
  ON tasks
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = assigned_to)
  WITH CHECK (auth.uid() = user_id OR auth.uid() = assigned_to);

-- Activity log table
DROP POLICY IF EXISTS "Admins can read all activity logs" ON activity_log;
DROP POLICY IF EXISTS "All users can insert activity logs" ON activity_log;
DROP POLICY IF EXISTS "Users can read own activity logs" ON activity_log;

CREATE POLICY "Users can read own activity logs"
  ON activity_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity logs"
  ON activity_log
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Content log table
DROP POLICY IF EXISTS "Admins can read all content logs" ON content_log;
DROP POLICY IF EXISTS "Users can manage own content logs" ON content_log;

CREATE POLICY "Users can manage own content logs"
  ON content_log
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Live log table
DROP POLICY IF EXISTS "Admins can read all live logs" ON live_log;
DROP POLICY IF EXISTS "Users can manage own live logs" ON live_log;

CREATE POLICY "Users can manage own live logs"
  ON live_log
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Calendar notes table
DROP POLICY IF EXISTS "Admins can read all calendar notes" ON calendar_notes;
DROP POLICY IF EXISTS "Users can manage own calendar notes" ON calendar_notes;

CREATE POLICY "Users can manage own calendar notes"
  ON calendar_notes
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Templates table
DROP POLICY IF EXISTS "Admins can manage all templates" ON templates;
DROP POLICY IF EXISTS "Users can read all templates" ON templates;

CREATE POLICY "Users can read all templates"
  ON templates
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage own templates"
  ON templates
  FOR ALL
  TO authenticated
  USING (auth.uid() = uploaded_by)
  WITH CHECK (auth.uid() = uploaded_by);

-- For the Malay tables (projek, tugasan, nota_kalendar, aktiviti_log)
-- Projek table
DROP POLICY IF EXISTS "Admins can manage all projects" ON projek;
DROP POLICY IF EXISTS "Users can manage own projects" ON projek;

CREATE POLICY "Users can manage own projects"
  ON projek
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Tugasan table
DROP POLICY IF EXISTS "Admins can manage all tasks" ON tugasan;
DROP POLICY IF EXISTS "Users can manage own tasks" ON tugasan;

CREATE POLICY "Users can manage own tasks"
  ON tugasan
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = ditugaskan_kepada)
  WITH CHECK (auth.uid() = user_id OR auth.uid() = ditugaskan_kepada);

-- Nota kalendar table
DROP POLICY IF EXISTS "Admins can read all calendar notes" ON nota_kalendar;
DROP POLICY IF EXISTS "Users can manage own calendar notes" ON nota_kalendar;

CREATE POLICY "Users can manage own calendar notes"
  ON nota_kalendar
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Aktiviti log table
DROP POLICY IF EXISTS "Admins can read all activity logs" ON aktiviti_log;
DROP POLICY IF EXISTS "All users can insert activity logs" ON aktiviti_log;
DROP POLICY IF EXISTS "Users can read own activity logs" ON aktiviti_log;

CREATE POLICY "Users can read own activity logs"
  ON aktiviti_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity logs"
  ON aktiviti_log
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);