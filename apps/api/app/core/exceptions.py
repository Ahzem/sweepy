from typing import Any
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse


class SweepyException(Exception):
    """Base exception for all Sweepy application errors."""

    def __init__(self, message: str, code: str = "SWEEPY_ERROR", details: Any = None):
        super().__init__(message)
        self.message = message
        self.code = code
        self.details = details


class DirectoryNotFoundException(SweepyException):
    def __init__(self, message: str = "Specified directory does not exist or is not a directory."):
        super().__init__(message, code="DIRECTORY_NOT_FOUND")


class PathSecurityException(SweepyException):
    def __init__(self, message: str = "Path security validation failed: Access outside allowed root is prohibited."):
        super().__init__(message, code="PATH_SECURITY_VIOLATION")


class OperationConflictException(SweepyException):
    def __init__(self, message: str = "Destination file already exists and overwrite is prohibited."):
        super().__init__(message, code="DESTINATION_CONFLICT")


class UndoNotPermittedException(SweepyException):
    def __init__(self, message: str = "Cannot safely undo operation."):
        super().__init__(message, code="UNDO_NOT_PERMITTED")


class OllamaUnavailableException(SweepyException):
    def __init__(self, message: str = "Ollama service is not reachable or model is not loaded."):
        super().__init__(message, code="OLLAMA_UNAVAILABLE")


def register_exception_handlers(app: FastAPI) -> None:
    """Register custom exception handlers with FastAPI application."""

    @app.exception_handler(DirectoryNotFoundException)
    async def directory_not_found_handler(request: Request, exc: DirectoryNotFoundException):
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error": exc.code, "detail": exc.message, "details": exc.details},
        )

    @app.exception_handler(PathSecurityException)
    async def path_security_handler(request: Request, exc: PathSecurityException):
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": exc.code, "detail": exc.message, "details": exc.details},
        )

    @app.exception_handler(OperationConflictException)
    async def operation_conflict_handler(request: Request, exc: OperationConflictException):
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"error": exc.code, "detail": exc.message, "details": exc.details},
        )

    @app.exception_handler(UndoNotPermittedException)
    async def undo_not_permitted_handler(request: Request, exc: UndoNotPermittedException):
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": exc.code, "detail": exc.message, "details": exc.details},
        )

    @app.exception_handler(OllamaUnavailableException)
    async def ollama_unavailable_handler(request: Request, exc: OllamaUnavailableException):
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"error": exc.code, "detail": exc.message, "details": exc.details},
        )

    @app.exception_handler(SweepyException)
    async def generic_sweepy_handler(request: Request, exc: SweepyException):
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": exc.code, "detail": exc.message, "details": exc.details},
        )
