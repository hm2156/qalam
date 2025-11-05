-- Enable Row Level Security on articles table (if not already enabled)
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to insert their own articles
CREATE POLICY "Users can insert their own articles"
ON articles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = author_id);

-- Policy: Users can view their own articles and all published articles
CREATE POLICY "Users can view published articles and their own"
ON articles
FOR SELECT
TO authenticated
USING (auth.uid() = author_id OR status = 'published');

-- Policy: Users can update their own articles
CREATE POLICY "Users can update their own articles"
ON articles
FOR UPDATE
TO authenticated
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);

-- Policy: Users can delete their own articles (optional)
CREATE POLICY "Users can delete their own articles"
ON articles
FOR DELETE
TO authenticated
USING (auth.uid() = author_id);

-- Policy: Allow public to view published articles (for unauthenticated users)
CREATE POLICY "Public can view published articles"
ON articles
FOR SELECT
TO anon
USING (status = 'published');

