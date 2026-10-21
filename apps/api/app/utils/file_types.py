from pathlib import Path

CATEGORY_MAPPING = {
    "Images": {
        ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".tiff",
        ".tif", ".ico", ".heic", ".heif", ".raw", ".psd", ".ai", ".avif"
    },
    "Documents": {
        ".pdf", ".docx", ".doc", ".xlsx", ".xls", ".pptx", ".ppt", ".txt",
        ".csv", ".md", ".rtf", ".odt", ".ods", ".odp", ".epub", ".pages", ".numbers"
    },
    "Audio": {
        ".mp3", ".wav", ".aac", ".flac", ".ogg", ".m4a", ".wma", ".opus", ".aiff"
    },
    "Video": {
        ".mp4", ".mkv", ".mov", ".avi", ".webm", ".flv", ".wmv", ".m4v", ".3gp"
    },
    "Archives": {
        ".zip", ".rar", ".7z", ".tar", ".gz", ".bz2", ".xz", ".iso", ".tgz"
    },
    "Code": {
        ".py", ".js", ".ts", ".tsx", ".jsx", ".json", ".yaml", ".yml",
        ".html", ".css", ".scss", ".rs", ".go", ".cpp", ".c", ".h",
        ".java", ".sql", ".sh", ".ps1", ".php", ".rb", ".toml", ".xml", ".env"
    },
    "Installers": {
        ".exe", ".msi", ".dmg", ".pkg", ".deb", ".rpm", ".apk", ".appx"
    },
}

EXTENSION_TO_CATEGORY: dict[str, str] = {}
for category, extensions in CATEGORY_MAPPING.items():
    for ext in extensions:
        EXTENSION_TO_CATEGORY[ext.lower()] = category


def get_file_category(filename: str) -> str:
    """Determine high-level category of a file based on extension."""
    suffix = Path(filename).suffix.lower()
    return EXTENSION_TO_CATEGORY.get(suffix, "Others")


def format_file_size(size_bytes: int) -> str:
    """Format bytes into human-readable string (KB, MB, GB)."""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.1f} MB"
    else:
        return f"{size_bytes / (1024 * 1024 * 1024):.2f} GB"


def get_rule_based_suggestion(filename: str, year_month: str | None = None) -> tuple[str, str]:
    """
    Fallback deterministic suggestion based on file type and name.
    Returns (proposed_relative_destination, explanation).
    """
    category = get_file_category(filename)
    stem = Path(filename).stem.lower()

    if category == "Images":
        if year_month:
            dest = f"Images/{year_month}/{filename}"
        else:
            dest = f"Images/{filename}"
        explanation = f"Grouped under Images by file type ({Path(filename).suffix.upper()})"
    elif category == "Documents":
        if any(kw in stem for kw in ["invoice", "bill", "receipt"]):
            dest = f"Documents/Invoices/{filename}"
            explanation = "Detected invoice or receipt keyword in document name"
        elif any(kw in stem for kw in ["resume", "cv", "portfolio"]):
            dest = f"Documents/Resumes/{filename}"
            explanation = "Detected resume or CV keyword in document name"
        elif any(kw in stem for kw in ["statement", "bank", "tax"]):
            dest = f"Documents/Financial/{filename}"
            explanation = "Detected financial or tax keyword in document name"
        else:
            dest = f"Documents/{filename}"
            explanation = f"Grouped under Documents by file type ({Path(filename).suffix.upper()})"
    elif category == "Audio":
        dest = f"Audio/{filename}"
        explanation = "Categorized as Audio file"
    elif category == "Video":
        dest = f"Video/{filename}"
        explanation = "Categorized as Video recording"
    elif category == "Archives":
        dest = f"Archives/{filename}"
        explanation = "Compressed archive file"
    elif category == "Installers":
        dest = f"Installers/{filename}"
        explanation = "Software installer/executable"
    elif category == "Code":
        dest = f"Development/{filename}"
        explanation = "Code or configuration file"
    else:
        dest = f"Misc/{filename}"
        explanation = "Categorized into general storage folder"

    return dest, explanation
