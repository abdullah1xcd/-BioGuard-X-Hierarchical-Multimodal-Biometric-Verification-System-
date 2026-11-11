# BioGuard X API integration status

## Status

An **experimental FastAPI prototype is now implemented** in `api/main.py`, with a Vanilla JS client integration in `frontend/app.js`. It is a new baseline because the original Python modules described in the root project README (`src/`, `app/`, `scripts/`, and original tests) were not present in the accessible GitHub branch. This prototype does not recreate or claim parity with the missing original biometric models/services.

## Implemented routes

| Method | Route | Behavior |
|---|---|---|
| GET | `/api/v1/health` | Reports API and encryption configuration status |
| POST | `/api/v1/identities/enroll` | Consent-gated enrollment; extracts baseline features and stores encrypted vectors |
| POST | `/api/v1/verification/multimodal` | Extracts query features and computes diagnostic similarity against stored templates |

Enrollment multipart fields: `profile` JSON, `modalities` JSON array, `consent` JSON, and selected `face_sample`, `voice_sample`, and/or `fingerprint_sample` file parts.

Verification multipart fields: `claimed_identity_ref`, `modalities`, `authorization` JSON, and matching sample file parts.

## Current feature pipeline

- Face: grayscale normalization and HOG descriptor.
- Voice: MFCC-style spectral statistics computed from decoded audio.
- Fingerprint: multi-orientation Gabor texture statistics.
- Storage: SQLite identity/template/audit metadata; feature vectors encrypted with Fernet.
- Uploads: bounded size, server-side decode, processed in memory, not persisted.
- Security: bearer operator token, explicit consent and policy version for enrollment, authorized purpose for verification, and metadata-only audit events.

These are experimental handcrafted descriptors, not trained or validated identity models. Face detection/alignment, liveness detection, biometric threshold calibration, independent accuracy evaluation, production identity-provider integration, rate limiting, and production deployment hardening are not implemented.

## Non-negotiable verification safety gate

The verification endpoint always returns:

- `outcome: not_evaluated`
- `policy_decision: pending`
- `reason_code: CALIBRATION_REQUIRED`

Diagnostic similarity values are not identity confidence and must never be used to grant or deny access. The frontend explicitly displays **NOT EVALUATED**. Do not remove this gate until the actual intended models and dataset are available, operating thresholds are calibrated and independently evaluated, and the project's authorization/risk policy is integrated and tested.

## Local development

Follow [api/README.md](../api/README.md). Install the optional API dependencies with `pip install -r requirements-api.txt`; the original root `requirements.txt` and Streamlit startup are unchanged. Configure a strong `BIOGUARD_API_TOKEN`, a stable `BIOGUARD_ENCRYPTION_KEY`, and exact local CORS origins. Never commit secrets. The browser token prompt is a local-development convenience only; use a reviewed server-side session/OIDC design for production.

## Tests and remaining work

Basic API tests are added under `tests/test_api.py` for health/calibration status, authentication rejection, encrypted template round-trip, and identity-reference validation. They have **not yet been executed in this remote repository environment**. Run:

```powershell
pip install -r requirements-api.txt
python -m pytest tests/test_api.py -q
```

Next steps: execute tests in a real checkout; add end-to-end tests using synthetic/consented samples; review atomicity and deletion/retention; validate each extractor on representative datasets; integrate the original biometric/fusion/hierarchy/risk services if their source is restored; and only then consider calibrated verification decisions.
