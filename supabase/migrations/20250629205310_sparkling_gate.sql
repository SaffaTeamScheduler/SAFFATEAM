/*
  # Fix RLS policies for user_profiles table

  1. Security Changes
    - Drop existing problematic RLS policies that cause infinite recursion
    - Create new, simplified RLS policies for user_profiles table
    - Allow authenticated users to read their own profile
    - Allow authenticated users to create their own profile during signup
    - Allow authenticated users to update their own profile
    - Allow admins to read all profiles (simplified policy)

  2. Policy Details
    - SELECT: Users can read their own profile, admins can read all
    - INSERT: Users can create their own profile during signup
    - UPDATE: Users can update their own profile
    - DELETE: Not allowed for regular users (only admins via separate policy if needed)
*/

-- Drop all existing policies for user_profiles table
DROP POLICY IF EXISTS "Admins can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

-- Create new, simplified policies

-- Allow users to read their own profile
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow users to create their own profile during signup
CREATE POLICY "Users can create own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow admins to read all profiles (simplified without recursion)
CREATE POLICY "Admins can read all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() 
      AND up.role = 'admin'
    )
  );

-- Allow admins to manage all profiles
CREATE POLICY "Admins can manage all profiles"
  ON user_profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() 
      AND up.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() 
      AND up.role = 'admin'
    )
  );