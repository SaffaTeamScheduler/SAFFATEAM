/*
  # Initial Schema for Saffa Team Scheduler

  1. New Tables
    - `user_profiles` - User profile information with roles
    - `projek` - Project management
    - `tugasan` - Task management  
    - `nota_kalendar` - Calendar notes
    - `content_log` - Daily content tracking
    - `live_log` - Live streaming hours tracking
    - `templates` - Template library
    - `aktiviti_log` - User activity logging

  2. Security
    - Enable RLS on all tables
    - Add policies for role-based access control
    - Admin can access all data, users can only access their own data

  3. Indexes
    - Add indexes for frequently queried columns
    - Foreign key constraints with proper relationships
*/

-- User Profiles Table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT auth.uid(),
  nama text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Projects Table
CREATE TABLE IF NOT EXISTS projek (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama text NOT NULL,
  tarikh_mula date,
  tarikh_tamat date,
  status text NOT NULL DEFAULT 'Belum Mula' CHECK (status IN ('Belum Mula', 'Sedang Berjalan', 'Siap')),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tasks Table
CREATE TABLE IF NOT EXISTS tugasan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tajuk text NOT NULL,
  projek_id uuid REFERENCES projek(id) ON DELETE CASCADE,
  tarikh_tamat date,
  status text NOT NULL DEFAULT 'Belum Mula' CHECK (status IN ('Belum Mula', 'Sedang Berjalan', 'Siap')),
  ditugaskan_kepada uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  kemajuan integer DEFAULT 0 CHECK (kemajuan >= 0 AND kemajuan <= 100),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Calendar Notes Table
CREATE TABLE IF NOT EXISTS nota_kalendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  tarikh date NOT NULL,
  catatan text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Content Log Table
CREATE TABLE IF NOT EXISTS content_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  tarikh date NOT NULL,
  jumlah_content integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Live Log Table
CREATE TABLE IF NOT EXISTS live_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  tarikh date NOT NULL,
  masa_mula time,
  masa_tamat time,
  jumlah_jam decimal DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Templates Table
CREATE TABLE IF NOT EXISTS templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tajuk text NOT NULL,
  kategori text NOT NULL CHECK (kategori IN ('Produk', 'Harian', 'Umum')),
  jenis text NOT NULL CHECK (jenis IN ('image', 'pdf')),
  fail_url text,
  dimuat_naik_oleh uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  tarikh date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Activity Log Table
CREATE TABLE IF NOT EXISTS aktiviti_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  aksi text NOT NULL,
  waktu timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projek ENABLE ROW LEVEL SECURITY;
ALTER TABLE tugasan ENABLE ROW LEVEL SECURITY;
ALTER TABLE nota_kalendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE aktiviti_log ENABLE ROW LEVEL SECURITY;

-- Policies for user_profiles
CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policies for projek
CREATE POLICY "Users can manage own projects"
  ON projek FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all projects"
  ON projek FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policies for tugasan
CREATE POLICY "Users can manage own tasks"
  ON tugasan FOR ALL
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = ditugaskan_kepada);

CREATE POLICY "Admins can manage all tasks"
  ON tugasan FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policies for nota_kalendar
CREATE POLICY "Users can manage own calendar notes"
  ON nota_kalendar FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all calendar notes"
  ON nota_kalendar FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policies for content_log
CREATE POLICY "Users can manage own content logs"
  ON content_log FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all content logs"
  ON content_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policies for live_log
CREATE POLICY "Users can manage own live logs"
  ON live_log FOR ALL
  To authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all live logs"
  ON live_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policies for templates
CREATE POLICY "Users can read all templates"
  ON templates FOR SELECT
  TO authenticated;

CREATE POLICY "Admins can manage all templates"
  ON templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policies for aktiviti_log
CREATE POLICY "Users can read own activity logs"
  ON aktiviti_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all activity logs"
  ON aktiviti_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "All users can insert activity logs"
  ON aktiviti_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projek_user_id ON projek(user_id);
CREATE INDEX IF NOT EXISTS idx_tugasan_user_id ON tugasan(user_id);
CREATE INDEX IF NOT EXISTS idx_tugasan_projek_id ON tugasan(projek_id);
CREATE INDEX IF NOT EXISTS idx_tugasan_ditugaskan_kepada ON tugasan(ditugaskan_kepada);
CREATE INDEX IF NOT EXISTS idx_nota_kalendar_user_id ON nota_kalendar(user_id);
CREATE INDEX IF NOT EXISTS idx_nota_kalendar_tarikh ON nota_kalendar(tarikh);
CREATE INDEX IF NOT EXISTS idx_content_log_user_id ON content_log(user_id);
CREATE INDEX IF NOT EXISTS idx_content_log_tarikh ON content_log(tarikh);
CREATE INDEX IF NOT EXISTS idx_live_log_user_id ON live_log(user_id);
CREATE INDEX IF NOT EXISTS idx_live_log_tarikh ON live_log(tarikh);
CREATE INDEX IF NOT EXISTS idx_templates_kategori ON templates(kategori);
CREATE INDEX IF NOT EXISTS idx_aktiviti_log_user_id ON aktiviti_log(user_id);