# BioGuard X API integration contract

## Implemented integration status

The Vanilla JavaScript enrollment and verification forms are wired to the experimental FastAPI adapter in `api/main.py`. They use only the three implemented routes below. Identity directory, analytics, risk scoring, audit browsing, notifications, and access-control endpoints are not implemented.

On any host, a blank or invalid `BIOGUARD_API_BASE` enables a demo-only workflow preview: biometric file inputs are not rendered and no sample is transmitted. Local API mode is opt-in by setting `BIOGUARD_API_BASE` to `http://127.0.0.1:8000` in `frontend/config.js`. Remote API origins must use HTTPS. If a configured API times out, is unreachable, or returns 404/5xx, the UI shows the error and offers an explicit offline preview. That preview performs no additional request and does not assume the earlier request failed; its outcome is marked unknown, so backend/audit records must be checked before retrying. Authentication, authorization, and request-validation errors remain visible without an offline-success fallback.

## Authentication and transport

- `GET /api/v1/health` is unauthenticated.
- Both POST routes require `Authorization: Bearer <BIOGUARD_API_TOKEN>`.
- The token is a shared development operator secret, prompted at submission time and kept in page memory only. It is not per-user authentication or production RBAC.
- Remote API origins must use HTTPS. HTTP is allowed only for localhost/loopback development.
- Configure `BIOGUARD_CORS_ORIGINS` with exact frontend origins; do not use wildcard origins.
- Never place the bearer token, Fernet key, database credentials, or model artifacts in browser-visible configuration.

## 1. Health — `GET /api/v1/health`

Response:
```json
{
  "status": "ready",
  "api_version": "0.1.0",
  "verification_mode": "not_evaluated_until_calibrated",
  "encryption_configured": true,
  "database_connected": true
}
```

`status` is `ready`, `configuration_required`, or `degraded`. `verification_mode` is `not_evaluated_until_calibrated` or `model_artifact_present_not_validated`. Artifact presence does not prove the bundle is trusted, correctly trained on real data, or accurate.

## 2. Enrollment — `POST /api/v1/identities/enroll`

Requires bearer authentication and `multipart/form-data`.

| Field | Type | Server-side validation |
|---|---|---|
| `profile` | JSON string | Object with `full_name` (2–100 chars), `identity_ref` (3–32 characters matching letters, digits, underscore, hyphen), and optional `email` (valid address, max 254 chars) |
| `modalities` | JSON string array | One or more unique values from `face`, `voice`, `fingerprint` |
| `consent` | JSON string | Object with `granted: true` and `policy_version` (1–40 chars) |
| `face_sample` | file | Required if face selected; max 10 MiB; decodable image, minimum 64 px on each dimension |
| `voice_sample` | file | Required if voice selected; max 20 MiB; supported audio, at least 0.5 seconds and sample rate ≥ 8 kHz |
| `fingerprint_sample` | file | Required if fingerprint selected; max 10 MiB; decodable image, minimum 64 px on each dimension |

Send sample parts for selected modalities only.

Success: HTTP 201.
```json
{
  "request_id": "request UUID",
  "identity": { "identity_ref": "BG-00843", "status": "enrolled" },
  "registered_modalities": ["face"],
  "audit_event_id": "audit UUID",
  "notice": "Experimental handcrafted features stored encrypted; this is not a validated biometric identity model."
}
```

The identity row, encrypted feature templates, and success audit event are committed in one SQLite transaction. Enrollment stores handcrafted features; it does not create a validated biometric identity model.

## 3. Verification — `POST /api/v1/verification/multimodal`

Requires bearer authentication and `multipart/form-data`.

| Field | Type | Server-side validation |
|---|---|---|
| `claimed_identity_ref` | string | Existing active identity reference using the same 3–32 character rule |
| `modalities` | JSON string array | One or more unique supported modalities |
| `authorization` | JSON string | Object with `authorized: true` and `purpose` (3–200 chars) |
| `face_sample`, `voice_sample`, `fingerprint_sample` | file parts | Same per-modality size and decoding rules as enrollment; selected modalities only |

Success: HTTP 200.
```json
{
  "request_id": "request UUID",
  "verification_id": "verification UUID",
  "outcome": "not_evaluated",
  "policy_decision": "pending",
  "reason_code": "CALIBRATION_REQUIRED",
  "diagnostic_similarity": {},
  "audit_event_id": "audit UUID",
  "message": "Experimental model output only. Policy decision remains pending; never use this result alone to grant or deny access."
}
```

The API returns `not_evaluated` if a trusted compatible model is unavailable, an enrollment template is missing, or feature dimensions do not match. A compatible trusted model bundle may return `match` or `no_match` as an experimental comparison only. Feature mismatch is reported through `reason_code: FEATURE_VERSION_MISMATCH` in the HTTP 200 response. Every result keeps `policy_decision: pending`; no access grant or denial is produced.

## Error responses

Application errors use HTTP status codes and a `detail` object with `code` and `message`.

| HTTP | Example codes | Meaning |
|---:|---|---|
| 400 | `INVALID_JSON`, `INVALID_MODALITIES`, `MISSING_SAMPLE`, `SAMPLE_MODALITY_MISMATCH` | Malformed or incomplete request |
| 401 | `AUTH_REQUIRED`, `INVALID_CREDENTIALS` | Missing or invalid operator token |
| 403 | `CONSENT_REQUIRED`, `AUTHORIZATION_REQUIRED` | Required acknowledgement/purpose missing |
| 404 | `IDENTITY_NOT_FOUND` | No active claimed identity |
| 409 | `IDENTITY_EXISTS` | Identity reference already registered |
| 413 | `SAMPLE_SIZE_INVALID` | File empty or exceeds per-modality size limit |
| 422 | `INVALID_SAMPLE`, `INVALID_PROFILE`, `INVALID_EMAIL` | Invalid sample or profile data |
| 503 | `AUTH_NOT_CONFIGURED`, `ENCRYPTION_NOT_CONFIGURED`, `MODEL_NOT_READY` | Backend configuration or trusted model unavailable |

## Audit and biometric data handling

- Successful enrollment writes identity metadata, encrypted feature templates, and its audit event atomically.
- Successful verification writes a metadata-only audit event.
- Failed enrollment/verification attempts are audited with action, actor classification, HTTP outcome, timestamp, and request ID. Failure records do not include identity reference, request body, file names, raw samples, feature vectors, or bearer tokens.
- Audit-write failure does not replace the original HTTP error response.
- The application does not persist raw uploads in its database or audit log. Starlette's multipart parser may temporarily spool larger uploads to the API host's temporary storage before request cleanup; the host must restrict access to and securely manage that temporary storage.
- Feature vectors are encrypted with Fernet. SQLite identity metadata, including optional email and consent policy version, is plaintext.

The browser consent and authorization checkboxes are acknowledgements only. They do not independently establish legal authority, the subject's identity, or operator permissions.

## Feature and model boundary

- Face: HOG + LBP, 8,356 dimensions.
- Voice: MFCC-style statistics + zero-crossing rate + RMS, 30 dimensions.
- Fingerprint: 8-orientation Gabor statistics, 24 dimensions.
- Training pipeline: `src/bioguard_ml.py`; API adapter: `api/main.py`.
- Model bundle: `reports/bioguard_traditional_ml.joblib`, feature version `bioguard-traditional-v1`.

API/training feature parity is covered by automated tests. Never load an untrusted joblib artifact: pickle-based model bundles can execute code. No real-data dataset or real-world accuracy result is included in this repository.

## Non-production limitations

The service uses a shared development bearer token and SQLite. It has no rate limiting, production OIDC/RBAC, managed key lifecycle, retention/deletion workflow, liveness or robust spoof detection, face detection/alignment, calibrated risk score, or independent security review. Similarity scores are diagnostic research outputs, not calibrated real-world identity assurance. Do not use this prototype for real access control or high-stakes decisions.
