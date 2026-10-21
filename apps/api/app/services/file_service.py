import shutil
from pathlib import Path
from app.core.exceptions import OperationConflictException, PathSecurityException
from app.core.logging import logger
from app.utils.path_safety import validate_subpath_or_raise


class FileService:
    """Low-level safe filesystem operations scoped to a validated root directory."""

    @staticmethod
    def move_or_rename_file(root_dir: Path, source_rel: str, target_rel: str) -> Path:
        """
        Safely move or rename a file within root_dir.
        Enforces:
        - Source exists and is inside root_dir.
        - Target is inside root_dir.
        - Target does not already exist (no overwrite).
        - Directories created with parents.
        """
        source_path = validate_subpath_or_raise(root_dir, Path(source_rel))
        target_path = validate_subpath_or_raise(root_dir, Path(target_rel))

        if not source_path.exists():
            raise FileNotFoundError(f"Source file does not exist: {source_rel}")

        if not source_path.is_file():
            raise PathSecurityException(f"Source is not a standard file: {source_rel}")

        if target_path.exists():
            # If source and target are the same path, nothing to do
            if source_path.samefile(target_path):
                return target_path
            raise OperationConflictException(f"Target destination already exists: {target_rel}")

        # Ensure destination directory exists
        target_path.parent.mkdir(parents=True, exist_ok=True)

        # Move the file
        shutil.move(str(source_path), str(target_path))
        logger.info(f"Moved '{source_rel}' -> '{target_rel}'")

        return target_path
