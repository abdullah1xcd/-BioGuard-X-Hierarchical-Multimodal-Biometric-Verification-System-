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
uvicorn api.main:app --reload
```

Terminal 2 — frontend:

```powershell
cd frontend
py -m http.server 5500
```

Open `http://localhost:5500`. The first enrollment/verification request asks for the API operator token. It remains in page memory only and is not persisted. The API base defaults to `http://127.0.0.1:8000`; set `window.BIOGUARD_API_BASE` before loading `app.js` if your local API uses another address.

Keep the encryption key stable between restarts; otherwise previously stored encrypted templates cannot be read. Never commit either secret. This token flow is for local coursework development only, not production deployment.

## Frontend scope

- Responsive dark security operations dashboard with illustrative overview metrics
- Identity enrollment with profile, modality, file, and consent validation
- Multimodal verification with claimed identity and authorization acknowledgement
- API requests for selected samples; no silent demo-success fallback when the API is unavailable
- Verification remains visibly **NOT EVALUATED** until a validated/calibrated biometric model exists

## Experimental backend boundary

The GitHub branch did not contain the original `src/`, `app/`, `scripts/`, or original `tests/` modules described in the project README. A new isolated FastAPI prototype has therefore been added under `api/`; it does not recreate or claim parity with those missing modules.

The prototype currently:
- Validates and decodes selected image/audio uploads server-side.
- Extracts baseline handcrafted features (HOG image descriptor, MFCC-style audio statistics, and Gabor texture statistics).
- Encrypts stored feature vectors with Fernet and stores identity metadata/templates/audit metadata in SQLite.
- Requires an operator bearer token, explicit consent for enrollment, and an authorized purpose for verification.
- Processes raw samples in memory; raw uploads are not stored.
- Computes diagnostic similarity values but **always returns `outcome=not_evaluated` and `policy_decision=pending`**. It must not grant or deny access.

These handcrafted descriptors are experimental signal-processing features, not validated face/voice/fingerprint identity models. There is no face detection/alignment, liveness detection, threshold calibration, independent accuracy evaluation, risk engine, or production-grade identity provider in this prototype. Do not use it for real access control or high-stakes identity decisions.

See [API README](../api/README.md) for setup and [API integration status](./API_INTEGRATION_CONTRACT.md) for the current contract and gates. Keep the original Python system intact if/when its source is restored; the new API is isolated and should be adapted to call the original domain services rather than duplicating them.
