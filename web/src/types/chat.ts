export interface ComparisonTable {
  headers: string[];
  rows: string[][];
}

export interface CompatibilityResult {
  compatible: boolean;
  explanation: string;
  part1_name?: string;
  part2_name?: string;
  compatibility_types?: string[];
  error?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  quick_replies?: string[] | null;
  suggested_followups?: string[];
  comparison_table?: ComparisonTable | null;
  compatibility_result?: CompatibilityResult | null;
}

export interface ChatRequest {
  message: string;
  session_id?: string;
}

export interface ChatResponse {
  response: string;
  products: Record<string, unknown>[];
  filters: Record<string, unknown>;
  preferences: Record<string, unknown>;
  session_id: string;
  quick_replies?: string[] | null;
  suggested_followups?: string[];
  comparison_table?: ComparisonTable | null;
  compatibility_result?: CompatibilityResult | null;
}
