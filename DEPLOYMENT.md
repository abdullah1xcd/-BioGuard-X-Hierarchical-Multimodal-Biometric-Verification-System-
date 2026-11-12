# BioGuard X deployment preparation

## Frontend — Vercel

- Repository: `abdullah1xcd/-BioGuard-X-Hierarchical-Multimodal-Biometric-Verification-System-`
- Branch: `frontend/vanilla-js-redesign`
- Root Directory may be `.` or `frontend`; each location has a matching `vercel.json`, `package.json`, and `package-lock.json`.
- The frontend is static Vanilla HTML/CSS/JS. `npm ci` and the no-op `npm run build` are tested in CI.
- Before deployment, set `window.BIOGUARD_API_BASE` in `frontend/config.js` to the HTTPS origin of the separately deployed API.

## Backend — Render Blueprint (prepared)

A Render Blueprint is available at `render.yaml`. To create the API service:

1. Sign in to Render and choose **New → Blueprint**.
2. Connect this GitHub repository and select branch `frontend/vanilla-js-redesign`.
3. Review the service before applying it. The Blueprint creates a Docker web service named `bioguard-x-api` on the **Starter** plan and attaches a 1 GB persistent disk at `/data`. Starter is a paid plan; review Render's current price before confirming creation.
4. When prompted for `BIOGUARD_CORS_ORIGINS`, enter the exact deployed Vercel frontend origin only, for example `https://your-project.vercel.app` (no path and no trailing slash). Do not use a wildcard.
5. Render generates `BIOGUARD_API_TOKEN` and `BIOGUARD_ENCRYPTION_KEY`. Keep both secret. The generated encryption value is a base64-encoded 256-bit key suitable for Fernet; do not rotate it after storing biometric templates.
6. After the first deploy succeeds, open `https://YOUR-SERVICE.onrender.com/api/v1/health`. Confirm `status` is `ready`, `encryption_configured` is `true`, and `database_connected` is `true`.
7. Copy only the service origin (for example `https://bioguard-x-api.onrender.com`) into `frontend/config.js` as `window.BIOGUARD_API_BASE`, commit that frontend change to this branch, and redeploy Vercel.
8. Enter the generated operator token only into the frontend's in-memory API token prompt when testing. Never put it in `config.js`, Vercel public environment variables, or Git.

The Blueprint's persistent disk is intentional: the current API stores SQLite data at `/data/bioguard.sqlite3`. Render's free web services do not support persistent disks, so switching this service to Free would make local SQLite data non-persistent. This is a coursework/research deployment only, not production-ready biometric infrastructure.

## Backend — container

The repository now includes a Dockerfile for the experimental FastAPI service. Build and run locally:

```bash
docker build -t bioguard-x-api .
docker run --rm -p 8000:8000 \
  -e BIOGUARD_API_TOKEN='replace-me' \
  -e BIOGUARD_ENCRYPTION_KEY='your-generated-fernet-key' \
  -e BIOGUARD_CORS_ORIGINS='https://your-frontend.vercel.app' \
  -e BIOGUARD_DB_PATH='/data/bioguard.sqlite3' \
  -v bioguard-data:/data \
  bioguard-x-api
```

Generate a valid encryption key with:

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Keep the key stable and store it only in the backend host's secret manager. Configure the backend host's persistent volume at `/data` when using the current SQLite implementation. Set the host-provided `PORT` variable if required.

## Important deployment blockers

This container packages the **experimental** API; it does not make it production-ready. The current service still uses SQLite, a shared operator bearer token, and a handcrafted-feature model adapter. Firebase Authentication, PostgreSQL, RBAC, tenant isolation, rate limiting, managed key rotation, liveness detection, deletion/retention workflows, and production security review are not implemented. Do not expose real biometric data or use this service for access-control decisions.

No backend host, API domain, Firebase project, PostgreSQL instance, or production secrets were supplied. Therefore this repository change prepares the container but does not claim that a public API has been deployed.
