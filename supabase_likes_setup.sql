-- Create likes/claps table
CREATE TABLE IF NOT EXISTS likes (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, article_id) -- Prevent duplicate likes
);

-- Enable RLS
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all likes
CREATE POLICY "Users can view all likes"
ON likes
FOR SELECT
USING (true);

-- Policy: Users can create their own likes
CREATE POLICY "Users can create their own likes"
ON likes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own likes
CREATE POLICY "Users can delete their own likes"
ON likes
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS likes_user_id_idx ON likes(user_id);
CREATE INDEX IF NOT EXISTS likes_article_id_idx ON likes(article_id);

-- Add like_count column to articles table (optional, for faster queries)
-- We can also calculate it dynamically from likes table
-- ALTER TABLE articles ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;

