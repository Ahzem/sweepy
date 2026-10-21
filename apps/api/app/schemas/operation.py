from enum import Enum
from typing import Literal
from pydantic import BaseModel, Field


class OperationStatus(str, Enum):
    PROPOSED = "proposed"
    APPROVED = "approved"
    COMPLETED = "completed"
    FAILED = "failed"
    UNDONE = "undone"


class OperationType(str, Enum):
    MOVE = "move"
    RENAME = "rename"
    MOVE_AND_RENAME = "move_and_rename"


class OperationPlanItem(BaseModel):
    id: str
    original_relative_path: str
    target_relative_path: str
    proposed_filename: str
    category: str
    explanation: str
    approved: bool = True
    conflict: bool = False
    conflict_reason: str | None = None
    size_bytes: int = 0
    formatted_size: str = ""


class PreviewOperationsRequest(BaseModel):
    folder_path: str
    items: list[OperationPlanItem]


class PreviewOperationsResponse(BaseModel):
    folder_path: str
    items: list[OperationPlanItem]
    total_moves: int
    conflicts_count: int
    safe_to_apply: bool


class OperationRecord(BaseModel):
    id: str
    batch_id: str
    folder_path: str
    original_relative_path: str
    final_relative_path: str
    status: OperationStatus
    created_at: str
    undone_at: str | None = None
    error_message: str | None = None
    is_undone: bool = False
    size_bytes: int = 0
    formatted_size: str = ""


class ApplyOperationsRequest(BaseModel):
    folder_path: str
    items: list[OperationPlanItem]


class ApplyOperationsResponse(BaseModel):
    folder_path: str
    batch_id: str
    completed_count: int
    failed_count: int
    results: list[OperationRecord]
    message: str


class UndoOperationResponse(BaseModel):
    operation_id: str
    success: bool
    restored_path: str
    message: str


class DashboardStatsResponse(BaseModel):
    files_scanned: int
    awaiting_review: int
    suggestions_count: int
    completed_operations: int
    ollama_connected: bool
    ollama_model: str
    ollama_available: bool
    recent_operations: list[OperationRecord]
