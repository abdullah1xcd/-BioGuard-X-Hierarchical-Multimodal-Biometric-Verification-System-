# Build status — verified against the current branch

| Area | Current status | Evidence / blocker |
|---|---|---|
| Vanilla HTML/CSS/JS frontend | Implemented | No frontend framework; syntax checked in CI |
| Enrollment UI | Implemented | Form validation, selected modality uploads, consent acknowledgement, loading/success/error states |
| Verification UI | Implemented | NOT EVALUATED without model; experimental match/no-match with model; policy always pending |
| FastAPI adapter | Experimental prototype | Authenticated enrollment, encrypted templates, metadata audit, trained bundle inference |
| Face features | Implemented | HOG + LBP; API/training parity tested |
| Voice features | Implemented | MFCC + ZCR + RMS; API/training parity tested |
| Fingerprint features | Implemented, optional | Gabor descriptor; API/training parity tested |
| Traditional classifiers | Implemented | Calibrated SVM and Random Forest for face, voice, and optional fingerprint |
| Early fusion | Implemented | Face+voice feature fusion |
| Three-modality fusion | Implemented, optional | Face+voice+fingerprint when every paired sample has a matching fingerprint file |
| Hierarchical verification | Implemented | Face-first with validation-derived uncertainty band and voice fallback |
| Train/validation/test split | Implemented | Deterministic 60/20/20 sample-level split; not session-aware or participant-independent |
| Evaluation metrics | Implemented | Accuracy, precision, recall, F1, FAR, FRR, EER, ROC-AUC, confusion matrix |
| API-to-model integration | Implemented experimentally | Versioned joblib bundle, shared feature extractors, SVM scores/thresholds, early fusion, hierarchy, optional 3-modality fusion |
| Real-data training/results | NOT RUN | No consented biometric dataset supplied |
| Original risk engine, security agent, automation, speech commands, Streamlit app | NOT PRESENT | Missing from both accessible branches |
| Face detection/alignment and liveness | NOT IMPLEMENTED | Not part of current model path; required before real-world use |
| Hardware/browser end-to-end validation | NOT RUN | Requires owner machine and actual webcam/microphone |

## Latest CI

[GitHub Actions run #107](https://github.com/abdullah1xcd/-BioGuard-X-Hierarchical-Multimodal-Biometric-Verification-System-/actions/runs/43123791346) — PASS: root and frontend `npm ci`, both static build scripts, Docker image build, Python compilation, Vanilla JS syntax, dependency consistency, and API/ML tests. This verifies the container and install/build setup, not an external production deployment.

## Latest deployment

[Vercel project](https://vercel.com/haroon15/bio-guard-x-hierarchical-multimodal-biometric-verification-system) — no successful deployment has been verified for the latest branch commits. The frontend now has a runtime API URL configuration file, but it remains blank until a separate HTTPS API host is configured.

## Required owner-side work

1. Collect consented, session-separated biometric data with matched filenames; include fingerprint files if using three-way fusion.
2. Run the training command and review real-data metrics.
3. Configure the API to load the generated model bundle and validate locally.
4. Test actual browser/device capture if required by the course.

A green CI run proves automated software checks pass. It does not prove biometric accuracy, liveness, or production readiness.

## 2026-11-12 implementation update

- Added root and `frontend/` npm manifests, lockfiles, and no-op static build scripts so Vercel can install dependencies and build from either supported Root Directory.
- CI now runs `npm ci` and the static build scripts from both locations, builds the backend Docker image, then runs Python/ML tests.
- Added `frontend/config.js`, loaded before the application scripts. Set `window.BIOGUARD_API_BASE` there to the deployed HTTPS API origin; no backend origin has been supplied yet.
- Added a live unauthenticated API health check to the dashboard sidebar. Health now checks database connectivity and encryption configuration; model artifact presence is not mislabeled as a validated loaded model.
- Removed fabricated dashboard counts, chart values, sample identities, activity events, alerts, and hardcoded admin identity. The dashboard shows explicit unavailable/empty states until real analytics and identity APIs exist.
- Added `Dockerfile`, `.dockerignore`, `.env.example`, and `DEPLOYMENT.md` for repeatable API container preparation. The Docker image build passed in CI run #107.
- Added Git ignore rules for secrets, local databases, service-account credentials, and generated model artifacts.
- Latest health-check/API response changes are being tested in subsequent CI runs; do not treat them as green until the latest run completes.
