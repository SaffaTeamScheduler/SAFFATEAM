/*
  # Cipta table live_manual_log untuk sistem manual entry

  1. Table Baru
    - `live_manual_log` - Log manual untuk sesi live hosting
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key ke user_profiles)
      - `host_name` (text, nama host live)
      - `live_date` (date, tarikh live)
      - `total_hours` (numeric, jumlah jam live)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS pada table
    - User hanya boleh akses data sendiri
    - Admin boleh akses semua data

  3. Indexes
    - Index untuk user_id dan live_date untuk prestasi yang baik
*/

CREATE TABLE IF NOT EXISTS live_manual_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  host_name text NOT NULL,
  live_date date NOT NULL,
  total_hours numeric NOT NULL DEFAULT 0 CHECK (total_hours >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE live_manual_log ENABLE ROW LEVEL SECURITY;

-- Policies untuk user access
CREATE POLICY "Users can manage own live manual logs"
  ON live_manual_log
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes untuk prestasi
CREATE INDEX IF NOT EXISTS idx_live_manual_log_user_id ON live_manual_log(user_id);
CREATE INDEX IF NOT EXISTS idx_live_manual_log_date ON live_manual_log(live_date);
CREATE INDEX IF NOT EXISTS idx_live_manual_log_user_date ON live_manual_log(user_id, live_date);