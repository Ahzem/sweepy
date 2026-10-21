import uuid
from datetime import datetime, timezone
from pathlib import Path
from app.core.exceptions import DirectoryNotFoundException, PathSecurityException, UndoNotPermittedException
from app.core.logging import logger
from app.repositories.operation_log_repository import operation_repo
from app.schemas.operation import (
    ApplyOperationsResponse,
    OperationPlanItem,
    OperationRecord,
    OperationStatus,
    PreviewOperationsResponse,
    UndoOperationResponse,
)
from app.services.ai_service import ai_service
from app.services.file_service import FileService
from app.utils.path_safety import (
    get_unique_destination_path,
    is_safe_subpath,
    resolve_and_validate_directory,
    sanitize_relative_path,
    validate_subpath_or_raise,
)


class OrganizationService:
    """Coordinates previewing, applying, and undoing file organization batches."""

    @staticmethod
    def preview_operations(folder_path_str: str, items: list[OperationPlanItem]) -> PreviewOperationsResponse:
        root_dir = resolve_and_validate_directory(folder_path_str)
        checked_items: list[OperationPlanItem] = []
        conflicts_count = 0
        total_moves = 0

        # Track targets claimed in this batch to detect internal collisions
        seen_targets: set[str] = set()

        for item in items:
            checked = item.model_copy()
            clean_target = sanitize_relative_path(checked.target_relative_path)
            checked.target_relative_path = clean_target

            # Verify security
            if not is_safe_subpath(root_dir, Path(clean_target)):
                checked.conflict = True
                checked.conflict_reason = "Path traversal detected; destination escapes root directory."
                conflicts_count += 1
                checked_items.append(checked)
                continue

            # Verify source exists
            source_path = root_dir / checked.original_relative_path
            if not source_path.exists():
                checked.conflict = True
                checked.conflict_reason = "Source file no longer exists."
                conflicts_count += 1
                checked_items.append(checked)
                continue

            target_path = root_dir / clean_target
            lower_target = clean_target.lower()

            # Check if source and target are identical
            if source_path.resolve() == target_path.resolve():
                checked.conflict = False
                checked.conflict_reason = "File already at proposed destination."
                checked_items.append(checked)
                continue

            # Check if destination file already exists on disk
            if target_path.exists():
                checked.conflict = True
                # Provide unique candidate in conflict reason
                unique_candidate = get_unique_destination_path(root_dir, clean_target)
                checked.conflict_reason = f"Destination already exists. Safe alternative: '{unique_candidate}'"
                conflicts_count += 1
            # Check internal batch duplication
            elif lower_target in seen_targets:
                checked.conflict = True
                unique_candidate = get_unique_destination_path(root_dir, clean_target)
                checked.conflict_reason = f"Duplicate target in this batch. Alternative: '{unique_candidate}'"
                conflicts_count += 1
            else:
                checked.conflict = False
                checked.conflict_reason = None
                seen_targets.add(lower_target)
                total_moves += 1

            checked_items.append(checked)

        safe_to_apply = (conflicts_count == 0)

        return PreviewOperationsResponse(
            folder_path=str(root_dir),
            items=checked_items,
            total_moves=total_moves,
            conflicts_count=conflicts_count,
            safe_to_apply=safe_to_apply,
        )

    @staticmethod
    def apply_operations(folder_path_str: str, items: list[OperationPlanItem]) -> ApplyOperationsResponse:
        root_dir = resolve_and_validate_directory(folder_path_str)
        batch_id = str(uuid.uuid4())
        now_iso = datetime.now(timezone.utc).isoformat()

        records_to_save: list[OperationRecord] = []
        completed_count = 0
        failed_count = 0

        for item in items:
            if not item.approved:
                continue

            record_id = str(uuid.uuid4())
            clean_target = sanitize_relative_path(item.target_relative_path)

            try:
                # If target already exists on disk, resolve unique to prevent silent overwrite
                final_target_rel = clean_target
                target_full = root_dir / clean_target
                source_full = root_dir / item.original_relative_path

                if target_full.exists() and source_full.resolve() != target_full.resolve():
                    final_target_rel = get_unique_destination_path(root_dir, clean_target)

                # Execute filesystem move
                FileService.move_or_rename_file(root_dir, item.original_relative_path, final_target_rel)

                record = OperationRecord(
                    id=record_id,
                    batch_id=batch_id,
                    folder_path=str(root_dir),
                    original_relative_path=item.original_relative_path,
                    final_relative_path=final_target_rel,
                    status=OperationStatus.COMPLETED,
                    created_at=now_iso,
                    size_bytes=item.size_bytes,
                    formatted_size=item.formatted_size,
                )
                completed_count += 1
            except Exception as e:
                logger.error(f"Failed to move {item.original_relative_path}: {e}")
                record = OperationRecord(
                    id=record_id,
                    batch_id=batch_id,
                    folder_path=str(root_dir),
                    original_relative_path=item.original_relative_path,
                    final_relative_path=clean_target,
                    status=OperationStatus.FAILED,
                    created_at=now_iso,
                    error_message=str(e),
                    size_bytes=item.size_bytes,
                    formatted_size=item.formatted_size,
                )
                failed_count += 1

            records_to_save.append(record)

        if records_to_save:
            operation_repo.save_batch(records_to_save)

        summary_msg = f"Completed {completed_count} operations safely."
        if failed_count > 0:
            summary_msg += f" {failed_count} operations failed."

        return ApplyOperationsResponse(
            folder_path=str(root_dir),
            batch_id=batch_id,
            completed_count=completed_count,
            failed_count=failed_count,
            results=records_to_save,
            message=summary_msg,
        )

    @staticmethod
    def undo_operation(operation_id: str) -> UndoOperationResponse:
        record = operation_repo.get_operation(operation_id)
        if not record:
            raise UndoNotPermittedException(f"Operation record '{operation_id}' not found.")

        if record.is_undone or record.status == OperationStatus.UNDONE:
            return UndoOperationResponse(
                operation_id=operation_id,
                success=True,
                restored_path=record.original_relative_path,
                message="Operation was already undone previously.",
            )

        if record.status != OperationStatus.COMPLETED:
            raise UndoNotPermittedException(f"Cannot undo operation with status '{record.status}'.")

        root_dir = Path(record.folder_path)
        if not root_dir.exists():
            raise DirectoryNotFoundException(f"Original folder '{record.folder_path}' no longer exists.")

        current_path = root_dir / record.final_relative_path
        original_path = root_dir / record.original_relative_path

        if not current_path.exists():
            raise UndoNotPermittedException(
                f"Cannot undo: File at current location '{record.final_relative_path}' no longer exists."
            )

        if original_path.exists() and current_path.resolve() != original_path.resolve():
            raise UndoNotPermittedException(
                f"Cannot undo: Original location '{record.original_relative_path}' is occupied by another file."
            )

        # Move file back
        try:
            original_path.parent.mkdir(parents=True, exist_ok=True)
            FileService.move_or_rename_file(root_dir, record.final_relative_path, record.original_relative_path)

            now_iso = datetime.now(timezone.utc).isoformat()
            operation_repo.mark_undone(operation_id, now_iso)

            # Cleanup empty parent directory of the moved file if empty
            try:
                if current_path.parent != root_dir and not any(current_path.parent.iterdir()):
                    current_path.parent.rmdir()
            except OSError:
                pass

            return UndoOperationResponse(
                operation_id=operation_id,
                success=True,
                restored_path=record.original_relative_path,
                message=f"Restored file to '{record.original_relative_path}'.",
            )
        except Exception as e:
            logger.error(f"Error during undo of {operation_id}: {e}")
            raise UndoNotPermittedException(f"Failed to reverse operation: {e}")


organization_service = OrganizationService()
