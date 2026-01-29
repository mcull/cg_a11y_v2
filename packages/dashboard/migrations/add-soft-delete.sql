-- Add active column to audits table for soft deletes
ALTER TABLE audits ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_audits_active ON audits(active);

-- Update any existing records to be active
UPDATE audits SET active = true WHERE active IS NULL;
