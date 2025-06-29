/*
  # Complete Schema Setup for Saffa Team Scheduler

  1. New Tables
    - `projects` (renamed from projek for consistency)
    - `tasks` (renamed from tugasan for consistency) 
    - `calendar_notes` (renamed from nota_kalendar for consistency)
    - `content_log` (already exists, ensure proper structure)
    - `live_log` (already exists, ensure proper structure)
    - `templates` (already exists, ensure proper structure)
    - `activity_log` (renamed from aktiviti_log for consistency)

  2. Security
    - Enable RLS on all tables
    - Add policies for user data isolation
    - Admin access policies

  3. Performance
    - Add indexes for frequently queried columns
*/

-- Create projects table (renamed from projek for consistency)
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  start_date date,
  end_date date,
  status text DEFAULT 'Not Started' CHECK (status IN ('Not Started', 'Ongoing', 'Completed')),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create tasks table (renamed from tugasan for consistency)
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  due_date date,
  status text DEFAULT 'Not Started' CHECK (status IN ('Not Started', 'Ongoing', 'Completed')),
  assigned_to uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create calendar_notes table (renamed from nota_kalendar for consistency)
CREATE TABLE IF NOT EXISTS calendar_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  note_date date NOT NULL,
  note text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Update existing content_log table structure if needed
DO $$
BEGIN
  -- Check if content_log exists and update if necessary
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'content_log') THEN
    -- Ensure proper column names and constraints
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_log' AND column_name = 'content_count') THEN
      ALTER TABLE content_log RENAME COLUMN jumlah_content TO content_count;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_log' AND column_name = 'log_date') THEN
      ALTER TABLE content_log RENAME COLUMN tarikh TO log_date;
    END IF;
  ELSE
    -- Create content_log table if it doesn't exist
    CREATE TABLE content_log (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
      log_date date NOT NULL,
      content_count integer DEFAULT 0,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
  END IF;
END $$;

-- Update existing live_log table structure if needed
DO $$
BEGIN
  -- Check if live_log exists and update if necessary
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'live_log') THEN
    -- Ensure proper column names
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'live_log' AND column_name = 'log_date') THEN
      ALTER TABLE live_log RENAME COLUMN tarikh TO log_date;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'live_log' AND column_name = 'start_time') THEN
      ALTER TABLE live_log RENAME COLUMN masa_mula TO start_time;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'live_log' AND column_name = 'end_time') THEN
      ALTER TABLE live_log RENAME COLUMN masa_tamat TO end_time;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'live_log' AND column_name = 'total_hours') THEN
      ALTER TABLE live_log RENAME COLUMN jumlah_jam TO total_hours;
    END IF;
  ELSE
    -- Create live_log table if it doesn't exist
    CREATE TABLE live_log (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
      log_date date NOT NULL,
      start_time time,
      end_time time,
      total_hours numeric DEFAULT 0,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
  END IF;
END $$;

-- Update existing templates table structure if needed
DO $$
BEGIN
  -- Check if templates exists and update if necessary
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'templates') THEN
    -- Ensure proper column names
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'templates' AND column_name = 'title') THEN
      ALTER TABLE templates RENAME COLUMN tajuk TO title;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'templates' AND column_name = 'category') THEN
      ALTER TABLE templates RENAME COLUMN kategori TO category;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'templates' AND column_name = 'type') THEN
      ALTER TABLE templates RENAME COLUMN jenis TO type;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'templates' AND column_name = 'file_url') THEN
      ALTER TABLE templates RENAME COLUMN fail_url TO file_url;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'templates' AND column_name = 'uploaded_by') THEN
      ALTER TABLE templates RENAME COLUMN dimuat_naik_oleh TO uploaded_by;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'templates' AND column_name = 'uploaded_at') THEN
      ALTER TABLE templates RENAME COLUMN tarikh TO uploaded_at;
    END IF;
  ELSE
    -- Create templates table if it doesn't exist
    CREATE TABLE templates (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      title text NOT NULL,
      category text NOT NULL CHECK (category IN ('Product', 'Daily', 'General')),
      type text NOT NULL CHECK (type IN ('image', 'pdf')),
      file_url text,
      uploaded_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
      uploaded_at date DEFAULT CURRENT_DATE,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
  END IF;
END $$;

-- Create activity_log table (renamed from aktiviti_log for consistency)
CREATE TABLE IF NOT EXISTS activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  action text NOT NULL,
  log_timestamp timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_calendar_notes_user_id ON calendar_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_notes_date ON calendar_notes(note_date);
CREATE INDEX IF NOT EXISTS idx_content_log_user_id ON content_log(user_id);
CREATE INDEX IF NOT EXISTS idx_content_log_date ON content_log(log_date);
CREATE INDEX IF NOT EXISTS idx_live_log_user_id ON live_log(user_id);
CREATE INDEX IF NOT EXISTS idx_live_log_date ON live_log(log_date);
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);

-- Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can manage own projects" ON projects;
DROP POLICY IF EXISTS "Admins can manage all projects" ON projects;
DROP POLICY IF EXISTS "Users can manage own tasks" ON tasks;
DROP POLICY IF EXISTS "Admins can manage all tasks" ON tasks;
DROP POLICY IF EXISTS "Users can manage own calendar notes" ON calendar_notes;
DROP POLICY IF EXISTS "Admins can read all calendar notes" ON calendar_notes;
DROP POLICY IF EXISTS "Users can manage own content logs" ON content_log;
DROP POLICY IF EXISTS "Admins can read all content logs" ON content_log;
DROP POLICY IF EXISTS "Users can manage own live logs" ON live_log;
DROP POLICY IF EXISTS "Admins can read all live logs" ON live_log;
DROP POLICY IF EXISTS "Users can read all templates" ON templates;
DROP POLICY IF EXISTS "Admins can manage all templates" ON templates;
DROP POLICY IF EXISTS "Users can read own activity logs" ON activity_log;
DROP POLICY IF EXISTS "All users can insert activity logs" ON activity_log;
DROP POLICY IF EXISTS "Admins can read all activity logs" ON activity_log;

-- RLS Policies for projects
CREATE POLICY "Users can manage own projects"
  ON projects FOR ALL TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all projects"
  ON projects FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for tasks
CREATE POLICY "Users can manage own tasks"
  ON tasks FOR ALL TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = assigned_to);

CREATE POLICY "Admins can manage all tasks"
  ON tasks FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for calendar_notes
CREATE POLICY "Users can manage own calendar notes"
  ON calendar_notes FOR ALL TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all calendar notes"
  ON calendar_notes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for content_log
CREATE POLICY "Users can manage own content logs"
  ON content_log FOR ALL TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all content logs"
  ON content_log FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for live_log
CREATE POLICY "Users can manage own live logs"
  ON live_log FOR ALL TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all live logs"
  ON live_log FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for templates
CREATE POLICY "Users can read all templates"
  ON templates FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage all templates"
  ON templates FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for activity_log
CREATE POLICY "Users can read own activity logs"
  ON activity_log FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "All users can insert activity logs"
  ON activity_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read all activity logs"
  ON activity_log FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );