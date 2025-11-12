-- Article review workflow enhancements
-- 1. Allow new status value for pending review
ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_status_check;
ALTER TABLE articles
  ADD CONSTRAINT articles_status_check CHECK (status IN ('draft', 'pending_review', 'published', 'archived', 'rejected'));

-- 2. Track review metadata
ALTER TABLE articles ADD COLUMN IF NOT EXISTS review_submitted_at timestamptz;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS review_notes text;

-- 3. Default status safety
ALTER TABLE articles ALTER COLUMN status SET DEFAULT 'draft';
