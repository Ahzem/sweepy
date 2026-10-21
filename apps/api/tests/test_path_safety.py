import pytest
from pathlib import Path
from app.core.exceptions import DirectoryNotFoundException, PathSecurityException
from app.utils.path_safety import (
    get_unique_destination_path,
    is_safe_subpath,
    is_valid_windows_filename,
    resolve_and_validate_directory,
    sanitize_relative_path,
    sanitize_windows_filename,
    validate_subpath_or_raise,
)


def test_is_valid_windows_filename():
    assert is_valid_windows_filename("clean_document.pdf")[0] is True
    assert is_valid_windows_filename("photo (2026).jpg")[0] is True
    assert is_valid_windows_filename("")[0] is False
    assert is_valid_windows_filename("bad:name.txt")[0] is False
    assert is_valid_windows_filename("bad*name.txt")[0] is False
    assert is_valid_windows_filename("bad?name.txt")[0] is False
    assert is_valid_windows_filename("trailing_dot.")[0] is False
    assert is_valid_windows_filename("trailing_space ")[0] is False
    assert is_valid_windows_filename("CON.txt")[0] is False
    assert is_valid_windows_filename("NUL")[0] is False
    assert is_valid_windows_filename("com1.pdf")[0] is False


def test_sanitize_windows_filename():
    assert sanitize_windows_filename("bad:file*name?.pdf") == "bad_file_name_.pdf"
    assert sanitize_windows_filename("ending_dot. ") == "ending_dot"
    assert sanitize_windows_filename("CON.txt") == "_CON.txt"
    assert sanitize_windows_filename("") == "unnamed_file"


def test_sanitize_relative_path():
    assert sanitize_relative_path("Documents/Invoices/invoice.pdf") == "Documents/Invoices/invoice.pdf"
    assert sanitize_relative_path("..\\..\\Windows\\System32\\cmd.exe") == "Windows/System32/cmd.exe"
    assert sanitize_relative_path("Images/2026:10/photo?.jpg") == "Images/2026_10/photo_.jpg"


def test_path_traversal_detection(tmp_path):
    root_dir = tmp_path / "sandbox"
    root_dir.mkdir()

    outside_file = tmp_path / "outside.txt"
    outside_file.write_text("danger")

    # Safe inside subpath
    inside_file = Path("nested/file.txt")
    assert is_safe_subpath(root_dir, inside_file) is True

    # Traversal escape
    traversal_path = Path("../../outside.txt")
    assert is_safe_subpath(root_dir, traversal_path) is False

    with pytest.raises(PathSecurityException):
        validate_subpath_or_raise(root_dir, traversal_path)


def test_unique_destination_generation(tmp_path):
    root_dir = tmp_path / "sandbox"
    root_dir.mkdir()

    # Destination does not exist yet
    rel1 = get_unique_destination_path(root_dir, "report.pdf")
    assert rel1 == "report.pdf"

    # Now create report.pdf
    (root_dir / "report.pdf").write_text("existing")
    rel2 = get_unique_destination_path(root_dir, "report.pdf")
    assert rel2 == "report (1).pdf"

    # Now create report (1).pdf
    (root_dir / "report (1).pdf").write_text("existing copy")
    rel3 = get_unique_destination_path(root_dir, "report.pdf")
    assert rel3 == "report (2).pdf"


def test_resolve_and_validate_directory(tmp_path):
    non_existent = tmp_path / "does_not_exist_folder"
    with pytest.raises(DirectoryNotFoundException):
        resolve_and_validate_directory(str(non_existent))

    valid_dir = tmp_path / "valid_folder"
    valid_dir.mkdir()
    resolved = resolve_and_validate_directory(str(valid_dir))
    assert resolved.exists()
