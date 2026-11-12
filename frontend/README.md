# BioGuard X — Vanilla Frontend

The dashboard uses **HTML5, CSS3, and Vanilla JavaScript**. No frontend framework or build system is introduced.

## Run locally

Terminal 1 — API:

```powershell
py -3.12 -m venv .venv
.venv\\Scripts\\Activate.ps1
pip install -r requirements-api.txt
$env:BIOGUARD_API_TOKEN = "replace-with-a-long-random-operator-secret"
$env:BIOGUARD_ENCRYPTION_KEY = (python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
$env:BIOGUARD_CORS_ORIGINS = "http://localhost:5500,http://127.0.0.1:5500"
uvicorn api.main:app --reload
```

Terminal 2 — frontend:

```powershell
cd frontend
py -m http.server 5500
```

Open http://localhost:5500. By default, local development remains demo-only. To connect the local API, set `window.BIOGUARD_API_BASE = "http://127.0.0.1:8000"` in `frontend/config.js`. The first protected API submission prompts for the operator token; it stays in page memory only and is cleared after an authentication failure. This is a coursework development convenience, not production authentication.

## Frontend modes

- **Demo-only mode:** with no valid API URL, enrollment and verification are workflow previews. Biometric file inputs are hidden. The preview does not capture, upload, process, store, or compare samples; it does not create an identity, calculate risk, or make an access decision.
- **Configured API mode:** uses the configured API origin and requires the operator bearer token. Remote origins must use HTTPS. Only selected modality files are sent. If a request times out or the API is unavailable, the UI shows an error and offers an explicit offline preview. If the previous request did not return a response, its outcome is marked unknown; the preview does not assume the API operation failed.
- Enrollment requires profile details and an explicit consent acknowledgement. Verification requires a claimed identity, a stated purpose, and an authorization acknowledgement. These browser acknowledgements do not replace server-side authentication or legal authority.
- File types, per-modality sizes, combined Vercel request size, and required samples are validated in the browser and again by the API.
- The UI validates API response shapes before showing success. Verification always displays that policy is pending and no access decision is made.

## Vercel deployment

Import the repository using branch `frontend/vanilla-js-redesign` and keep the Vercel project Root Directory at the repository root (`.`). The root `vercel.toml` defines two services: the static frontend rooted at `frontend/` and FastAPI rooted at `api/` with entrypoint `main:app`. It routes `/api/*` to FastAPI and other paths to the frontend. Selecting `frontend/` or `api/` as the Vercel project Root Directory bypasses this multi-service setup.

On a `.vercel.app` hostname, `frontend/config.js` defaults the API origin to the same Vercel deployment. For a custom domain, set `window.BIOGUARD_API_BASE` to the same HTTPS origin. The UI caps the combined selected sample size to 4 MiB minus multipart overhead to stay below Vercel's function request limit.

The API requires server-side Vercel environment variables: `BIOGUARD_API_TOKEN`, `BIOGUARD_ENCRYPTION_KEY`, and `BIOGUARD_DATABASE_URL` from a persistent PostgreSQL database provisioned through the Vercel Marketplace. The API deliberately refuses to use SQLite on Vercel because function filesystem writes are not persistent. Without the database URL, the health endpoint reports configuration required and enrollment/verification are rejected. Never expose these secrets in this file or browser-visible settings.

No model artifact or consented biometric dataset is included. Unless a compatible trusted model bundle is separately trained and configured, verification returns NOT EVALUATED. Even with a bundle, the result is experimental and policy remains pending.

## Experimental backend boundary

The repository contains an isolated FastAPI adapter in `api/main.py` and a traditional-ML feature pipeline in `src/bioguard_ml.py`. This is a new experimental baseline; it does not claim to restore earlier research services or the Streamlit application.

Routes:
- `GET /api/v1/health`
- `POST /api/v1/identities/enroll`
- `POST /api/v1/verification/multimodal`

See `api/README.md` and `API_INTEGRATION_CONTRACT.md` for the exact schemas and security boundary.

## Limitations

This is a coursework/research prototype, not production biometric security infrastructure. There is no face detection/alignment, liveness or spoof detection, calibrated risk score, production identity-provider integration, managed key lifecycle, retention/deletion workflow, or independent security review. Never use it as the sole basis for access control or high-stakes decisions.
