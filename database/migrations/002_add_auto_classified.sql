-- Add auto_classified column to track whether classification was automatic or manual
ALTER TABLE classifications
ADD COLUMN auto_classified BOOLEAN DEFAULT FALSE;

-- Add index for filtering by auto-classified status
CREATE INDEX idx_classifications_auto_classified ON classifications(auto_classified);
