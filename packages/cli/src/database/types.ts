export interface Audit {
  id: string;
  timestamp: string;
  status: 'running' | 'completed' | 'failed';
  config_used: any;
  total_violations: number;
  duration_seconds: number | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PageType {
  id: string;
  audit_id: string;
  type_name: string;
  url_pattern: string;
  total_count_in_sitemap: number;
  pages_sampled: number;
  created_at: string;
}

export interface Violation {
  id: string;
  audit_id: string;
  page_type_id: string;
  rule_id: string;
  wcag_criterion: string;
  wcag_level: 'A' | 'AA' | 'AAA';
  severity: 'critical' | 'serious' | 'moderate' | 'minor';
  description: string;
  instances_found: number;
  extrapolated_total: number | null;
  remediation_guidance: string | null;
  created_at: string;
}

export interface ViolationExample {
  id: string;
  violation_id: string;
  url: string;
  html_snippet: string | null;
  css_selector: string | null;
  created_at: string;
}
