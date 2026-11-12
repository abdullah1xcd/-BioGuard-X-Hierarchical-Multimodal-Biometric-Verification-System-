# Security and privacy — current prototype

## Data handling

- Enrollment requires a server-validated consent acknowledgement and policy-version string.
- Verification requests require a server-validated authorization acknowledgement and purpose string.
- Raw uploads are size-limited and are not persisted in the application database or audit log. Multipart parsing may temporarily spool request data to host/function temporary storage before request cleanup; the host must restrict access to that storage and manage cleanup securely.
- Feature vectors are encrypted with Fernet before storage.
- Local development uses SQLite. Vercel requires persistent PostgreSQL through BIOGUARD_DATABASE_URL; the API refuses to fall back to per-function SQLite when that URL is missing.
- Identity profile metadata (including optional email), consent policy version, and audit metadata are plaintext in the database. Feature vectors are encrypted; metadata itself is not encrypted by this prototype.
- The frontend keeps the development bearer token in page memory only; it is not persisted.

## Current controls

- Bearer-token operator authentication with constant-time token comparison.
- Server-side modality matching, JSON validation, file size checks, image/audio decoding, and identity-reference validation.
- CORS defaults to local development origins. Configure exact origins if cross-origin requests are used; same-origin Vercel requests do not require CORS.
- Successful enrollment commits the identity, encrypted templates, and audit event atomically. Successful verification writes a metadata-only audit event. Failed enrollment/verification attempts record actor classification, action, HTTP outcome, timestamp, and request ID only; they omit identity references, request bodies, file names, raw samples, feature vectors, and bearer tokens.
- Vercel request bodies are limited to 4 MiB by the API to remain below the platform's 4.5 MB function payload cap. The frontend checks the combined selected sample size before upload.
- Verification is hard-gated to NOT EVALUATED / PENDING when a compatible model is unavailable; diagnostic model output must never grant or deny access.

## Limitations and required production work

- This is a coursework/research prototype, not a production security boundary.
- The browser token prompt is not a production identity/session design. Use reviewed server-side sessions or OIDC for deployment.
- Configure HTTPS, a strong stable token, managed encryption-key storage/rotation, rate limiting, monitoring, and reviewed CORS origins before any deployment.
- There is no API endpoint for identity deletion or retention scheduling yet.
- SQLite is local-development storage only; PostgreSQL identity metadata is also plaintext.
- No liveness or robust spoof resistance is implemented.
- No risk engine, human approval workflow, or access-control integration is present in this branch.
- No live PostgreSQL connection or Vercel deployment has been verified by the code changes alone.
- Never use real biometric data without informed consent; never commit biometric data or secrets.
