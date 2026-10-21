from fastapi import APIRouter
from app.repositories.operation_log_repository import operation_repo
from app.schemas.operation import (
    ApplyOperationsRequest,
    ApplyOperationsResponse,
    OperationRecord,
    PreviewOperationsRequest,
    PreviewOperationsResponse,
    UndoOperationResponse,
)
from app.services.organization_service import organization_service

router = APIRouter(prefix="/operations", tags=["Operations"])


@router.post("/preview", response_model=PreviewOperationsResponse)
async def preview_operations(payload: PreviewOperationsRequest) -> PreviewOperationsResponse:
    return organization_service.preview_operations(
        folder_path_str=payload.folder_path,
        items=payload.items,
    )


@router.post("/apply", response_model=ApplyOperationsResponse)
async def apply_operations(payload: ApplyOperationsRequest) -> ApplyOperationsResponse:
    return organization_service.apply_operations(
        folder_path_str=payload.folder_path,
        items=payload.items,
    )


@router.get("", response_model=list[OperationRecord])
async def list_operations(limit: int = 50) -> list[OperationRecord]:
    return operation_repo.list_operations(limit=limit)


@router.post("/{operation_id}/undo", response_model=UndoOperationResponse)
async def undo_operation(operation_id: str) -> UndoOperationResponse:
    return organization_service.undo_operation(operation_id)
