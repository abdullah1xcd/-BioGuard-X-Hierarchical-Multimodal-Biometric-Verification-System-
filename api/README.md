# BioGuard X experimental API

This API is a new baseline implementation because the original Python service modules described in the root README were not present in the checked GitHub branch. It does **not** claim to recreate or validate those missing models.

## Setup (Windows PowerShell)

```powershell
py -3.12 -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements-api.txt
$env:BIOGUARD_API_TOKEN = "replace-with-a-long-random-operator-secret"
$env:BIOGUARD_ENCRYPTION_KEY = (python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
$env:BIOGUARD_CORS_ORIGINS = "http://localhost:5500,http://127.0.0.1:5500"
uvicorn api.main:app --reload
```

Keep the encryption key stable and backed up securely; losing it makes stored templates unreadable. Never commit secrets or expose the operator token in a public frontend. For production, replace the development bearer-token mechanism with the platform's reviewed operator session/OIDC integration, HTTPS, rate limiting, CSRF protections where applicable, and managed key storage.

OpenAPI docs: http://127.0.0.1:8000/docs

## Current behavior

- Authenticated, consent-gated enrollment accepts face, voice and/or fingerprint samples.
- Upload sizes and actual decodability are checked server-side.
- Baseline handcrafted features are extracted (HOG image descriptor, MFCC-style audio statistics, Gabor fingerprint texture statistics) and encrypted before SQLite storage.
- Verification computes diagnostic similarity values but always returns `outcome=not_evaluated` and `policy_decision=pending`. No access decision is possible until the feature pipeline is replaced or validated against the intended dataset, operating thresholds are calibrated, and independent evaluation is completed.
- Audit records contain operation metadata, not raw samples or feature vectors.
- Raw uploads are processed in memory and are not persisted.

## API

- `GET /api/v1/health`
- `POST /api/v1/identities/enroll` (multipart: `profile`, `modalities`, `consent`, selected sample files)
- `POST /api/v1/verification/multimodal` (multipart: `claimed_identity_ref`, `modalities`, `authorization`, selected sample files)

Consent and authorization JSON fields are validated server-side. Browser acknowledgements alone are not security controls.

## Important limitations

No face detection/alignment or liveness detection is implemented. The handcrafted features are not trained identity embeddings, are not calibrated, and are not suitable for real-world access control. Similarity values are diagnostic only. This service is a coursework/dev prototype, not a production biometric security system.
