# BioGuard X experimental API

This is an isolated FastAPI adapter for the traditional-ML baseline in `src/bioguard_ml.py`. It does not recreate the missing original research modules, Streamlit app, or deep-learning models.

## Local setup (Windows PowerShell)

```powershell
py -3.12 -m venv .venv
.venv\\Scripts\\Activate.ps1
pip install -r requirements-api.txt
$env:BIOGUARD_API_TOKEN = "replace-with-a-long-random-operator-secret"
$env:BIOGUARD_ENCRYPTION_KEY = (python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
$env:BIOGUARD_CORS_ORIGINS = "http://localhost:5500,http://127.0.0.1:5500"
uvicorn api.main:app --reload
```

Local development uses SQLite at `api/bioguard.sqlite3` unless `BIOGUARD_DATABASE_URL`, `POSTGRES_URL`, or `DATABASE_URL` is set. Keep the Fernet key stable and backed up securely; losing it makes stored templates unreadable.

## Vercel deployment

The repository root is the Vercel project root. `pyproject.toml` explicitly declares `api.main:app` as the FastAPI entrypoint; root `vercel.json` serves the static Vanilla frontend from `frontend/`. Do not set the Vercel Root Directory to `frontend` when deploying the API and frontend together.

Configure these Vercel environment variables for Preview and Production as appropriate:

- `BIOGUARD_API_TOKEN`: long random operator token (server-side secret)
- `BIOGUARD_ENCRYPTION_KEY`: valid Fernet key generated with the command above
- `BIOGUARD_DATABASE_URL`: persistent PostgreSQL connection string from a database integration provisioned through the Vercel Marketplace
- `BIOGUARD_CORS_ORIGINS`: exact frontend origin if cross-origin requests are used; same-origin requests do not need CORS
- `BIOGUARD_MODEL_PATH`: optional path to a trusted, compatible trained model artifact; no trained artifact is included in this repository

Vercel Functions have a read-only deployment filesystem. The API therefore refuses to use local SQLite on Vercel: without `BIOGUARD_DATABASE_URL`, health reports `configuration_required` and enrollment/verification return `DATABASE_NOT_CONFIGURED`. The Vercel deployment must use persistent PostgreSQL; do not point SQLite at `/tmp`, because that storage is temporary and instance-local. The health response reports the configured storage backend.

Vercel function request bodies are limited to 4.5 MB. To leave room for multipart boundaries and form fields, this API enforces a 4 MiB total request limit on Vercel, and the frontend validates the combined selected sample size before upload. Large biometric samples require a reviewed direct-upload/storage design; do not bypass the platform limit.

The static frontend automatically uses the same origin as its API on `.vercel.app` hosts. For a custom domain, set `window.BIOGUARD_API_BASE` in `frontend/config.js` to the same HTTPS origin. Never put the API token, database URL, or encryption key in frontend configuration.

## API routes

- `GET /api/v1/health` — unauthenticated configuration/readiness check
- `POST /api/v1/identities/enroll` — authenticated multipart enrollment
- `POST /api/v1/verification/multimodal` — authenticated multipart verification

Both POST routes require `Authorization: Bearer <BIOGUARD_API_TOKEN>`. Enrollment requires `profile`, `modalities`, `consent`, and sample files for every selected modality. Verification requires `claimed_identity_ref`, `modalities`, `authorization`, and selected sample files. See `frontend/API_INTEGRATION_CONTRACT.md` for request/response schemas and errors.

## Current behavior and limits

- Face features: HOG + LBP (8,356 dimensions); voice: MFCC-style statistics + ZCR + RMS (30 dimensions); fingerprint: Gabor texture statistics (24 dimensions).
- API/training feature parity is covered by automated tests. Encrypted feature templates are stored in SQLite locally or PostgreSQL on Vercel.
- A versioned trained bundle may produce experimental `match` / `no_match` output for supported modalities. Without a compatible bundle, verification returns `not_evaluated`.
- `policy_decision` remains `pending` for every result. Model output is not an authorization decision and must never grant or deny access.
- The API does not persist raw uploads in its database or audit log. Multipart parsing may temporarily spool uploads to function temporary storage before request cleanup.
- Success and failed-attempt audit records contain metadata only; they do not contain raw samples, feature vectors, file names, request bodies, or bearer tokens.

This is a coursework/research prototype, not production biometric security infrastructure. There is no liveness/spoof detection, face detection/alignment, production OIDC/RBAC, rate limiting, managed key rotation, retention/deletion workflow, or independent security review. Do not use it for real access control or high-stakes identity decisions. Never load an untrusted joblib artifact.
