-- Restore auto-classifications for violations using the same heuristic rules as the CLI

-- Insert content classifications
INSERT INTO classifications (violation_id, category, auto_classified, notes, classified_at)
SELECT
  v.id,
  'content' AS category,
  true AS auto_classified,
  'Auto-classified based on rule pattern' AS notes,
  NOW() AS classified_at
FROM violations v
WHERE NOT EXISTS (
  SELECT 1 FROM classifications c WHERE c.violation_id = v.id
)
AND (
  v.rule_id ILIKE '%image-alt%' OR
  v.rule_id ILIKE '%H37%' OR
  v.rule_id ILIKE '%H67%' OR
  v.rule_id ILIKE '%label%' OR
  v.rule_id ILIKE '%link-name%' OR
  v.rule_id ILIKE '%button-name%' OR
  v.rule_id ILIKE '%1_1_1%'
)
ON CONFLICT (violation_id) DO NOTHING;

-- Insert structural classifications
INSERT INTO classifications (violation_id, category, auto_classified, notes, classified_at)
SELECT
  v.id,
  'structural' AS category,
  true AS auto_classified,
  'Auto-classified based on rule pattern' AS notes,
  NOW() AS classified_at
FROM violations v
WHERE NOT EXISTS (
  SELECT 1 FROM classifications c WHERE c.violation_id = v.id
)
AND (
  v.rule_id ILIKE '%html-has-lang%' OR
  v.rule_id ILIKE '%document-title%' OR
  v.rule_id ILIKE '%landmark-one-main%' OR
  v.rule_id ILIKE '%page-has-heading-one%' OR
  v.rule_id ILIKE '%color-contrast%' OR
  v.rule_id ILIKE '%H32.2%' OR
  v.rule_id ILIKE '%H91%' OR
  v.rule_id ILIKE '%2_4_1%' OR
  v.rule_id ILIKE '%3_2_2%' OR
  v.rule_id ILIKE '%4_1_2%' OR
  v.rule_id ILIKE '%F68%'
)
ON CONFLICT (violation_id) DO NOTHING;

-- Display summary of classifications
SELECT
  category,
  COUNT(*) as count
FROM classifications
WHERE auto_classified = true
GROUP BY category
ORDER BY category;
