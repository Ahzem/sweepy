import os
import sys
import threading
from datetime import datetime, timezone
from pathlib import Path
from app.core.config import settings
from app.core.exceptions import DirectoryNotFoundException, PathSecurityException
from app.core.logging import logger
from app.schemas.file import FileMetadataResponse
from app.schemas.folder import FolderScanResponse
from app.utils.file_types import format_file_size, get_file_category
from app.utils.path_safety import resolve_and_validate_directory


def get_user_quick_folders() -> list[dict[str, str]]:
    """Returns accessible standard Windows user directories for quick-pick selection."""
    home = Path.home()
    folders = [
        {"name": "Downloads", "path": str(home / "Downloads")},
        {"name": "Documents", "path": str(home / "Documents")},
        {"name": "Desktop", "path": str(home / "Desktop")},
        {"name": "Pictures", "path": str(home / "Pictures")},
    ]
    # Filter to folders that actually exist
    valid = []
    for f in folders:
        if Path(f["path"]).exists():
            valid.append(f)
    return valid


def open_native_folder_dialog(initial_dir: str | None = None) -> str | None:
    """
    Open native Windows folder picker dialog in a separate thread.
    Returns chosen path string or None if cancelled.
    """
    result: list[str | None] = [None]

    def _show_dialog():
        try:
            import tkinter as tk
            from tkinter import filedialog

            root = tk.Tk()
            root.withdraw()  # Hide main window
            root.attributes("-topmost", True)  # Ensure picker appears in front

            init = initial_dir or str(Path.home() / "Downloads")
            if not Path(init).exists():
                init = str(Path.home())

            selected = filedialog.askdirectory(
                initialdir=init,
                title="Select Folder to Organize with Sweepy",
            )
            root.destroy()

            if selected and selected.strip():
                result[0] = str(Path(selected).resolve())
        except Exception as e:
            logger.warning(f"Native folder dialog error: {e}")

    thread = threading.Thread(target=_show_dialog)
    thread.start()
    thread.join(timeout=60.0)  # Wait up to 60s for user interaction

    return result[0]


class FolderService:
    """Service handling directory validation and safe file scanning."""

    @staticmethod
    def validate_folder(folder_path_str: str) -> dict:
        resolved = resolve_and_validate_directory(folder_path_str)

        # Safety restriction: Don't allow root drives or system folders
        if len(resolved.parts) <= 1:
            raise PathSecurityException("Scanning entire drive root is prohibited for safety.")

        is_readable = os.access(resolved, os.R_OK)
        return {
            "path": str(resolved),
            "name": resolved.name or str(resolved),
            "exists": True,
            "is_dir": True,
            "readable": is_readable,
            "quick_shortcuts": get_user_quick_folders(),
        }

    @staticmethod
    def scan_folder(
        folder_path_str: str,
        recursive: bool = False,
        max_files: int = 1000,
        include_hidden: bool = False,
    ) -> FolderScanResponse:
        resolved_root = resolve_and_validate_directory(folder_path_str)

        # Prevent scanning drive root or Windows directory
        if len(resolved_root.parts) <= 1:
            raise PathSecurityException("Scanning entire drive root is prohibited for safety.")

        system_root = Path(os.environ.get("SystemRoot", "C:\\Windows")).resolve()
        if resolved_root == system_root or system_root in resolved_root.parents:
            raise PathSecurityException("Scanning system directory is prohibited.")

        effective_max = min(max_files, settings.MAX_SCAN_FILES)
        files_metadata: list[FileMetadataResponse] = []
        total_size = 0
        truncated = False

        try:
            if not recursive:
                # Top level scan
                with os.scandir(resolved_root) as it:
                    for entry in it:
                        if len(files_metadata) >= effective_max:
                            truncated = True
                            break

                        try:
                            # Do not follow symlinks/junctions
                            if entry.is_symlink():
                                continue

                            # Check hidden
                            if not include_hidden:
                                if entry.name.startswith("."):
                                    continue
                                # Windows hidden check
                                if sys.platform == "win32":
                                    try:
                                        attrs = entry.stat(follow_symlinks=False).st_file_attributes
                                        # FILE_ATTRIBUTE_HIDDEN = 0x2
                                        if attrs & 0x2:
                                            continue
                                    except (AttributeError, OSError):
                                        pass

                            if entry.is_file(follow_symlinks=False):
                                stat = entry.stat(follow_symlinks=False)
                                rel_path = entry.name
                                ext = Path(entry.name).suffix.lower()
                                category = get_file_category(entry.name)
                                mtime = datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat()

                                files_metadata.append(
                                    FileMetadataResponse(
                                        name=entry.name,
                                        relative_path=rel_path,
                                        extension=ext,
                                        category=category,
                                        size_bytes=stat.st_size,
                                        formatted_size=format_file_size(stat.st_size),
                                        modified_at=mtime,
                                    )
                                )
                                total_size += stat.st_size
                        except (PermissionError, FileNotFoundError, OSError) as e:
                            logger.warning(f"Skipping inaccessible file {entry.name}: {e}")
            else:
                # Recursive scan
                for root, dirs, files in os.walk(resolved_root, followlinks=False):
                    # Exclude unsafe/unwanted directories in-place
                    dirs[:] = [
                        d for d in dirs
                        if d not in settings.EXCLUDED_DIR_NAMES
                        and not (not include_hidden and d.startswith("."))
                        and not Path(os.path.join(root, d)).is_symlink()
                    ]

                    curr_dir_path = Path(root)

                    for file_name in files:
                        if len(files_metadata) >= effective_max:
                            truncated = True
                            break

                        if not include_hidden and file_name.startswith("."):
                            continue

                        file_path = curr_dir_path / file_name
                        try:
                            if file_path.is_symlink():
                                continue

                            stat = file_path.stat(follow_symlinks=False)
                            rel_path = str(file_path.relative_to(resolved_root)).replace("\\", "/")
                            ext = file_path.suffix.lower()
                            category = get_file_category(file_name)
                            mtime = datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat()

                            files_metadata.append(
                                FileMetadataResponse(
                                    name=file_name,
                                    relative_path=rel_path,
                                    extension=ext,
                                    category=category,
                                    size_bytes=stat.st_size,
                                    formatted_size=format_file_size(stat.st_size),
                                    modified_at=mtime,
                                )
                            )
                            total_size += stat.st_size
                        except (PermissionError, FileNotFoundError, OSError) as e:
                            logger.warning(f"Skipping inaccessible file {file_name}: {e}")

                    if truncated:
                        break

        except Exception as e:
            logger.error(f"Error scanning folder {resolved_root}: {e}")
            raise

        return FolderScanResponse(
            folder_path=str(resolved_root),
            folder_name=resolved_root.name,
            total_files=len(files_metadata),
            total_size_bytes=total_size,
            formatted_total_size=format_file_size(total_size),
            files=files_metadata,
            truncated=truncated,
            scanned_at=datetime.now(timezone.utc).isoformat(),
        )
