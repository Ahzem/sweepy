import pytest
from pathlib import Path
from app.core.exceptions import UndoNotPermittedException
from app.repositories.operation_log_repository import OperationLogRepository
from app.schemas.operation import OperationPlanItem, OperationStatus
from app.services.organization_service import OrganizationService


@pytest.fixture
def temp_repo(tmp_path):
    repo_dir = tmp_path / "sweepy_repo"
    repo = OperationLogRepository(storage_dir=repo_dir)
    return repo


def test_preview_and_conflict_detection(tmp_path):
    sandbox = tmp_path / "sandbox"
    sandbox.mkdir()

    (sandbox / "file_a.txt").write_text("content a")
    (sandbox / "file_b.txt").write_text("content b")
    (sandbox / "existing.txt").write_text("occupied")

    items = [
        OperationPlanItem(
            id="1",
            original_relative_path="file_a.txt",
            target_relative_path="existing.txt",
            proposed_filename="existing.txt",
            category="Documents",
            explanation="Test conflict",
        ),
        OperationPlanItem(
            id="2",
            original_relative_path="file_b.txt",
            target_relative_path="docs/file_b.txt",
            proposed_filename="file_b.txt",
            category="Documents",
            explanation="Clean move",
        ),
    ]

    preview = OrganizationService.preview_operations(str(sandbox), items)
    assert preview.conflicts_count == 1
    assert preview.safe_to_apply is False
    assert preview.items[0].conflict is True
    assert "Destination already exists" in preview.items[0].conflict_reason
    assert preview.items[1].conflict is False


def test_apply_and_undo_successful(tmp_path, monkeypatch):
    sandbox = tmp_path / "sandbox"
    sandbox.mkdir()

    (sandbox / "doc1.txt").write_text("Hello Sweepy")

    repo_dir = tmp_path / "log_store"
    repo = OperationLogRepository(storage_dir=repo_dir)
    monkeypatch.setattr("app.services.organization_service.operation_repo", repo)

    items = [
        OperationPlanItem(
            id="op_1",
            original_relative_path="doc1.txt",
            target_relative_path="Archive/doc1.txt",
            proposed_filename="doc1.txt",
            category="Documents",
            explanation="Moved to archive",
            approved=True,
        )
    ]

    # Apply
    res = OrganizationService.apply_operations(str(sandbox), items)
    assert res.completed_count == 1
    assert res.failed_count == 0
    assert (sandbox / "Archive/doc1.txt").exists()
    assert not (sandbox / "doc1.txt").exists()

    applied_record = res.results[0]
    assert applied_record.status == OperationStatus.COMPLETED

    # Undo
    undo_res = OrganizationService.undo_operation(applied_record.id)
    assert undo_res.success is True
    assert (sandbox / "doc1.txt").exists()
    assert not (sandbox / "Archive/doc1.txt").exists()


def test_undo_fails_if_destination_occupied(tmp_path, monkeypatch):
    sandbox = tmp_path / "sandbox"
    sandbox.mkdir()

    (sandbox / "source.txt").write_text("Source data")

    repo_dir = tmp_path / "log_store"
    repo = OperationLogRepository(storage_dir=repo_dir)
    monkeypatch.setattr("app.services.organization_service.operation_repo", repo)

    items = [
        OperationPlanItem(
            id="op_2",
            original_relative_path="source.txt",
            target_relative_path="docs/target.txt",
            proposed_filename="target.txt",
            category="Documents",
            explanation="Move to docs",
            approved=True,
        )
    ]

    res = OrganizationService.apply_operations(str(sandbox), items)
    applied_record = res.results[0]

    # Now someone creates a new file at original location source.txt!
    (sandbox / "source.txt").write_text("Impostor file")

    with pytest.raises(UndoNotPermittedException):
        OrganizationService.undo_operation(applied_record.id)


def test_partial_failure_handling(tmp_path, monkeypatch):
    sandbox = tmp_path / "sandbox"
    sandbox.mkdir()

    (sandbox / "real_file.txt").write_text("I exist")

    repo_dir = tmp_path / "log_store"
    repo = OperationLogRepository(storage_dir=repo_dir)
    monkeypatch.setattr("app.services.organization_service.operation_repo", repo)

    items = [
        OperationPlanItem(
            id="op_ok",
            original_relative_path="real_file.txt",
            target_relative_path="sorted/real_file.txt",
            proposed_filename="real_file.txt",
            category="Documents",
            explanation="Valid",
            approved=True,
        ),
        OperationPlanItem(
            id="op_ghost",
            original_relative_path="ghost_file.txt",  # Does NOT exist
            target_relative_path="sorted/ghost_file.txt",
            proposed_filename="ghost_file.txt",
            category="Documents",
            explanation="Invalid",
            approved=True,
        ),
    ]

    res = OrganizationService.apply_operations(str(sandbox), items)
    assert res.completed_count == 1
    assert res.failed_count == 1
    assert len(res.results) == 2
    assert res.results[0].status == OperationStatus.COMPLETED
    assert res.results[1].status == OperationStatus.FAILED
