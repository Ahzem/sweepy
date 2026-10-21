import re
from pathlib import Path
from app.core.exceptions import DirectoryNotFoundException, PathSecurityException

# Windows forbidden characters in file/directory segment names: < > : " / \ | ? * and controls
WINDOWS_FORBIDDEN_CHARS_PATTERN = re.compile(r'[<>:"/\\|?*\x00-\x1f]')
WINDOWS_RESERVED_NAMES = {
    "CON", "PRN", "AUX", "NUL",
    "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
    "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
}


def resolve_and_validate_directory(dir_path_str: str) -> Path:
    """
    Validate that a given path string exists, is a directory,
    and returns its resolved absolute Path.
    """
    if not dir_path_str or not dir_path_str.strip():
        raise DirectoryNotFoundException("Folder path cannot be empty.")

    clean_str = dir_path_str.strip().strip('"').strip("'")
    path = Path(clean_str).expanduser()

    if not path.exists():
        raise DirectoryNotFoundException(f"Folder does not exist: {clean_str}")

    if not path.is_dir():
        raise DirectoryNotFoundException(f"Path is not a directory: {clean_str}")

    resolved = path.resolve()
    return resolved


def is_safe_subpath(root_dir: Path, candidate_path: Path) -> bool:
    """
    Ensure candidate_path resolves to a location strictly inside root_dir.
    Guards against symlink traversal and '../' directory escapes.
    """
    try:
        resolved_root = root_dir.resolve()
        # candidate might not exist yet if it is a proposed destination
        # So we resolve its parent or absolute form
        if candidate_path.is_absolute():
            resolved_candidate = candidate_path.resolve()
        else:
            resolved_candidate = (root_dir / candidate_path).resolve()

        resolved_candidate.relative_to(resolved_root)
        return True
    except (ValueError, RuntimeError):
        return False


def validate_subpath_or_raise(root_dir: Path, candidate_path: Path) -> Path:
    """
    Validates candidate_path is inside root_dir and returns the resolved path.
    Raises PathSecurityException if invalid.
    """
    resolved_root = root_dir.resolve()
    target = candidate_path if candidate_path.is_absolute() else (resolved_root / candidate_path)
    resolved_target = target.resolve()

    try:
        resolved_target.relative_to(resolved_root)
    except ValueError:
        raise PathSecurityException(
            f"Access denied: Path '{candidate_path}' escapes the selected folder '{root_dir}'."
        )

    # Extra check: make sure target does not resolve to the root itself
    if resolved_target == resolved_root:
        raise PathSecurityException("Target path cannot be the root folder itself.")

    return resolved_target


def is_valid_windows_filename(filename: str) -> tuple[bool, str]:
    """
    Validates a single filename according to Windows rules.
    Returns (is_valid, reason).
    """
    if not filename or not filename.strip():
        return False, "Filename cannot be empty."

    if len(filename) > 255:
        return False, "Filename exceeds maximum length of 255 characters."

    if WINDOW_CHARS := WINDOWS_FORBIDDEN_CHARS_PATTERN.findall(filename):
        return False, f"Filename contains forbidden characters: {', '.join(set(WINDOW_CHARS))}"

    if filename.endswith(" ") or filename.endswith("."):
        return False, "Filename cannot end with a period or space on Windows."

    stem = Path(filename).stem.upper()
    if stem in WINDOW_RESERVED_NAMES:
        return False, f"'{stem}' is a reserved device name in Windows."

    return True, "Valid"


def sanitize_windows_filename(filename: str) -> str:
    """
    Sanitize a filename so it is valid and safe on Windows:
    - Replaces forbidden characters with underscores
    - Strips leading and trailing dots and spaces
    - Prefixes reserved names if found
    """
    if not filename:
        return "unnamed_file"

    clean = WINDOWS_FORBIDDEN_CHARS_PATTERN.sub("_", filename.strip())
    clean = clean.strip(". ")

    if not clean:
        clean = "file"

    stem = Path(clean).stem.upper()
    if stem in WINDOWS_RESERVED_NAMES:
        clean = f"_{clean}"

    if len(clean) > 255:
        ext = Path(clean).suffix
        stem_part = clean[: 255 - len(ext)]
        clean = f"{stem_part}{ext}"

    return clean


def sanitize_relative_path(rel_path: str) -> str:
    """
    Sanitize a relative destination path (e.g., 'Documents/Invoices/invoice.pdf'):
    Normalizes slashes, cleans individual parts, prevents '..' or root escapes.
    """
    clean_parts: list[str] = []
    # Replace backslashes with forward slashes for splitting
    parts = rel_path.replace("\\", "/").split("/")

    for part in parts:
        stripped = part.strip()
        if not stripped or stripped == ".":
            continue
        if stripped == "..":
            # Strip traversal attempt
            continue
        clean_parts.append(sanitize_windows_filename(stripped))

    if not clean_parts:
        return "unnamed_file"

    return "/".join(clean_parts)


def get_unique_destination_path(base_dir: Path, relative_dest_path: str) -> str:
    """
    If base_dir / relative_dest_path already exists, adds a counter suffix (e.g. 'file (1).pdf')
    to prevent accidental overwrites. Returns the relative string path.
    """
    target = base_dir / relative_dest_path
    if not target.exists():
        return relative_dest_path

    rel_p = Path(relative_dest_path)
    parent = rel_p.parent
    stem = rel_p.stem
    suffix = rel_p.suffix

    counter = 1
    while True:
        candidate_rel = parent / f"{stem} ({counter}){suffix}" if str(parent) != "." else Path(f"{stem} ({counter}){suffix}")
        candidate_rel_str = str(candidate_rel).replace("\\", "/")
        if not (base_dir / candidate_rel).exists():
            return candidate_rel_str
        counter += 1
