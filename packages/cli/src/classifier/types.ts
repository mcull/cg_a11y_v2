export interface PageTypePattern {
  pattern: string;
  type: string;
}

export interface PageTypeCount {
  type: string;
  pattern: string;
  urls: string[];
  totalCount: number;
}
