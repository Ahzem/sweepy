from typing import Literal
from pydantic import BaseModel, Field


class FileMetadataResponse(BaseModel):
    name: str
    relative_path: str
    extension: str
    category: str
    size_bytes: int
    formatted_size: str
    modified_at: str


class OrganizationSuggestionItem(BaseModel):
    id: str = Field(..., description="Unique client identifier for the suggestion")
    original_filename: str
    original_relative_path: str
    proposed_filename: str
    proposed_relative_path: str
    category: str
    explanation: str
    confidence: float = Field(default=0.85, ge=0.0, le=1.0)
    source: Literal["ai", "rule"] = "ai"
    approved: bool = True
    size_bytes: int = 0
    formatted_size: str = ""


class SuggestRequest(BaseModel):
    folder_path: str
    files: list[FileMetadataResponse]
    use_ai: bool = True


class SuggestResponse(BaseModel):
    folder_path: str
    suggestions: list[OrganizationSuggestionItem]
    model_used: str
    ai_enabled: bool
    fallback_used: bool = False
