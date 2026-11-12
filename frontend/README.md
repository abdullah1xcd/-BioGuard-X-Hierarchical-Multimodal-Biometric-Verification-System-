# BioGuard X — Vanilla Frontend

The dashboard uses **HTML5, CSS3, and Vanilla JavaScript**. No frontend framework or build system is introduced.

## Run locally

Terminal 1 — API:

~~~powershell
py -3.12 -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements-api.txt
$env:BIOGUARD_API_TOKEN = "replace-with-a-long-random-operator-secret"
$env:BIOGUARD_ENCRYPTION_KEY = (python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
$env:BIOGUARD_CORS_ORIGINS = "http://localhost:5500,http://127.0.0.1:5500"
uvicorn api.main:app --reload
~~~

Terminal 2 — frontend:

~~~powershell
cd frontend
py -m http.server 5500
~~~

Open http://localhost:5500. With the default empty API URL, the frontend starts in demo-only mode. To connect a local API, set window.BIOGUARD_API_BASE to "http://127.0.0.1:8000" in frontend/config.js before loading the page. The first API submission asks for the operator token; it stays in page memory only and is cleared after an authentication failure. The token prompt is a coursework development convenience, not a production authentication design.

## Frontend checks

Run the Vanilla JavaScript module and API-response contract tests from the repository root:

~~~bash
npm --prefix frontend test
~~~

The tests use Node's built-in test runner; no frontend framework or test dependency is added.

## Frontend modes

- **Demo-only mode:** when no valid API URL is configured (blank or invalid), the enrollment and verification forms remain usable as workflow previews. Biometric file inputs are not shown. The preview does not capture, upload, process, store, or compare biometric samples; it does not create an identity, calculate a risk score, or make an access decision.
- **Configured API mode:** set window.BIOGUARD_API_BASE in frontend/config.js to the HTTPS origin of a remote FastAPI service (HTTP is permitted only for localhost/loopback development). The forms then require files for every selected modality, validate file types and sizes, and submit only the selected files. If the service times out or is unreachable, the UI shows an error and offers an explicit offline preview; that preview does not retry or assume the earlier request failed.
- Face, voice, and fingerprint are selectable. At least one modality is required; fingerprint is optional. Face is preselected as a starting choice.
- Enrollment requires identity details and an explicit consent acknowledgement. Verification requires a claimed identity, a stated purpose, and an authorization acknowledgement.
- Loading, success, validation, timeout, and API error states are shown in the module UI.
- Successful API responses are checked against the documented response contract. An incomplete or malformed 2xx response is treated as unconfirmed, not as success; the offline preview makes no retry and asks the operator to check backend records first.

## Experimental backend boundary

The repository contains an isolated FastAPI adapter in api/main.py and a traditional-ML feature pipeline in src/bioguard_ml.py. This adapter is a new experimental implementation; it does not claim to recreate missing earlier research modules.

The current API routes are:
- GET /api/v1/health
- POST /api/v1/identities/enroll
- POST /api/v1/verification/multimodal

The enrollment endpoint extracts handcrafted features and stores encrypted feature vectors plus identity/template metadata. The verification endpoint compares selected samples only when compatible enrollment templates and a trusted trained model bundle are available. Otherwise it returns NOT EVALUATED. Experimental match/no-match output is diagnostic only; policy_decision remains pending and never grants or denies access.

See api/README.md and API_INTEGRATION_CONTRACT.md for the exact multipart contract, configuration, and limitations.

## Deployment

- Import the repository into Vercel and select branch frontend/vanilla-js-redesign.
- For Root Directory . use the root vercel.json; for Root Directory frontend use frontend/vercel.json.
- The frontend is static Vanilla JS. No runtime npm dependencies are required; npm ci and the no-op build script are supported.
- Set the public API origin in frontend/config.js before deploying. Do not place the operator token, database password, or encryption key in this file or any browser-visible environment variable.
- Deploy FastAPI separately with HTTPS and set BIOGUARD_CORS_ORIGINS to the exact Vercel origin.
- Keep BIOGUARD_ENCRYPTION_KEY stable; changing it makes existing encrypted templates unreadable.

## Limitations

This is a coursework/research prototype, not production biometric security infrastructure. There is no face detection/alignment, liveness or spoof detection, calibrated risk score, production identity-provider integration, managed key service, retention/deletion workflow, or independent security review. Never use it as the sole basis for access control or high-stakes decisions. Never load an untrusted joblib model artifact.