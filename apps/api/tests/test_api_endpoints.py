from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["app"] == "Sweepy API"


def test_ai_status_endpoint():
    res = client.get("/api/v1/ai/status")
    assert res.status_code == 200
    data = res.json()
    assert "connected" in data
    assert "model" in data


def test_validate_folder_endpoint(tmp_path):
    # Non-existent
    bad_res = client.post("/api/v1/folders/validate", json={"path": str(tmp_path / "missing")})
    assert bad_res.status_code == 404

    # Valid
    good_dir = tmp_path / "my_folder"
    good_dir.mkdir()
    res = client.post("/api/v1/folders/validate", json={"path": str(good_dir)})
    assert res.status_code == 200
    data = res.json()
    assert data["exists"] is True
    assert data["is_dir"] is True


def test_scan_folder_endpoint(tmp_path):
    scan_dir = tmp_path / "scan_me"
    scan_dir.mkdir()
    (scan_dir / "sample.pdf").write_bytes(b"content")

    res = client.post(
        "/api/v1/folders/scan",
        json={"path": str(scan_dir), "recursive": False, "max_files": 100},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total_files"] == 1
    assert data["files"][0]["name"] == "sample.pdf"
