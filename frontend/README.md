# BioGuard X — Vanilla Frontend

The dashboard remains **HTML5, CSS3, and Vanilla JavaScript**. No frontend framework or build system is introduced.

## Run locally

Terminal 1 — API:

```powershell
py -3.12 -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements-api.txt
$env:BIOGUARD_API_TOKEN = "replace-with-a-long-random-secret"
$env:BIOGUARD_ENCRYPTION_KEY = (python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
# Optional, after training a consented dataset:
$env:BIOGUARD_MODEL_PATH = "reports/bioguard_traditional_ml.joblib"
uvicorn api.main:app --reload
```

Terminal 2 — frontend:

```powershell
cd frontend
py -m http.server 5500
```

Open `http://localhost:5500`. The first enrollment/verification request asks for the API operator token. It remains in page memory only and is not persisted. The API base defaults to `http://127.0.0.1:8000` on localhost. For a deployed frontend, edit `config.js` and set `window.BIOGUARD_API_BASE` to the public HTTPS URL of the separately hosted FastAPI service. Do not put the operator token, Firebase Admin credentials, database password, or encryption key in this file.

Keep the encryption key stable between restarts; otherwise previously stored encrypted templates cannot be read. Never commit either secret. The token flow is for local coursework development only, not production deployment.

## Frontend scope

- Responsive dark dashboard with illustrative overview metrics (not live analytics).
- Identity enrollment with profile, modality, file, and consent validation.
- Multimodal verification with claimed identity and authorization acknowledgement.
- API requests for selected samples; no silent demo-success fallback when the API is unavailable.
- Displays NOT EVALUATED when no compatible model bundle is loaded, or a clearly labeled experimental model match/no-match result when one is loaded.
- The API policy decision remains pending; the UI explicitly states that no access decision is made.

## Experimental backend boundary

The original Python research modules described by older documentation were absent from both accessible branches. The new FastAPI adapter is isolated and does not claim to recreate them.

Training/API feature dimensions are aligned and tested: HOG+LBP face, MFCC+ZCR+RMS voice, and Gabor fingerprint. The API can load the versioned joblib bundle, perform face-only or voice-only comparison, face+voice hierarchical verification with early-fusion score reporting, fingerprint-only comparison, and optional three-modality fusion when trained models exist. It never grants or denies access.

See [API README](../api/README.md) and [API integration contract](./API_INTEGRATION_CONTRACT.md).

## Vercel deployment

- Import this repository and select branch `frontend/vanilla-js-redesign`.
- For Root Directory `.` use the root `vercel.json` and root `package.json`; for Root Directory `frontend` use `frontend/vercel.json` and `frontend/package.json`.
- The frontend is static Vanilla JS. No runtime npm dependencies are required; `npm ci` is supported and the build script is a no-op.
- Set the API URL in `config.js` before deploying. Vercel build-time environment variables are not automatically available to a static browser page.
- Deploy FastAPI separately with HTTPS and set `BIOGUARD_CORS_ORIGINS` to the exact Vercel origin. Configure `BIOGUARD_API_TOKEN`, `BIOGUARD_ENCRYPTION_KEY`, and persistent database/model storage only on the backend host.