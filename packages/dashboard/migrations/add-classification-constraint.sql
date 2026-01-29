-- Add unique constraint on violation_id for classifications
-- This ensures only one classification per violation and enables upsert to work properly
ALTER TABLE classifications ADD CONSTRAINT unique_violation_classification UNIQUE (violation_id);
