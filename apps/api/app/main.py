from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.router import api_router
from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import logger, setup_logging


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging(debug=settings.DEBUG)
    logger.info("Starting Sweepy API backend...")
    logger.info(f"Ollama Target URL: {settings.OLLAMA_BASE_URL} (Model: {settings.OLLAMA_MODEL})")
    settings.SWEEPY_DATA_DIR.mkdir(parents=True, exist_ok=True)
    yield
    logger.info("Sweepy API backend shutting down.")


app = FastAPI(
    title="Sweepy API",
    description="Local-First AI-powered Downloads and File Organizer Backend",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Configure CORS for local frontend only
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Register custom exception handlers
register_exception_handlers(app)

# Include versioned API router
app.include_router(api_router)


@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "Welcome to Sweepy API. Visit /docs for OpenAPI documentation.",
        "api_v1": "/api/v1",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
