from fastapi import APIRouter
from app.api.routes import analysis, folders, health, operations

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(health.router)
api_router.include_router(folders.router)
api_router.include_router(analysis.router)
api_router.include_router(operations.router)
