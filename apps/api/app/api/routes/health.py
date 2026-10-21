from typing import Any
from fastapi import APIRouter
from app.core.config import settings
from app.repositories.operation_log_repository import operation_repo
from app.schemas.operation import DashboardStatsResponse
from app.services.ai_service import ai_service

router = APIRouter(tags=["Health & Status"])


@router.get("/health")
async def health_check() -> dict[str, str]:
    return {
        "status": "healthy",
        "app": "Sweepy API",
        "version": "0.1.0",
    }


@router.get("/ai/status")
async def get_ai_status() -> dict[str, Any]:
    return await ai_service.check_status()


@router.get("/stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats(
    scanned: int = 0,
    awaiting: int = 0,
    suggestions: int = 0,
) -> DashboardStatsResponse:
    ai_stat = await ai_service.check_status()
    recent = operation_repo.list_operations(limit=10)
    completed = operation_repo.get_total_completed_count()

    return DashboardStatsResponse(
        files_scanned=scanned,
        awaiting_review=awaiting,
        suggestions_count=suggestions,
        completed_operations=completed,
        ollama_connected=ai_stat["connected"],
        ollama_model=settings.OLLAMA_MODEL,
        ollama_available=ai_stat["model_available"],
        recent_operations=recent,
    )
