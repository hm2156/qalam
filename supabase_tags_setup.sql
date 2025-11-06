-- Add tags column to articles table
-- Tags will be stored as a single text value (can be expanded to array later if needed)
ALTER TABLE articles ADD COLUMN IF NOT EXISTS tag TEXT DEFAULT 'general';

-- Create index for faster tag filtering
CREATE INDEX IF NOT EXISTS articles_tag_idx ON articles(tag);

-- Update existing articles without tags to have 'general' tag
UPDATE articles SET tag = 'general' WHERE tag IS NULL;

-- Make tag NOT NULL with default (after updating existing rows)
ALTER TABLE articles ALTER COLUMN tag SET DEFAULT 'general';
ALTER TABLE articles ALTER COLUMN tag SET NOT NULL;

