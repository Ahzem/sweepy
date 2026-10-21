import {
  AIStatus,
  ApplyOperationsResult,
  DashboardStats,
  FileMetadata,
  FolderScanResult,
  FolderValidation,
  OperationPlanItem,
  OperationRecord,
  OrganizationSuggestion,
  PreviewOperationsResult,
} from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      let errorMsg = `Request failed (${res.status})`;
      let code: string | undefined;
      let details: unknown;

      try {
        const errorData = await res.json();
        if (errorData.detail) errorMsg = errorData.detail;
        if (errorData.error) code = errorData.error;
        if (errorData.details) details = errorData.details;
      } catch {
        // use fallback status
      }

      throw new ApiError(errorMsg, res.status, code, details);
    }

    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      `Could not connect to Sweepy backend at ${url}. Ensure the Python FastAPI server is running.`,
      0
    );
  }
}

export const api = {
  getHealth: () => request<{ status: string; app: string; version: string }>('/health'),

  getAiStatus: () => request<AIStatus>('/ai/status'),

  getStats: (scanned = 0, awaiting = 0, suggestions = 0) =>
    request<DashboardStats>(`/stats?scanned=${scanned}&awaiting=${awaiting}&suggestions=${suggestions}`),

  validateFolder: (path: string) =>
    request<FolderValidation>('/folders/validate', {
      method: 'POST',
      body: JSON.stringify({ path }),
    }),

  browseFolder: (path?: string) =>
    request<{ selected_path: string | null; cancelled: boolean }>('/folders/browse', {
      method: 'POST',
      body: JSON.stringify({ path: path || '' }),
    }),

  scanFolder: (params: { path: string; recursive?: boolean; max_files?: number; include_hidden?: boolean }) =>
    request<FolderScanResult>('/folders/scan', {
      method: 'POST',
      body: JSON.stringify({
        path: params.path,
        recursive: params.recursive ?? false,
        max_files: params.max_files ?? 1000,
        include_hidden: params.include_hidden ?? false,
      }),
    }),

  suggest: (params: { folder_path: string; files: FileMetadata[]; use_ai?: boolean }) =>
    request<{
      folder_path: string;
      suggestions: OrganizationSuggestion[];
      model_used: string;
      ai_enabled: boolean;
      fallback_used: boolean;
    }>('/analysis/suggest', {
      method: 'POST',
      body: JSON.stringify({
        folder_path: params.folder_path,
        files: params.files,
        use_ai: params.use_ai ?? true,
      }),
    }),

  previewOperations: (params: { folder_path: string; items: OperationPlanItem[] }) =>
    request<PreviewOperationsResult>('/operations/preview', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  applyOperations: (params: { folder_path: string; items: OperationPlanItem[] }) =>
    request<ApplyOperationsResult>('/operations/apply', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  listOperations: (limit = 50) =>
    request<OperationRecord[]>(`/operations?limit=${limit}`),

  undoOperation: (operationId: string) =>
    request<{ operation_id: string; success: boolean; restored_path: string; message: string }>(
      `/operations/${operationId}/undo`,
      { method: 'POST' }
    ),
};
