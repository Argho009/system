-- Allow authenticated users to upload to the archives/ path in upload-files bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('upload-files', 'upload-files', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow any authenticated user to upload to archives/ folder
CREATE POLICY "Allow authenticated upload to archives"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'upload-files'
    AND (storage.foldername(name))[1] = 'archives'
  );

-- Allow public read access for archives (so download links work)
CREATE POLICY "Allow public read of archives"
  ON storage.objects FOR SELECT
  TO public
  USING (
    bucket_id = 'upload-files'
    AND (storage.foldername(name))[1] = 'archives'
  );

-- Allow authenticated users to update/overwrite archives
CREATE POLICY "Allow authenticated update of archives"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'upload-files'
    AND (storage.foldername(name))[1] = 'archives'
  );
