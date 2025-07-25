/*
  # Create storage bucket for templates

  1. Storage Setup
    - Create 'templates' bucket for file uploads
    - Set public access for downloads
    - Configure file size and type restrictions

  2. Security
    - Allow public read access
    - Restrict uploads to authenticated users
    - File type validation (images and PDFs only)
*/

-- Create templates bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'templates',
  'templates',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to view files
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'templates');

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'templates');

-- Allow users to update their own files
CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own files
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (auth.uid()::text = (storage.foldername(name))[1]);