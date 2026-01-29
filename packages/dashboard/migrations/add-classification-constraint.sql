-- Clean up duplicate classifications first
-- Keep only the most recent classification for each violation
DELETE FROM classifications
WHERE id NOT IN (
  SELECT DISTINCT ON (violation_id) id
  FROM classifications
  ORDER BY violation_id, classified_at DESC
);

-- Now add unique constraint on violation_id for classifications
-- This ensures only one classification per violation and enables upsert to work properly
ALTER TABLE classifications ADD CONSTRAINT unique_violation_classification UNIQUE (violation_id);
