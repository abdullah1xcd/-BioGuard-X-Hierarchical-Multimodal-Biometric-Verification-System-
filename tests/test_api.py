import base64
import numpy as np
from fastapi.testclient import TestClient

from api import main


def configure(monkeypatch, tmp_path):
    monkeypatch.setenv("BIOGUARD_API_TOKEN", "test-operator-secret")
    monkeypatch.setenv("BIOGUARD_ENCRYPTION_KEY", main.Fernet.generate_key().decode())
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "test.sqlite3")
    monkeypatch.setattr(main, "MODEL_PATH", tmp_path / "missing-model.joblib")
    monkeypatch.setattr(main, "_MODEL_CACHE", None)
    monkeypatch.setattr(main, "_MODEL_CACHE_MTIME", None)
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
    with main.db() as conn:
        conn.execute("INSERT INTO identities VALUES (?, ?, ?, ?, ?, 1)", ("BG-001", "Test Person", None, main.utc_now(), "test-v1"))
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

def test_enrollment_and_verification_never_make_access_decision(monkeypatch, tmp_path):
    import cv2
    import json

    configure(monkeypatch, tmp_path)
    sample = np.random.default_rng(7).integers(0, 256, (160, 160), dtype=np.uint8)
    ok, encoded = cv2.imencode(".png", sample)
    assert ok
    image_bytes = encoded.tobytes()
    headers = {"Authorization": "Bearer test-operator-secret"}

    with TestClient(main.app) as client:
        enrolled = client.post(
            "/api/v1/identities/enroll",
            headers=headers,
            data={
                "profile": json.dumps({"full_name": "Test Person", "identity_ref": "BG-TEST-01"}),
                "modalities": json.dumps(["face"]),
                "consent": json.dumps({"granted": True, "policy_version": "test-v1"}),
            },
            files={"face_sample": ("face.png", image_bytes, "image/png")},
        )
        assert enrolled.status_code == 201, enrolled.text

        verified = client.post(
            "/api/v1/verification/multimodal",
            headers=headers,
            data={
                "claimed_identity_ref": "BG-TEST-01",
                "modalities": json.dumps(["face"]),
                "authorization": json.dumps({"authorized": True, "purpose": "Automated test"}),
            },
            files={"face_sample": ("probe.png", image_bytes, "image/png")},
        )
    assert verified.status_code == 200, verified.text
    assert verified.json()["outcome"] == "not_evaluated"
    assert verified.json()["policy_decision"] == "pending"
    assert verified.json()["reason_code"] == "CALIBRATION_REQUIRED"



def test_email_validation_rejects_malformed_values(monkeypatch, tmp_path):
    import json

    configure(monkeypatch, tmp_path)
    headers = {"Authorization": "Bearer test-operator-secret"}
    with TestClient(main.app) as client:
        response = client.post(
            "/api/v1/identities/enroll",
            headers=headers,
            data={
                "profile": json.dumps({
                    "full_name": "Test Person",
                    "identity_ref": "BG-EMAIL-01",
                    "email": "not-an-email",
                }),
                "modalities": json.dumps(["face"]),
                "consent": json.dumps({"granted": True, "policy_version": "test-v1"}),
            },
        )
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "INVALID_EMAIL"


def test_consent_policy_version_must_be_a_string(monkeypatch, tmp_path):
    import json

    configure(monkeypatch, tmp_path)
    headers = {"Authorization": "Bearer test-operator-secret"}
    with TestClient(main.app) as client:
        response = client.post(
            "/api/v1/identities/enroll",
            headers=headers,
            data={
                "profile": json.dumps({"full_name": "Test Person", "identity_ref": "BG-CONSENT-01"}),
                "modalities": json.dumps(["face"]),
                "consent": json.dumps({"granted": True, "policy_version": ["unexpected"]}),
            },
        )
    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "CONSENT_REQUIRED"


def test_audio_and_fingerprint_extractors_return_finite_features():
    import io
    import soundfile as sf

    fingerprint = np.random.default_rng(11).integers(0, 256, (160, 160), dtype=np.uint8)
    ok, encoded = main.cv2.imencode(".png", fingerprint)
    assert ok
    fingerprint_vector = main.image_features(encoded.tobytes(), "fingerprint")
    assert fingerprint_vector.shape == (24,)
    assert np.isfinite(fingerprint_vector).all()

    sample_rate = 16000
    time = np.arange(sample_rate, dtype=np.float32) / sample_rate
    signal = (0.2 * np.sin(2 * np.pi * 220 * time)).astype(np.float32)
    audio_buffer = io.BytesIO()
    sf.write(audio_buffer, signal, sample_rate, format="WAV")
    voice_vector = main.audio_features(audio_buffer.getvalue())
    assert voice_vector.shape == (30,)
    assert np.isfinite(voice_vector).all()


def test_verification_requires_uploaded_sample_even_without_enrollment_template(monkeypatch, tmp_path):
    import json

    configure(monkeypatch, tmp_path)
    with main.db() as conn:
        conn.execute(
            "INSERT INTO identities VALUES (?, ?, ?, ?, ?, 1)",
            ("BG-NO-VOICE", "Test Person", None, main.utc_now(), "test-v1"),
        )
    headers = {"Authorization": "Bearer test-operator-secret"}
    with TestClient(main.app) as client:
        response = client.post(
            "/api/v1/verification/multimodal",
            headers=headers,
            data={
                "claimed_identity_ref": "BG-NO-VOICE",
                "modalities": json.dumps(["voice"]),
                "authorization": json.dumps({"authorized": True, "purpose": "Test missing sample"}),
            },
        )
    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "MISSING_SAMPLE"


def test_api_feature_vectors_match_training_pipeline_dimensions(monkeypatch, tmp_path):
    import cv2
    import soundfile as sf
    from src.bioguard_ml import face_features, voice_features

    configure(monkeypatch, tmp_path)
    image = np.random.default_rng(27).integers(0, 256, (160, 160), dtype=np.uint8)
    ok, encoded = cv2.imencode(".png", image)
    assert ok
    api_face = main.image_features(encoded.tobytes(), "face")
    face_path = tmp_path / "face.png"
    assert cv2.imwrite(str(face_path), image)
    training_face = face_features(face_path)
    np.testing.assert_allclose(api_face, np.concatenate((training_face["hog"], training_face["lbp"])), rtol=1e-5, atol=1e-6)

    sample_rate = 16000
    time = np.arange(sample_rate, dtype=np.float32) / sample_rate
    signal = (0.2 * np.sin(2 * np.pi * 220 * time)).astype(np.float32)
    audio_path = tmp_path / "voice.wav"
    sf.write(audio_path, signal, sample_rate)
    api_voice = main.audio_features(audio_path.read_bytes())
    training_voice = voice_features(audio_path)
    np.testing.assert_allclose(api_voice, training_voice, rtol=1e-5, atol=1e-6)


def test_api_uses_configured_model_but_keeps_policy_pending(monkeypatch, tmp_path):
    import json
    import cv2
    import joblib
    from sklearn.dummy import DummyClassifier

    configure(monkeypatch, tmp_path)
    classifier = DummyClassifier(strategy="constant", constant=1)
    classifier.fit(np.zeros((2, 8356), dtype=np.float32), np.asarray([0, 1]))
    model_path = tmp_path / "trained.joblib"
    joblib.dump({
        "feature_version": "bioguard-traditional-v1",
        "face": {"SVM": {"model": classifier, "threshold": 0.5}},
    }, model_path)
    monkeypatch.setattr(main, "MODEL_PATH", model_path)
    monkeypatch.setattr(main, "_MODEL_CACHE", None)
    monkeypatch.setattr(main, "_MODEL_CACHE_MTIME", None)

    sample = np.random.default_rng(71).integers(0, 256, (160, 160), dtype=np.uint8)
    ok, encoded = cv2.imencode(".png", sample)
    assert ok
    headers = {"Authorization": "Bearer test-operator-secret"}
    with TestClient(main.app) as client:
        enrolled = client.post(
            "/api/v1/identities/enroll", headers=headers,
            data={
                "profile": json.dumps({"full_name": "Test Person", "identity_ref": "BG-MODEL-01"}),
                "modalities": json.dumps(["face"]),
                "consent": json.dumps({"granted": True, "policy_version": "test-v1"}),
            },
            files={"face_sample": ("face.png", encoded.tobytes(), "image/png")},
        )
        assert enrolled.status_code == 201, enrolled.text
        verified = client.post(
            "/api/v1/verification/multimodal", headers=headers,
            data={
                "claimed_identity_ref": "BG-MODEL-01",
                "modalities": json.dumps(["face"]),
                "authorization": json.dumps({"authorized": True, "purpose": "Integration test"}),
            },
            files={"face_sample": ("probe.png", encoded.tobytes(), "image/png")},
        )
    assert verified.status_code == 200, verified.text
    assert verified.json()["outcome"] == "match"
    assert verified.json()["policy_decision"] == "pending"
    assert verified.json()["reason_code"] == "EXPERIMENTAL_MODEL_RESULT"
