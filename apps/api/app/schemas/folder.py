from pydantic import BaseModel, Field
from app.schemas.file import FileMetadataResponse


class FolderValidateRequest(BaseModel):
    path: str = Field(..., description="Directory path to validate")


class FolderValidateResponse(BaseModel):
    path: str
    exists: bool
    is_dir: bool
    name: str
    readable: bool
    quick_shortcuts: list[dict[str, str]] = []


class FolderBrowseResponse(BaseModel):
    selected_path: str | None = None
    cancelled: bool = False


class FolderScanRequest(BaseModel):
    path: str = Field(..., description="Target directory path to scan")
    recursive: bool = Field(False, description="Scan subfolders recursively (default false for safe top-level organization)")
    max_files: int = Field(1000, description="Safety limit for file count")
    include_hidden: bool = Field(False, description="Whether to include hidden and system files")


class FolderScanResponse(BaseModel):
    folder_path: str
    folder_name: str
    total_files: int
    total_size_bytes: int
    formatted_total_size: str
    files: list[FileMetadataResponse]
    truncated: bool
    scanned_at: str
