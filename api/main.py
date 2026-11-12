"""BioGuard X experimental API.

This isolated adapter uses feature extractors aligned with the new traditional-ML
training pipeline. Trained bundles can produce experimental match/no-match
outputs; policy decisions remain pending and are never used to grant access.
It does not claim parity with the missing original research implementation.
"""
from __future__ import annotations

import base64
import hmac
import io
import json
import os
import re
import sqlite3
import uuid
from datetime import datetime, timezone
from contextlib import asynccontextmanager, contextmanager
from pathlib import Path
from typing import Annotated

import cv2
import numpy as np
import joblib
import soundfile as sf
from cryptography.fernet import Fernet, InvalidToken
from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from scipy.fft import dct
from scipy.signal import resample_poly
from pydantic import BaseModel, Field

APP_DIR = Path(__file__).resolve().parent
DB_PATH = Path(os.getenv("BIOGUARD_DB_PATH", str(APP_DIR / "bioguard.sqlite3")))
MODEL_PATH = Path(os.getenv("BIOGUARD_MODEL_PATH", str(APP_DIR.parent / "reports" / "bioguard_traditional_ml.joblib")))
_MODEL_CACHE = None
_MODEL_CACHE_MTIME = None
MAX_BYTES = {"face": 10 * 1024 * 1024, "voice": 20 * 1024 * 1024, "fingerprint": 10 * 1024 * 1024}
ALLOWED = {"face", "voice", "fingerprint"}
IDENTITY_RE = re.compile(r"^[A-Za-z0-9_-]{3,32}$")
bearer = HTTPBearer(auto_error=False)

@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="BioGuard X API",
    version="0.1.0",
    description="Experimental API. Verification decisions are disabled pending calibration.",
    lifespan=lifespan,
)
origins = [x.strip() for x in os.getenv("BIOGUARD_CORS_ORIGINS", "http://localhost:5500,http://127.0.0.1:5500").split(",") if x.strip()]
app.add_middleware(
    CORSMiddleware, allow_origins=origins, allow_credentials=False,
    allow_methods=["GET", "POST"], allow_headers=["Authorization", "Content-Type"],
)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_fernet() -> Fernet:
    key = os.getenv("BIOGUARD_ENCRYPTION_KEY", "")
    if not key:
        raise RuntimeError("BIOGUARD_ENCRYPTION_KEY is not configured")
    try:
        return Fernet(key.encode("ascii"))
    except Exception as exc:
        raise RuntimeError("BIOGUARD_ENCRYPTION_KEY must be a valid Fernet key") from exc


@contextmanager
def db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=15)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> None:
    with db() as conn:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS identities (
          identity_ref TEXT PRIMARY KEY, full_name TEXT NOT NULL,
          email TEXT, created_at TEXT NOT NULL, consent_version TEXT NOT NULL,
          active INTEGER NOT NULL DEFAULT 1
        );
        CREATE TABLE IF NOT EXISTS templates (
          identity_ref TEXT NOT NULL REFERENCES identities(identity_ref),
          modality TEXT NOT NULL, encrypted_vector BLOB NOT NULL,
          extractor_version TEXT NOT NULL, created_at TEXT NOT NULL,
          PRIMARY KEY(identity_ref, modality)
        );
        CREATE TABLE IF NOT EXISTS audit_events (
          event_id TEXT PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL,
          identity_ref TEXT, modalities TEXT NOT NULL, outcome TEXT NOT NULL,
          created_at TEXT NOT NULL, request_id TEXT NOT NULL
        );
        """)


def require_operator(credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]) -> str:
    expected = os.getenv("BIOGUARD_API_TOKEN", "")
    if not expected:
        raise HTTPException(status_code=503, detail={"code": "AUTH_NOT_CONFIGURED", "message": "API operator authentication is not configured."})
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail={"code": "AUTH_REQUIRED", "message": "Operator authentication is required."})
    supplied = credentials.credentials.encode()
    expected_bytes = expected.encode()
    if not hmac.compare_digest(supplied, expected_bytes):
        raise HTTPException(status_code=401, detail={"code": "INVALID_CREDENTIALS", "message": "Authentication failed."})
    return "api-operator"


def write_audit(conn: sqlite3.Connection, actor: str, action: str, identity_ref: str | None,
                modalities: list[str], outcome: str, request_id: str) -> str:
    """Insert metadata-only audit data using the caller's transaction."""
    event_id = str(uuid.uuid4())
    conn.execute(
        "INSERT INTO audit_events VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (event_id, actor, action, identity_ref, json.dumps(modalities), outcome, utc_now(), request_id),
    )
    return event_id


def audit(actor: str, action: str, identity_ref: str | None, modalities: list[str], outcome: str, request_id: str) -> str:
    with db() as conn:
        return write_audit(conn, actor, action, identity_ref, modalities, outcome, request_id)


@app.middleware("http")
async def audit_failed_api_requests(request: Request, call_next):
    """Audit failed enrollment/verification attempts without logging request content."""
    action = {
        "/api/v1/identities/enroll": "identity_enrollment",
        "/api/v1/verification/multimodal": "biometric_verification",
    }.get(request.url.path)

    def record_failure(outcome: str) -> None:
        if not action:
            return
        auth_scheme, _, supplied_token = request.headers.get("authorization", "").partition(" ")
        expected_token = os.getenv("BIOGUARD_API_TOKEN", "")
        authenticated = (
            auth_scheme.lower() == "bearer" and bool(expected_token)
            and hmac.compare_digest(supplied_token.encode(), expected_token.encode())
        )
        request_id = str(uuid.uuid4())
        try:
            audit(
                "api-operator" if authenticated else "unauthenticated",
                action + "_failed",
                None,
                [],
                outcome,
                request_id,
            )
        except sqlite3.Error:
            # Do not replace the original request error if the audit store is unavailable.
            pass

    try:
        response = await call_next(request)
    except Exception:
        record_failure("internal_error")
        raise
    if action and response.status_code >= 400:
        record_failure(f"http_{response.status_code}")
    return response


def parse_modalities(raw: str) -> list[str]:
    try:
        values = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise HTTPException(400, detail={"code": "INVALID_MODALITIES", "message": "Modalities must be a JSON array."}) from exc
    if (not isinstance(values, list) or not values
            or any(not isinstance(x, str) for x in values)
            or len(values) != len(set(values))
            or any(x not in ALLOWED for x in values)):
        raise HTTPException(400, detail={"code": "INVALID_MODALITIES", "message": "Choose one or more supported, unique modalities."})
    return values


async def read_sample(upload: UploadFile | None, modality: str) -> bytes:
    if upload is None:
        raise HTTPException(400, detail={"code": "MISSING_SAMPLE", "message": f"A {modality} sample is required."})
    data = await upload.read(MAX_BYTES[modality] + 1)
    if not data or len(data) > MAX_BYTES[modality]:
        raise HTTPException(413, detail={"code": "SAMPLE_SIZE_INVALID", "message": f"The {modality} sample is empty or exceeds its size limit."})
    return data


def image_array(data: bytes) -> np.ndarray:
    image = cv2.imdecode(np.frombuffer(data, dtype=np.uint8), cv2.IMREAD_GRAYSCALE)
    if image is None or image.size == 0:
        raise ValueError("Image cannot be decoded")
    if image.size > 25_000_000:
        raise ValueError("Image dimensions exceed the processing limit")
    if min(image.shape) < 64:
        raise ValueError("Image resolution is too small")
    return image


def image_features(data: bytes, modality: str) -> np.ndarray:
    image = image_array(data)
    image = cv2.resize(image, (128, 128), interpolation=cv2.INTER_AREA)
    image = cv2.equalizeHist(image)
    if modality == "face":
        # Must remain feature-compatible with src.bioguard_ml.face_features.
        hog = cv2.HOGDescriptor((128, 128), (16, 16), (8, 8), (8, 8), 9)
        hog_vector = hog.compute(image).reshape(-1).astype(np.float32)
        center = image[1:-1, 1:-1]
        neighbors = (image[:-2, :-2], image[:-2, 1:-1], image[:-2, 2:], image[1:-1, 2:], image[2:, 2:], image[2:, 1:-1], image[2:, :-2], image[1:-1, :-2])
        lbp = np.zeros(center.shape, dtype=np.uint8)
        for bit, neighbor in enumerate(neighbors):
            lbp |= ((neighbor >= center).astype(np.uint8) << bit)
        histogram = np.bincount(lbp.ravel(), minlength=256).astype(np.float32)
        histogram /= max(float(histogram.sum()), 1.0)
        vector = np.concatenate((hog_vector, histogram))
    else:
        # Baseline multi-orientation Gabor response statistics for fingerprint texture.
        parts = []
        for theta in np.linspace(0, np.pi, 8, endpoint=False):
            kernel = cv2.getGaborKernel((21, 21), 4.0, float(theta), 10.0, 0.5, 0, ktype=cv2.CV_32F)
            response = cv2.filter2D(image.astype(np.float32) / 255.0, cv2.CV_32F, kernel)
            parts.extend([float(response.mean()), float(response.std()), float(np.mean(np.abs(response)))])
        vector = np.asarray(parts, dtype=np.float32)
    return vector.astype(np.float32)


def audio_features(data: bytes) -> np.ndarray:
    audio, sample_rate = sf.read(io.BytesIO(data), dtype="float32", always_2d=True)
    if audio.size == 0 or sample_rate < 8000:
        raise ValueError("Audio is empty or sample rate is unsupported")
    if not np.isfinite(audio).all():
        raise ValueError("Audio contains non-finite samples")
    signal = audio.mean(axis=1)
    if len(signal) < sample_rate // 2:
        raise ValueError("Voice sample must be at least 0.5 seconds")
    if sample_rate != 16000:
        divisor = int(np.gcd(sample_rate, 16000))
        signal = resample_poly(signal, 16000 // divisor, sample_rate // divisor)
        sample_rate = 16000
    # Compact MFCC-style statistics (pre-emphasis, framing, mel filterbank, DCT).
    signal = np.append(signal[0], signal[1:] - 0.97 * signal[:-1])
    frame_len, hop = 400, 160
    if len(signal) < frame_len:
        raise ValueError("Voice sample is too short")
    frames = np.stack([signal[i:i + frame_len] for i in range(0, len(signal) - frame_len + 1, hop)])
    frames *= np.hamming(frame_len).astype(np.float32)
    power = np.abs(np.fft.rfft(frames, n=512)) ** 2
    mel = lambda hz: 2595.0 * np.log10(1.0 + hz / 700.0)
    hz = lambda m: 700.0 * (10.0 ** (m / 2595.0) - 1.0)
    points = hz(np.linspace(mel(0), mel(8000), 28))
    bins = np.floor((513) * points / 16000).astype(int)
    filters = np.zeros((26, 257), dtype=np.float32)
    for m in range(1, 27):
        left, center, right = bins[m - 1:m + 2]
        for k in range(max(0, left), min(center, 257)):
            filters[m - 1, k] = (k - left) / max(1, center - left)
        for k in range(max(0, center), min(right, 257)):
            filters[m - 1, k] = (right - k) / max(1, right - center)
    energies = np.log(np.maximum(power @ filters.T, 1e-10))
    coeffs = dct(energies, type=2, axis=1, norm="ortho")[:, :13]
    zcr = np.mean(np.abs(np.diff(np.signbit(frames), axis=1)), axis=1)
    rms = np.sqrt(np.mean(frames ** 2, axis=1))
    return np.concatenate([coeffs.mean(axis=0), coeffs.std(axis=0), [zcr.mean(), zcr.std(), rms.mean(), rms.std()]]).astype(np.float32)


def extract(data: bytes, modality: str) -> np.ndarray:
    if modality == "voice":
        return audio_features(data)
    return image_features(data, modality)



def load_model_bundle():
    """Load only a locally configured, versioned training artifact."""
    global _MODEL_CACHE, _MODEL_CACHE_MTIME
    if not MODEL_PATH.is_file():
        return None
    modified = MODEL_PATH.stat().st_mtime_ns
    if _MODEL_CACHE is None or _MODEL_CACHE_MTIME != modified:
        candidate = joblib.load(MODEL_PATH)
        if not isinstance(candidate, dict) or candidate.get("feature_version") != "bioguard-traditional-v1":
            raise RuntimeError("Model bundle is missing or has an unsupported feature version")
        _MODEL_CACHE = candidate
        _MODEL_CACHE_MTIME = modified
    return _MODEL_CACHE


def model_score(bundle: dict, key: str, first: np.ndarray, second: np.ndarray) -> tuple[float, float]:
    entry = bundle.get(key, {}).get("SVM")
    if not entry or "model" not in entry or "threshold" not in entry:
        raise KeyError(f"Calibrated SVM is missing for {key}")
    pair = np.abs(first - second).astype(np.float32).reshape(1, -1)
    score = float(entry["model"].predict_proba(pair)[0, 1])
    return score, float(entry["threshold"])

def vector_bytes(vector: np.ndarray) -> bytes:
    return np.asarray(vector, dtype="<f4").tobytes()


def load_vector(blob: bytes) -> np.ndarray:
    return np.frombuffer(get_fernet().decrypt(blob), dtype="<f4").copy()


def store_template(identity_ref: str, modality: str, vector: np.ndarray) -> None:
    encrypted = get_fernet().encrypt(vector_bytes(vector))
    with db() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO templates VALUES (?, ?, ?, ?, ?)",
            (identity_ref, modality, encrypted, "baseline-handcrafted-v1", utc_now()),
        )


class HealthResponse(BaseModel):
    status: str
    api_version: str
    verification_mode: str
    encryption_configured: bool
    database_connected: bool


@app.get("/api/v1/health", response_model=HealthResponse)
def health():
    try:
        get_fernet()
        encryption_configured = True
    except RuntimeError:
        encryption_configured = False
    try:
        with db() as conn:
            conn.execute("SELECT 1").fetchone()
        database_connected = True
    except sqlite3.Error:
        database_connected = False
    ready = encryption_configured and database_connected
    return HealthResponse(
        status="ready" if ready else "configuration_required" if not encryption_configured else "degraded",
        api_version="0.1.0",
        verification_mode=("model_artifact_present_not_validated" if MODEL_PATH.is_file() else "not_evaluated_until_calibrated"),
        encryption_configured=encryption_configured,
        database_connected=database_connected,
    )


@app.post("/api/v1/identities/enroll", status_code=status.HTTP_201_CREATED)
async def enroll(
    profile: str = Form(...), modalities: str = Form(...), consent: str = Form(...),
    face_sample: UploadFile | None = File(None), voice_sample: UploadFile | None = File(None),
    fingerprint_sample: UploadFile | None = File(None), actor: str = Depends(require_operator),
):
    request_id = str(uuid.uuid4())
    try:
        profile_data = json.loads(profile)
        consent_data = json.loads(consent)
    except json.JSONDecodeError as exc:
        raise HTTPException(400, detail={"code": "INVALID_JSON", "message": "Profile and consent must be valid JSON."}) from exc
    if not isinstance(profile_data, dict) or not isinstance(consent_data, dict):
        raise HTTPException(400, detail={"code": "INVALID_PROFILE", "message": "Profile and consent must be JSON objects."})
    raw_name = profile_data.get("full_name")
    raw_ref = profile_data.get("identity_ref")
    if not isinstance(raw_name, str) or not isinstance(raw_ref, str):
        raise HTTPException(422, detail={"code": "INVALID_PROFILE", "message": "Full name and identity reference must be strings."})
    name = raw_name.strip()
    identity_ref = raw_ref.strip()
    if not 2 <= len(name) <= 100 or not IDENTITY_RE.fullmatch(identity_ref):
        raise HTTPException(422, detail={"code": "INVALID_PROFILE", "message": "Provide a valid full name and identity reference."})
    policy_version = consent_data.get("policy_version")
    if (consent_data.get("granted") is not True or not isinstance(policy_version, str)
            or not 1 <= len(policy_version.strip()) <= 40):
        raise HTTPException(403, detail={"code": "CONSENT_REQUIRED", "message": "Explicit consent and a valid policy version are required."})
    email = profile_data.get("email")
    if email is not None:
        if (not isinstance(email, str) or len(email.strip()) > 254
                or not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email.strip())):
            raise HTTPException(422, detail={"code": "INVALID_EMAIL", "message": "Provide a valid email address or leave it empty."})
        email = email.strip().lower()
    selected = parse_modalities(modalities)
    supplied = {"face": face_sample, "voice": voice_sample, "fingerprint": fingerprint_sample}
    if any(supplied[k] is None for k in selected):
        raise HTTPException(400, detail={"code": "MISSING_SAMPLE", "message": "Upload a sample for every selected modality."})
    if any(supplied[k] is not None for k in ALLOWED - set(selected)):
        raise HTTPException(400, detail={"code": "SAMPLE_MODALITY_MISMATCH", "message": "Do not upload samples for modalities that were not selected."})
    try:
        get_fernet()
        extracted = {}
        for kind in selected:
            raw = await read_sample(supplied[kind], kind)
            extracted[kind] = extract(raw, kind)
            del raw
    except (ValueError, sf.LibsndfileError, cv2.error) as exc:
        raise HTTPException(422, detail={"code": "INVALID_SAMPLE", "message": "One or more samples could not be decoded or processed."}) from exc
    except RuntimeError as exc:
        raise HTTPException(503, detail={"code": "ENCRYPTION_NOT_CONFIGURED", "message": "Secure template storage is not configured."}) from exc
    try:
        with db() as conn:
            conn.execute(
                "INSERT INTO identities VALUES (?, ?, ?, ?, ?, 1)",
                (identity_ref, name, email, utc_now(), policy_version.strip()),
            )
            for kind, vector in extracted.items():
                encrypted = get_fernet().encrypt(vector_bytes(vector))
                conn.execute(
                    "INSERT INTO templates VALUES (?, ?, ?, ?, ?)",
                    (identity_ref, kind, encrypted, "baseline-handcrafted-v1", utc_now()),
                )
            # Commit the identity, encrypted templates, and success audit together.
            event_id = write_audit(conn, actor, "identity_enrollment", identity_ref, selected, "enrolled", request_id)
    except sqlite3.IntegrityError as exc:
        raise HTTPException(409, detail={"code": "IDENTITY_EXISTS", "message": "That identity reference is already registered."}) from exc
    return {"request_id": request_id, "identity": {"identity_ref": identity_ref, "status": "enrolled"},
            "registered_modalities": selected, "audit_event_id": event_id,
            "notice": "Experimental handcrafted features stored encrypted; this is not a validated biometric identity model."}


@app.post("/api/v1/verification/multimodal")
async def verify(
    claimed_identity_ref: str = Form(...), modalities: str = Form(...), authorization: str = Form(...),
    face_sample: UploadFile | None = File(None), voice_sample: UploadFile | None = File(None),
    fingerprint_sample: UploadFile | None = File(None), actor: str = Depends(require_operator),
):
    request_id = str(uuid.uuid4())
    identity_ref = claimed_identity_ref.strip()
    if not IDENTITY_RE.fullmatch(identity_ref):
        raise HTTPException(422, detail={"code": "INVALID_IDENTITY_REF", "message": "Identity reference is invalid."})
    try:
        auth_data = json.loads(authorization)
    except json.JSONDecodeError as exc:
        raise HTTPException(400, detail={"code": "INVALID_AUTHORIZATION", "message": "Authorization must be valid JSON."}) from exc
    purpose = auth_data.get("purpose") if isinstance(auth_data, dict) else None
    if (not isinstance(auth_data, dict) or auth_data.get("authorized") is not True
            or not isinstance(purpose, str) or not 3 <= len(purpose.strip()) <= 200):
        raise HTTPException(403, detail={"code": "AUTHORIZATION_REQUIRED", "message": "A documented verification purpose (3–200 characters) is required."})
    selected = parse_modalities(modalities)
    supplied = {"face": face_sample, "voice": voice_sample, "fingerprint": fingerprint_sample}
    if any(supplied[k] is None for k in selected):
        raise HTTPException(400, detail={"code": "MISSING_SAMPLE", "message": "Upload a sample for every selected modality."})
    if any(supplied[k] is not None for k in ALLOWED - set(selected)):
        raise HTTPException(400, detail={"code": "SAMPLE_MODALITY_MISMATCH", "message": "Do not upload samples for modalities that were not selected."})
    with db() as conn:
        identity = conn.execute("SELECT active FROM identities WHERE identity_ref=?", (identity_ref,)).fetchone()
        rows = conn.execute("SELECT modality, encrypted_vector FROM templates WHERE identity_ref=?", (identity_ref,)).fetchall()
    if identity is None or not identity["active"]:
        raise HTTPException(404, detail={"code": "IDENTITY_NOT_FOUND", "message": "No active identity matches that reference."})
    stored = {row["modality"]: row["encrypted_vector"] for row in rows}
    try:
        comparisons = {}
        candidates = {}
        references = {}
        missing_template = False
        incompatible_feature_version = False
        for kind in selected:
            raw = await read_sample(supplied[kind], kind)
            if kind not in stored:
                comparisons[kind] = "missing_enrollment_template"
                missing_template = True
                del raw
                continue
            candidate = extract(raw, kind)
            reference = load_vector(stored[kind])
            if candidate.shape != reference.shape:
                comparisons[kind] = "incompatible_feature_version"
                incompatible_feature_version = True
            else:
                candidates[kind] = candidate
                references[kind] = reference
            del raw
        bundle = load_model_bundle()
        experimental_result = "not_evaluated"
        experimental_scores = {}
        reason_code = (
            "FEATURE_VERSION_MISMATCH" if incompatible_feature_version
            else "ENROLLMENT_TEMPLATE_MISSING" if missing_template
            else "CALIBRATION_REQUIRED"
        )
        if bundle is not None and all(kind in candidates and kind in references for kind in selected):
            if set(selected) == {"face", "voice", "fingerprint"} and "multimodal_fusion" in bundle:
                combined_candidate = np.concatenate((candidates["face"], candidates["voice"], candidates["fingerprint"]))
                combined_reference = np.concatenate((references["face"], references["voice"], references["fingerprint"]))
                score, threshold = model_score(bundle, "multimodal_fusion", combined_candidate, combined_reference)
                experimental_scores["multimodal_fusion"] = score
                experimental_result = "match" if score >= threshold else "no_match"
                reason_code = "EXPERIMENTAL_THREE_MODALITY_RESULT"
            elif set(selected) == {"face", "voice"}:
                face_score, face_threshold = model_score(bundle, "face", candidates["face"], references["face"])
                voice_score, voice_threshold = model_score(bundle, "voice", candidates["voice"], references["voice"])
                fusion_score, fusion_threshold = model_score(bundle, "early_fusion",
                    np.concatenate((candidates["face"], candidates["voice"])),
                    np.concatenate((references["face"], references["voice"])))
                hierarchy = bundle.get("hierarchical", {})
                margin = float(hierarchy.get("uncertainty_margin", 0.0))
                if face_score >= face_threshold + margin:
                    decision, route = True, "face_confident"
                elif face_score <= face_threshold - margin:
                    decision, route = False, "face_confident_reject"
                else:
                    decision, route = voice_score >= voice_threshold, "voice_fallback"
                experimental_scores = {"face": face_score, "voice": voice_score, "early_fusion": fusion_score}
                experimental_result = "match" if decision else "no_match"
                reason_code = "EXPERIMENTAL_HIERARCHICAL_RESULT"
                comparisons["hierarchical_route"] = route
                comparisons["early_fusion_threshold"] = fusion_threshold
            elif len(selected) == 1 and selected[0] in bundle:
                kind = selected[0]
                score, threshold = model_score(bundle, kind, candidates[kind], references[kind])
                experimental_scores[kind] = score
                experimental_result = "match" if score >= threshold else "no_match"
                reason_code = "EXPERIMENTAL_MODEL_RESULT"
            elif "fingerprint" in selected:
                reason_code = "FINGERPRINT_MODEL_NOT_AVAILABLE"
            comparisons["model_scores"] = experimental_scores
        elif "fingerprint" in selected and not incompatible_feature_version and not missing_template:
            reason_code = "FINGERPRINT_MODEL_NOT_AVAILABLE"
    except (ValueError, sf.LibsndfileError, cv2.error, InvalidToken) as exc:
        raise HTTPException(422, detail={"code": "INVALID_SAMPLE", "message": "One or more samples could not be decoded or processed."}) from exc
    except (RuntimeError, KeyError, OSError) as exc:
        raise HTTPException(503, detail={"code": "MODEL_NOT_READY", "message": "The configured model bundle is unavailable or incompatible."}) from exc
    event_id = audit(actor, "biometric_verification", identity_ref, selected, ("model_result_pending_policy" if experimental_result != "not_evaluated" else "not_evaluated"), request_id)
    return {"request_id": request_id, "verification_id": str(uuid.uuid4()), "outcome": experimental_result,
            "policy_decision": "pending", "reason_code": reason_code,
            "diagnostic_similarity": comparisons,
            "audit_event_id": event_id,
            "message": "Experimental model output only. Policy decision remains pending; never use this result alone to grant or deny access."}
