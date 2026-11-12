# BioGuard X — Vercel deployment guide

## Project layout

- Repository: `abdullah1xcd/-BioGuard-X-Hierarchical-Multimodal-Biometric-Verification-System-`
- Branch: `frontend/vanilla-js-redesign`
- Vercel project root: repository root (`.`)
- Web service root: `frontend/`
- API service root: `api/`
- FastAPI entrypoint: `main:app` (configured in root `vercel.toml`)
- API runtime dependencies: `api/requirements.txt`

The root `vercel.toml` defines two Vercel services and routes `/api/*` to FastAPI and all other paths to the static Vanilla frontend. Keep the Vercel project connected to the repository root and branch `frontend/vanilla-js-redesign`; do not set the project Root Directory to `frontend/` or `api/` because that bypasses the multi-service configuration. The frontend remains plain HTML/CSS/JavaScript.

## Required Vercel environment variables

Create the variables for both Preview and Production environments as appropriate:

| Variable | Value |
|---|---|
| `BIOGUARD_API_TOKEN` | A long random operator secret |
| `BIOGUARD_ENCRYPTION_KEY` | A Fernet key generated with the command below |
| `BIOGUARD_DATABASE_URL` | Persistent PostgreSQL connection string from a database integration provisioned through the Vercel Marketplace |
| `BIOGUARD_CORS_ORIGINS` | Exact frontend origin if using cross-origin requests; same-origin requests do not require CORS |
| `BIOGUARD_MODEL_PATH` | Optional path to a trusted trained model artifact; none is included in the repository |

Generate a Fernet key locally:

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Do not commit these values, add them to `frontend/config.js`, or expose them as browser-visible variables. Keep the encryption key stable; rotating or losing it makes previously stored templates unreadable.

## Why PostgreSQL is required on Vercel

Vercel Functions have a read-only deployment filesystem and only temporary `/tmp` scratch storage. SQLite at the repository path cannot be used as a persistent database, and SQLite in `/tmp` would be isolated/temporary. The API therefore refuses to initialize local SQLite on Vercel. If `BIOGUARD_DATABASE_URL` is missing, `GET /api/v1/health` reports `configuration_required`, and enrollment/verification return `DATABASE_NOT_CONFIGURED` instead of pretending that records were saved.

The code supports PostgreSQL through `BIOGUARD_DATABASE_URL` (also accepts `POSTGRES_URL` or `DATABASE_URL`). A persistent database must be provisioned and its connection string added to Vercel before real enrollment can be enabled. No database instance or credentials were created by this repository change.

## Vercel upload limit

Vercel Functions reject request bodies larger than 4.5 MB. The API applies a stricter 4 MiB combined request cap, and the browser checks the total selected sample size before sending multipart data. This is a platform constraint, not the per-file limits shown by the local API. Larger samples require a separately designed direct-to-storage upload flow; do not increase the limits without addressing the Vercel request cap.

## Model availability

No trained `reports/bioguard_traditional_ml.joblib` artifact or consented biometric dataset is included. Without a compatible trusted model artifact, the API can enroll encrypted handcrafted feature templates but verification returns `not_evaluated`. A model bundle must be trained with consented, representative, properly separated data, evaluated, and securely supplied to the deployment. Never load an untrusted joblib artifact.

Even with a trained bundle, outputs are experimental only and `policy_decision` remains `pending`. This project does not make access grants or denials.

## Local checks

```powershell
py -3.12 -m venv .venv
.venv\\Scripts\\Activate.ps1
pip install -r requirements-api.txt
python -m pytest tests -q
uvicorn api.main:app --reload
```

Open `http://127.0.0.1:8000/docs` for the generated OpenAPI documentation. Local development uses SQLite unless a PostgreSQL URL is configured. CI builds the Docker image and tests the local SQLite path; it does not prove that the Vercel deployment or a live PostgreSQL connection has been configured.

## Deployment status

This repository change prepares Vercel entrypoint detection, same-origin frontend routing, persistent PostgreSQL support, and upload-limit enforcement. It does **not** create Vercel environment variables, provision the database, deploy the project, or run a browser/device test. Those remain owner-side setup and verification steps.
