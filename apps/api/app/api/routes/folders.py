from fastapi import APIRouter
from app.schemas.folder import (
    FolderBrowseResponse,
    FolderScanRequest,
    FolderScanResponse,
    FolderValidateRequest,
    FolderValidateResponse,
)
from app.services.folder_service import FolderService, open_native_folder_dialog

router = APIRouter(prefix="/folders", tags=["Folders"])


@router.post("/validate", response_model=FolderValidateResponse)
async def validate_folder(payload: FolderValidateRequest) -> FolderValidateResponse:
    info = FolderService.validate_folder(payload.path)
    return FolderValidateResponse(**info)


@router.post("/browse", response_model=FolderBrowseResponse)
async def browse_folder(payload: FolderValidateRequest | None = None) -> FolderBrowseResponse:
    initial_dir = payload.path if payload else None
    selected = open_native_folder_dialog(initial_dir=initial_dir)
    return FolderBrowseResponse(
        selected_path=selected,
        cancelled=(selected is None),
    )


@router.post("/scan", response_model=FolderScanResponse)
async def scan_folder(payload: FolderScanRequest) -> FolderScanResponse:
    return FolderService.scan_folder(
        folder_path_str=payload.path,
        recursive=payload.recursive,
        max_files=payload.max_files,
        include_hidden=payload.include_hidden,
    )
