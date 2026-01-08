-- Audits table
CREATE TABLE audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  config_used JSONB,
  total_violations INTEGER DEFAULT 0,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Page types discovered in each audit
CREATE TABLE page_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  type_name TEXT NOT NULL,
  url_pattern TEXT NOT NULL,
  total_count_in_sitemap INTEGER NOT NULL,
  pages_sampled INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Aggregated violations by page type
CREATE TABLE violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  page_type_id UUID NOT NULL REFERENCES page_types(id) ON DELETE CASCADE,
  rule_id TEXT NOT NULL,
  wcag_criterion TEXT NOT NULL,
  wcag_level TEXT NOT NULL CHECK (wcag_level IN ('A', 'AA', 'AAA')),
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'serious', 'moderate', 'minor')),
  description TEXT NOT NULL,
  instances_found INTEGER NOT NULL,
  extrapolated_total INTEGER,
  remediation_guidance TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sample URLs where violations were found
CREATE TABLE violation_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  violation_id UUID NOT NULL REFERENCES violations(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  html_snippet TEXT,
  css_selector TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User classifications of violations
CREATE TABLE classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  violation_id UUID NOT NULL REFERENCES violations(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('content', 'structural')),
  auto_classified BOOLEAN DEFAULT FALSE,
  notes TEXT,
  classified_by UUID, -- Will reference users table when auth is added
  classified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Asana export tracking
CREATE TABLE asana_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  violation_id UUID NOT NULL REFERENCES violations(id) ON DELETE CASCADE,
  asana_task_id TEXT NOT NULL,
  section TEXT NOT NULL CHECK (section IN ('content', 'structural')),
  exported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_audits_timestamp ON audits(timestamp DESC);
CREATE INDEX idx_audits_status ON audits(status);
CREATE INDEX idx_page_types_audit ON page_types(audit_id);
CREATE INDEX idx_violations_audit ON violations(audit_id);
CREATE INDEX idx_violations_page_type ON violations(page_type_id);
CREATE INDEX idx_violations_severity ON violations(severity);
CREATE INDEX idx_violation_examples_violation ON violation_examples(violation_id);
CREATE INDEX idx_classifications_violation ON classifications(violation_id);
CREATE INDEX idx_classifications_auto_classified ON classifications(auto_classified);
CREATE INDEX idx_asana_exports_violation ON asana_exports(violation_id);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to audits table
CREATE TRIGGER update_audits_updated_at
  BEFORE UPDATE ON audits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
