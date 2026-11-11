import base64
import numpy as np
from fastapi.testclient import TestClient

from api import main


def configure(monkeypatch, tmp_path):
    monkeypatch.setenv("BIOGUARD_API_TOKEN", "test-operator-secret")
    monkeypatch.setenv("BIOGUARD_ENCRYPTION_KEY", main.Fernet.generate_key().decode())
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "test.sqlite3")
    main.init_db()


def test_health_reports_calibration_gate(monkeypatch, tmp_path):
    configure(monkeypatch, tmp_path)
    with TestClient(main.app) as client:
        response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["verification_mode"] == "not_evaluated_until_calibrated"


def test_protected_enrollment_rejects_missing_auth(monkeypatch, tmp_path):
    configure(monkeypatch, tmp_path)
    with TestClient(main.app) as client:
        response = client.post("/api/v1/identities/enroll")
    assert response.status_code == 401


def test_feature_vectors_are_encrypted_and_round_trip(monkeypatch, tmp_path):
    configure(monkeypatch, tmp_path)
    vector = np.asarray([0.1, 0.2, 0.3], dtype=np.float32)
    main.store_template("BG-001", "face", vector)
    with main.db() as conn:
        encrypted = conn.execute(
            "SELECT encrypted_vector FROM templates WHERE identity_ref=?",
            ("BG-001",),
        ).fetchone()[0]
    assert encrypted != main.vector_bytes(vector)
    np.testing.assert_allclose(main.load_vector(encrypted), vector)


def test_identity_reference_validation():
    assert main.IDENTITY_RE.fullmatch("BG-00843")
    assert not main.IDENTITY_RE.fullmatch("bad ref")
    assert not main.IDENTITY_RE.fullmatch("x")
