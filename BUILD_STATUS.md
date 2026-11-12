# Build status — current branch

| Area | Current status | Evidence / remaining work |
|---|---|---|
| Vanilla HTML/CSS/JS frontend | Implemented | Existing frontend preserved; no frontend framework introduced |
| Enrollment UI | Connected to experimental API | Validates profile, consent, selected files, and successful response shape |
| Verification UI | Connected to experimental API | Validates purpose/authorization and response shape; policy remains pending |
| FastAPI routes | Implemented and covered by tests | GET /api/v1/health; POST /api/v1/identities/enroll; POST /api/v1/verification/multimodal |
| Operator authentication | Implemented prototype | Shared bearer token; not production OIDC/RBAC |
| Consent/authorization checks | Implemented prototype | Server-side validation of browser acknowledgements and purpose; not a legal-authority workflow |
| Audit logging | Implemented | Metadata-only success/failure events; no raw samples, vectors, file names, or bearer tokens |
| Local persistence | Implemented | SQLite for local development |
| Vercel persistence | Implemented, not live-tested | PostgreSQL adapter via BIOGUARD_DATABASE_URL; requires a provisioned persistent database |
| Vercel deployment config | Multi-service configuration committed; deployment pending verification | Root vercel.toml routes the Vanilla frontend service (frontend/) and FastAPI service (api/, main:app); API has its own runtime requirements file; latest Vercel check is pending |
| Vercel request-size protection | Implemented | 4 MiB total API cap; frontend combined-file validation |
| Face features | Implemented | HOG + LBP; API/training parity tested |
| Voice features | Implemented | MFCC-style + ZCR + RMS; API/training parity tested |
| Fingerprint features | Implemented, optional | Gabor texture descriptor; API/training parity tested |
| Traditional classifiers/fusion | Implemented experimentally | SVM/Random Forest, early fusion, hierarchy, optional 3-modality fusion |
| Real-data training and accuracy | NOT RUN | No consented biometric dataset supplied |
| Trained model artifact | NOT INCLUDED | Verification remains NOT EVALUATED until a trusted compatible bundle is supplied |
| Original research modules and Streamlit app | NOT PRESENT in accessible branches | This branch does not claim to restore them |
| Face detection/alignment and liveness | NOT IMPLEMENTED | Required before any real-world biometric use |
| Live Vercel/PostgreSQL deployment | NOT VERIFIED | Requires Vercel environment variables and a persistent database connection |
| Browser/device end-to-end validation | NOT RUN | No browser visual check or webcam/microphone test performed |

## Verified CI

[GitHub Actions run #171](https://github.com/abdullah1xcd/-BioGuard-X-Hierarchical-Multimodal-Biometric-Verification-System-/actions/runs/43186962473) passed on code commit `d785261b6181ae4b6efaf0a46738794e505213dc`.

- Root and frontend npm installs and static build scripts: PASS
- Docker API image build: PASS
- Python compilation: PASS
- Frontend Node tests: PASS (9 tests)
- Vanilla JavaScript syntax: PASS
- Dependency consistency: PASS
- Python API/ML suite: PASS (24 tests: 18 API + 6 ML)

The run validates the combined multipart upload-size guard and its boundary tests. It does not include a browser/device or live Vercel/PostgreSQL test.

## Deployment status

The Vercel check for commit `d785261b6181ae4b6efaf0a46738794e505213dc` reported **failure** and supplied the command `npx vercel inspect dpl_FkGZLmaSXZuNVv2jkuH5omK5mh3w --logs`. Those deployment logs are not accessible through the connected GitHub integration, so the cause of this latest failure is not confirmed. A preceding deployment attempt explicitly reported a Vercel build-rate limit. Do not treat CI success as a successful deployment.

## Remaining owner-side deployment work

1. Provision a persistent PostgreSQL database through the Vercel Marketplace and set BIOGUARD_DATABASE_URL in Vercel Preview/Production environment variables.
2. Set BIOGUARD_API_TOKEN and BIOGUARD_ENCRYPTION_KEY as server-side secrets; never expose them in frontend/config.js.
3. Deploy with Vercel Root Directory set to the repository root. Do not select frontend/ when the API is required.
4. Confirm GET /api/v1/health returns status ready, database_backend postgresql, database_connected true, and persistent_storage_configured true.
5. Supply a trusted trained model artifact only after collecting and evaluating consented, representative, properly separated data. Until then, verification correctly returns NOT EVALUATED.

A green CI run verifies software checks, not biometric accuracy, liveness, production security, or a successful Vercel deployment.
