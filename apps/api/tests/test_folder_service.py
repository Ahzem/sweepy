from pathlib import Path
from app.services.folder_service import FolderService


def test_scan_folder_flat(tmp_path):
    test_dir = tmp_path / "downloads_mock"
    test_dir.mkdir()

    # Create sample files
    (test_dir / "invoice_1.pdf").write_bytes(b"pdf content")
    (test_dir / "photo.jpg").write_bytes(b"jpg content")
    (test_dir / "music.mp3").write_bytes(b"mp3 content")
    (test_dir / ".hidden_file.txt").write_bytes(b"hidden")

    # Excluded directory
    git_dir = test_dir / ".git"
    git_dir.mkdir()
    (git_dir / "config").write_bytes(b"git config")

    res = FolderService.scan_folder(str(test_dir), recursive=False, include_hidden=False)

    assert res.total_files == 3
    file_names = {f.name for f in res.files}
    assert "invoice_1.pdf" in file_names
    assert "photo.jpg" in file_names
    assert "music.mp3" in file_names
    assert ".hidden_file.txt" not in file_names


def test_scan_folder_recursive(tmp_path):
    test_dir = tmp_path / "deep_folder"
    test_dir.mkdir()

    sub1 = test_dir / "subfolder"
    sub1.mkdir()
    (test_dir / "root_file.txt").write_bytes(b"root")
    (sub1 / "nested_file.png").write_bytes(b"nested")

    # Recursive scan
    res = FolderService.scan_folder(str(test_dir), recursive=True)
    assert res.total_files == 2
    rel_paths = {f.relative_path for f in res.files}
    assert "root_file.txt" in rel_paths
    assert "subfolder/nested_file.png" in rel_paths


def test_scan_folder_max_files_limit(tmp_path):
    test_dir = tmp_path / "many_files"
    test_dir.mkdir()

    for i in range(15):
        (test_dir / f"file_{i}.txt").write_bytes(b"test")

    res = FolderService.scan_folder(str(test_dir), max_files=10)
    assert res.total_files == 10
    assert res.truncated is True
