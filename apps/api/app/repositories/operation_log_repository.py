import json
import os
import tempfile
from pathlib import Path
from typing import Any
from app.core.config import settings
from app.core.logging import logger
from app.schemas.operation import OperationRecord, OperationStatus


class OperationLogRepository:
    """
    Lightweight JSON-based repository for tracking completed file operations
    and supporting safe Undo functionality.
    """

    def __init__(self, storage_dir: Path | None = None):
        self.storage_dir = storage_dir or settings.SWEEPY_DATA_DIR
        self.storage_file = self.storage_dir / "operations_log.json"
        self._ensure_storage()

    def _ensure_storage(self) -> None:
        try:
            self.storage_dir.mkdir(parents=True, exist_ok=True)
            if not self.storage_file.exists():
                self._write_file([])
        except Exception as e:
            logger.error(f"Failed to initialize operations log storage: {e}")

    def _read_file(self) -> list[dict[str, Any]]:
        if not self.storage_file.exists():
            return []
        try:
            with open(self.storage_file, "r", encoding="utf-8") as f:
                content = f.read().strip()
                if not content:
                    return []
                return json.loads(content)
        except Exception as e:
            logger.error(f"Failed to read operation log: {e}")
            return []

    def _write_file(self, records: list[dict[str, Any]]) -> None:
        # Atomic write using temporary file to prevent corruption
        temp_file = None
        try:
            with tempfile.NamedTemporaryFile("w", dir=self.storage_dir, delete=False, encoding="utf-8") as f:
                json.dump(records, f, indent=2, ensure_ascii=False)
                temp_file = Path(f.name)

            temp_file.replace(self.storage_file)
        except Exception as e:
            logger.error(f"Failed to atomically write operation log: {e}")
            if temp_file and temp_file.exists():
                try:
                    temp_file.unlink()
                except OSError:
                    pass
            raise

    def save_batch(self, records: list[OperationRecord]) -> None:
        raw_list = self._read_file()
        new_entries = [rec.model_dump() for rec in records]
        # Insert at the beginning so most recent are first
        raw_list = new_entries + raw_list
        self._write_file(raw_list)

    def list_operations(self, limit: int = 50) -> list[OperationRecord]:
        raw_list = self._read_file()
        results: list[OperationRecord] = []
        for item in raw_list[:limit]:
            try:
                results.append(OperationRecord(**item))
            except Exception as e:
                logger.warning(f"Error parsing operation record: {e}")
        return results

    def get_operation(self, op_id: str) -> OperationRecord | None:
        raw_list = self._read_file()
        for item in raw_list:
            if item.get("id") == op_id:
                try:
                    return OperationRecord(**item)
                except Exception:
                    return None
        return None

    def mark_undone(self, op_id: str, undone_at: str) -> OperationRecord | None:
        raw_list = self._read_file()
        updated_record = None

        for item in raw_list:
            if item.get("id") == op_id:
                item["status"] = OperationStatus.UNDONE.value
                item["is_undone"] = True
                item["undone_at"] = undone_at
                try:
                    updated_record = OperationRecord(**item)
                except Exception:
                    pass
                break

        if updated_record:
            self._write_file(raw_list)

        return updated_record

    def get_total_completed_count(self) -> int:
        raw_list = self._read_file()
        return sum(1 for item in raw_list if item.get("status") == OperationStatus.COMPLETED.value)


# Global singleton instance
operation_repo = OperationLogRepository()
