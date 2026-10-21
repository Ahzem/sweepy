import pytest
from pathlib import Path
from app.services.folder_service import FolderService
from app.services.ai_service import ai_service
from app.services.organization_service import organization_service
from app.schemas.operation import OperationPlanItem


@pytest.mark.asyncio
async def test_full_organization_and_undo_lifecycle(tmp_path):
    # 1. Create a simulated messy Downloads folder
    downloads = tmp_path / "simulated_downloads"
    downloads.mkdir()

    sample_files = {
        "invoice_acme_oct2026.pdf": b"invoice pdf data",
        "vacation_photo_2026.png": b"png image data",
        "software_setup.exe": b"executable data",
        "project_backup.zip": b"archive data",
        "resume_john_doe.docx": b"resume doc data",
    }

    for filename, content in sample_files.items():
        (downloads / filename).write_bytes(content)

    # 2. Scan the folder
    scan_res = FolderService.scan_folder(str(downloads), recursive=False)
    assert scan_res.total_files == 5
    assert scan_res.folder_name == "simulated_downloads"

    # 3. Generate suggestions (using rule fallback or Ollama if available)
    suggestions, fallback = await ai_service.generate_suggestions(scan_res.files, use_ai=True)
    assert len(suggestions) == 5

    # Check categories
    cat_map = {s.original_filename: s.category for s in suggestions}
    assert cat_map["invoice_acme_oct2026.pdf"] == "Documents"
    assert cat_map["vacation_photo_2026.png"] == "Images"
    assert cat_map["software_setup.exe"] == "Installers"
    assert cat_map["project_backup.zip"] == "Archives"

    # 4. Preview operations
    plan_items = [
        OperationPlanItem(
            id=s.id,
            original_relative_path=s.original_relative_path,
            target_relative_path=s.proposed_relative_path,
            proposed_filename=s.proposed_filename,
            category=s.category,
            explanation=s.explanation,
            approved=True,
            size_bytes=s.size_bytes,
            formatted_size=s.formatted_size,
        )
        for s in suggestions
    ]

    preview_res = organization_service.preview_operations(str(downloads), plan_items)
    assert preview_res.safe_to_apply is True
    assert preview_res.conflicts_count == 0

    # 5. Apply operations
    apply_res = organization_service.apply_operations(str(downloads), plan_items)
    assert apply_res.completed_count == 5
    assert apply_res.failed_count == 0

    # Verify original files no longer at top-level
    for filename in sample_files:
        assert not (downloads / filename).exists(), f"Original file {filename} should be moved"

    # Verify files exist in their target organized locations
    for result in apply_res.results:
        target_path = downloads / result.final_relative_path
        assert target_path.exists(), f"Target file {result.final_relative_path} must exist"

    # 6. Safe Undo all operations
    for result in apply_res.results:
        undo_res = organization_service.undo_operation(result.id)
        assert undo_res.success is True

    # Verify files restored to original locations
    for filename, content in sample_files.items():
        restored_file = downloads / filename
        assert restored_file.exists(), f"Restored file {filename} should exist"
        assert restored_file.read_bytes() == content, f"Restored file {filename} content must match"
