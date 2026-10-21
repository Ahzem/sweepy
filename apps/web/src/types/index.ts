export type FileCategory =
  | 'Documents'
  | 'Images'
  | 'Audio'
  | 'Video'
  | 'Archives'
  | 'Code'
  | 'Installers'
  | 'Others';

export interface FileMetadata {
  name: string;
  relative_path: string;
  extension: string;
  category: FileCategory | string;
  size_bytes: number;
  formatted_size: string;
  modified_at: string;
}

export interface FolderScanResult {
  folder_path: string;
  folder_name: string;
  total_files: number;
  total_size_bytes: number;
  formatted_total_size: string;
  files: FileMetadata[];
  truncated: boolean;
  scanned_at: string;
}

export interface FolderValidation {
  path: string;
  name: string;
  exists: boolean;
  is_dir: boolean;
  readable: boolean;
  quick_shortcuts: { name: string; path: string }[];
}

export interface OrganizationSuggestion {
  id: string;
  original_filename: string;
  original_relative_path: string;
  proposed_filename: string;
  proposed_relative_path: string;
  category: string;
  explanation: string;
  confidence: number;
  source: 'ai' | 'rule';
  approved: boolean;
  size_bytes: number;
  formatted_size: string;
}

export type OperationStatus =
  | 'proposed'
  | 'approved'
  | 'completed'
  | 'failed'
  | 'undone';

export interface OperationPlanItem {
  id: string;
  original_relative_path: string;
  target_relative_path: string;
  proposed_filename: string;
  category: string;
  explanation: string;
  approved: boolean;
  conflict: boolean;
  conflict_reason?: string | null;
  size_bytes: number;
  formatted_size: string;
}

export interface PreviewOperationsResult {
  folder_path: string;
  items: OperationPlanItem[];
  total_moves: number;
  conflicts_count: number;
  safe_to_apply: boolean;
}

export interface OperationRecord {
  id: string;
  batch_id: string;
  folder_path: string;
  original_relative_path: string;
  final_relative_path: string;
  status: OperationStatus;
  created_at: string;
  undone_at?: string | null;
  error_message?: string | null;
  is_undone: boolean;
  size_bytes: number;
  formatted_size: string;
}

export interface ApplyOperationsResult {
  folder_path: string;
  batch_id: string;
  completed_count: number;
  failed_count: number;
  results: OperationRecord[];
  message: string;
}

export interface DashboardStats {
  files_scanned: number;
  awaiting_review: number;
  suggestions_count: number;
  completed_operations: number;
  ollama_connected: boolean;
  ollama_model: string;
  ollama_available: boolean;
  recent_operations: OperationRecord[];
}

export interface AIStatus {
  connected: boolean;
  model: string;
  model_available: boolean;
  all_models: string[];
  message: string;
}
