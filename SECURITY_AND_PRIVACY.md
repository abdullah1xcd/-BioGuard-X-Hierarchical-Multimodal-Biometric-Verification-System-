# Security and privacy — current prototype

## Data handling

- Enrollment requires a server-validated consent acknowledgement and policy-version string.
- Verification requests require a server-validated authorization acknowledgement and purpose string.
- Raw uploads are size-limited and are not persisted in the application database or audit log. Starlette's multipart parser may temporarily spool larger uploads to host temporary storage before request cleanup; the host must restrict access to that storage and manage cleanup securely.
- Feature vectors are encrypted with Fernet before storage in SQLite.
- SQLite stores identity profile metadata (including optional email), consent policy version, encrypted templates, and metadata-only audit events. Metadata itself is not encrypted by this prototype.
- The frontend keeps the development bearer token in page memory only; it is not persisted.

## Current controls

- Bearer-token operator authentication with constant-time token comparison.
- Server-side modality matching, JSON validation, file size checks, image/audio decoding, and identity-reference validation.
- CORS defaults to the local development frontend origins.
- Successful enrollment commits its identity, encrypted templates, and audit event atomically. Successful verification writes a metadata-only audit event. Failed enrollment/verification attempts record actor classification, action, HTTP outcome, timestamp, and request ID only; they omit identity references, request bodies, file names, raw samples, feature vectors, and bearer tokens.
- Verification is hard-gated to NOT EVALUATED / PENDING; diagnostic similarity must never grant or deny access.

## Limitations and required production work

- This is a local coursework prototype, not a production security boundary.
- The browser token prompt is not a production identity/session design. Use reviewed server-side sessions or OIDC for deployment.
- Configure HTTPS, a strong stable token, managed encryption-key storage/rotation, rate limiting, monitoring, and reviewed CORS origins before any deployment.
- There is no API endpoint for identity deletion or retention scheduling yet.
- SQLite is single-machine storage; identity metadata is plaintext.
- No liveness or robust spoof resistance is implemented.
- No risk engine, human approval workflow, or access-control integration is present in this branch.
- Never use real biometric data without informed consent; never commit biometric data or secrets.
