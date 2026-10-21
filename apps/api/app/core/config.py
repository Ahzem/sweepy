from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings for Sweepy API."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Server configuration
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    DEBUG: bool = False
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # Ollama AI Configuration
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "gemma3:1b"
    OLLAMA_TIMEOUT_SECONDS: float = 30.0

    # Local persistence
    SWEEPY_DATA_DIR: Path = Path.home() / ".sweepy"

    # Filesystem scanning constraints
    MAX_SCAN_FILES: int = 2000
    EXCLUDED_DIR_NAMES: set[str] = {
        ".git",
        ".svn",
        ".hg",
        "node_modules",
        ".venv",
        "venv",
        "env",
        "__pycache__",
        ".next",
        ".sweepy",
        "$Recycle.Bin",
        "System Volume Information",
    }


settings = Settings()
