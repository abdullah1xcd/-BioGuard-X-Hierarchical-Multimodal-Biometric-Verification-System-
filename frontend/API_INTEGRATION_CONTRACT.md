# BioGuard X API integration contract

## Implementation status

The Vanilla HTML/CSS/JavaScript frontend is connected to the experimental FastAPI service in `api/main.py`. The service is an isolated coursework prototype; it does not restore the original Streamlit application or any research modules absent from the accessible repository history.

Only the three routes below are implemented. Identity directory, analytics, risk, notifications, audit browsing, and access-control APIs are not implemented; the dashboard must continue showing unavailable states for those areas.

## Authentication and transport

- Protected enrollment and verification requests require `Authorization: Bearer <BIOGUARD_API_TOKEN>`.
- The API token is a shared development operator secret. The browser prompt keeps it in page memory only; this is not production user authentication or per-operator identity.
- Use HTTPS for any remote API host. Local development may use `http://127.0.0.1:8000`.
- Configure `BIOGUARD_CORS_ORIGINS` with exact frontend origins. Never use wildcard origins for deployment.
- Never put the API token, Fernet key, database credentials, or model artifact in frontend configuration.

## Confirmed endpoints

### 1. Health — `GET /api/v1/health`

No authentication required.

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

`status` is `ready`, `configuration_required`, or `degraded`. Encryption is reported as configured only when the Fernet key parses successfully. `verification_mode` may be `not_evaluated_until_calibrated` or `model_artifact_present_not_validated`; artifact presence is not proof of valid real-data training.

### 2. Enrollment — `POST /api/v1/identities/enroll`

Requires bearer authentication and `multipart/form-data`.

| Field | Type | Validation |
|---|---|---|
| `profile` | JSON string | `full_name` (2–100 chars), `identity_ref` (3–32 letters/numbers/`_`/`-`), optional valid `email` |
| `modalities` | JSON string array | One or more unique values from `face`, `voice`, `fingerprint` |
| `consent` | JSON string | `granted: true` and `policy_version` (1–40 chars) |
| `face_sample` | file | Required when `face` selected; max 10 MiB; must decode as an image of at least 64×64 pixels |
| `voice_sample` | file | Required when `voice` selected; max 20 MiB; must decode as supported audio of at least 0.5 seconds |
| `fingerprint_sample` | file | Required when `fingerprint` selected; max 10 MiB; must decode as an image of at least 64×64 pixels |

Do not send sample fields for unselected modalities.

Success response: HTTP 201.
```json
{
  "request_id": "request UUID",
  "identity": { "identity_ref": "BG-00843", "status": "enrolled" },
  "registered_modalities": ["face"],
  "audit_event_id": "audit UUID",
  "notice": "Experimental handcrafted features stored encrypted; this is not a validated biometric identity model."
}
```

Enrollment metadata, encrypted feature templates, and its success audit event are committed in one SQLite transaction. Raw sample files are processed in memory and are not stored by the API.

### 3. Verification — `POST /api/v1/verification/multimodal`

Requires bearer authentication and `multipart/form-data`.

| Field | Type | Validation |
|---|---|---|
| `claimed_identity_ref` | string | Same 3–32 character identity-reference rule |
| `modalities` | JSON string array | One or more unique supported modalities |
| `authorization` | JSON string | `authorized: true` and `purpose` (3–200 chars) |
| `face_sample`, `voice_sample`, `fingerprint_sample` | file parts | Same per-modality size, decoding, and selected-modality rules as enrollment |

Success response: HTTP 200.
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

When a trusted, compatible trained bundle exists, the API may return `match` or `no_match` as an **experimental model comparison only**. Without a compatible model, missing enrollment template, or matching feature version, it returns `not_evaluated`. Every response keeps `policy_decision: pending`; no access grant or denial is produced.

## Error responses

FastAPI validation and application errors use HTTP status codes with a `detail` object containing `code` and `message` where applicable.

| HTTP | Example codes | Meaning |
|---:|---|---|
| 400 | `INVALID_JSON`, `INVALID_MODALITIES`, `MISSING_SAMPLE`, `SAMPLE_MODALITY_MISMATCH` | Malformed or incomplete request |
| 401 | `AUTH_REQUIRED`, `INVALID_CREDENTIALS` | Missing or invalid operator token |
| 403 | `CONSENT_REQUIRED`, `AUTHORIZATION_REQUIRED` | Required acknowledgement/purpose missing |
| 404 | `IDENTITY_NOT_FOUND` | No active claimed identity |
| 409 | `IDENTITY_EXISTS` | Identity reference already registered |
| 413 | `SAMPLE_SIZE_INVALID` | File empty or exceeds per-modality limit |
| 422 | `INVALID_SAMPLE`, `INVALID_PROFILE`, `FEATURE_VERSION_MISMATCH` | Invalid sample or profile; feature mismatch yields a not-evaluated result |
| 503 | `AUTH_NOT_CONFIGURED`, `ENCRYPTION_NOT_CONFIGURED`, `MODEL_NOT_READY` | Required backend configuration or trusted model is unavailable |

Failed enrollment and verification HTTP attempts are audited as metadata-only events. The failure audit does not read or store request bodies, file names, raw samples, feature vectors, or bearer tokens. Failed audit writes do not replace the original API error response.

## Feature and model boundary

- Face: HOG + LBP, 8,356 dimensions.
- Voice: MFCC-style statistics + zero-crossing rate + RMS, 30 dimensions.
- Fingerprint: 8-orientation Gabor statistics, 24 dimensions.
- Training pipeline: `src/bioguard_ml.py`; API adapter: `api/main.py`.
- Bundle: `reports/bioguard_traditional_ml.joblib`, feature version `bioguard-traditional-v1`.

The API and training extractors have automated parity tests. The model bundle must be generated from consented data and must be trusted before loading: joblib/pickle artifacts can execute code. No real-data dataset or accuracy result is included in this repository.

## Non-production limitations

The service has a shared development bearer token, SQLite storage, plaintext identity metadata, no rate limiting, no deletion/retention workflow, no liveness or robust spoof detection, no face detection/alignment, no OIDC/RBAC, and no independent security review. Similarity scores are diagnostic research outputs, not calibrated real-world identity assurance. Do not use this prototype for real access control.
