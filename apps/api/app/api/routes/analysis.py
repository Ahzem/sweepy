from fastapi import APIRouter
from app.core.config import settings
from app.schemas.file import SuggestRequest, SuggestResponse
from app.services.ai_service import ai_service

router = APIRouter(prefix="/analysis", tags=["AI Analysis"])


@router.post("/suggest", response_model=SuggestResponse)
async def generate_organization_suggestions(payload: SuggestRequest) -> SuggestResponse:
    suggestions, fallback_used = await ai_service.generate_suggestions(
        files=payload.files,
        use_ai=payload.use_ai,
    )

    return SuggestResponse(
        folder_path=payload.folder_path,
        suggestions=suggestions,
        model_used=settings.OLLAMA_MODEL if (payload.use_ai and not fallback_used) else "rule-based-fallback",
        ai_enabled=payload.use_ai,
        fallback_used=fallback_used,
    )
