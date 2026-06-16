
CREATE POLICY "Open audio read" ON storage.objects FOR SELECT USING (bucket_id = 'audio');
CREATE POLICY "Open audio insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'audio');
CREATE POLICY "Open audio update" ON storage.objects FOR UPDATE USING (bucket_id = 'audio');
CREATE POLICY "Open audio delete" ON storage.objects FOR DELETE USING (bucket_id = 'audio');
