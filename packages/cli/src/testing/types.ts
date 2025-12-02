export interface TestResult {
  url: string;
  violations: Violation[];
  passes: number;
  incomplete: number;
  timestamp: string;
}

export interface Violation {
  id: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  description: string;
  help: string;
  helpUrl: string;
  tags: string[];
  nodes: ViolationNode[];
}

export interface ViolationNode {
  html: string;
  target: any; // Can be string[] or complex selector types from axe-core
  failureSummary: string;
}
