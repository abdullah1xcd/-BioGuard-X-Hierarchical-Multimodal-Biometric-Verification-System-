# BioGuard X deployment preparation

## Frontend — Vercel

- Repository: `abdullah1xcd/-BioGuard-X-Hierarchical-Multimodal-Biometric-Verification-System-`
- Branch: `frontend/vanilla-js-redesign`
- Root Directory may be `.` or `frontend`; each location has a matching `vercel.json`, `package.json`, and `package-lock.json`.
- The frontend is static Vanilla HTML/CSS/JS. `npm ci` and the no-op `npm run build` are tested in CI.
- Before deployment, set `window.BIOGUARD_API_BASE` in `frontend/config.js` to the HTTPS origin of the separately deployed API.

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
