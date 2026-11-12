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
$env:BIOGUARD_MODEL_PATH = "reports/bioguard_traditional_ml.joblib"  # set after training
uvicorn api.main:app --reload
```

Keep the encryption key stable and backed up securely; losing it makes stored templates unreadable. Never commit secrets or expose the operator token in a public frontend. For production, replace the development bearer-token mechanism with the platform's reviewed operator session/OIDC integration, HTTPS, rate limiting, CSRF protections where applicable, and managed key storage.

OpenAPI docs: http://127.0.0.1:8000/docs

## Current behavior

- Authenticated, consent-gated enrollment accepts face, voice and/or fingerprint samples.
- Upload sizes and actual decodability are checked server-side.
- Face and voice enrollment features use the same HOG+LBP and MFCC+ZCR+RMS extractors as the traditional-ML training pipeline; feature parity is covered by tests. Fingerprint uses the same 24-dimensional Gabor descriptor as training. If a versioned bundle was trained with complete matched fingerprint samples, the API supports fingerprint-only experimental scoring and three-modality fusion; otherwise fingerprint verification remains not evaluated.
- Set `BIOGUARD_MODEL_PATH` to `reports/bioguard_traditional_ml.joblib` after running the training pipeline. The API loads the versioned bundle and can return experimental `match` / `no_match` results for face-only, voice-only, early-fusion scoring, and face-first hierarchical routing when the corresponding trained models are present.
- `policy_decision` deliberately remains `pending` for every result. A model output is not an authorization decision. The bundle must be trained on consented representative data and independently reviewed before any operational use.
- Successful enrollment commits its identity, encrypted templates, and metadata-only audit event atomically. Successful verification and failed enrollment/verification attempts also write metadata-only audit events; failure records do not include request bodies, file names, raw samples, feature vectors, or bearer tokens.
- The application does not persist raw uploads in its database or audit log. Starlette's multipart parser may temporarily spool larger uploads to API-host temporary storage until request cleanup; restrict access to that storage and manage it securely.

## API

- `GET /api/v1/health`
- `POST /api/v1/identities/enroll` (multipart: `profile`, `modalities`, `consent`, selected sample files)
- `POST /api/v1/verification/multimodal` (multipart: `claimed_identity_ref`, `modalities`, `authorization`, selected sample files)

Consent and authorization JSON fields are validated server-side. Browser acknowledgements alone are not security controls.

## Important limitations

No face detection/alignment or liveness detection is implemented. The handcrafted features are not trained identity embeddings, are not calibrated, and are not suitable for real-world access control. Similarity values are diagnostic only. This service is a coursework/dev prototype, not a production biometric security system.
