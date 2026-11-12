# Remaining work to complete BioGuard X validation

## Vercel deployment and configuration

The repository is configured to deploy the Vanilla frontend and FastAPI adapter from the repository root on Vercel. The latest deployment attempt was blocked by Vercel's build-rate limit, which reported that it could be retried after 24 hours (from 12 Nov 2026 08:57:49 UTC). The current GitHub Actions code-validation run passed; that does not mean the Vercel deployment is live.

1. After the rate-limit window, inspect the failed deployment with an authenticated Vercel CLI session:
   `npx vercel inspect dpl_FkGZLmaSXZuNVv2jkuH5omK5mh3w --logs`.
2. Keep the Vercel Root Directory at the repository root (`.`), not `frontend`.
3. Set server-side Preview/Production secrets: `BIOGUARD_API_TOKEN`, a generated stable `BIOGUARD_ENCRYPTION_KEY`, and `BIOGUARD_DATABASE_URL` from a persistent PostgreSQL database provisioned through the Vercel Marketplace.
4. For a custom domain, configure the frontend API origin to the same HTTPS deployment origin. The `.vercel.app` frontend defaults to same-origin API routing.
5. Confirm `GET /api/v1/health` reports `status: ready`, `database_backend: postgresql`, `database_connected: true`, and `persistent_storage_configured: true`.
6. Never put API tokens, database credentials, encryption keys, or model files in browser-visible configuration.

## Dataset and model validation

1. Collect consented face/voice samples for at least two participants, with 10+ matched filename stems per participant.
2. For three-modality training, add a same-stem fingerprint sample for every matched face/voice sample.
3. Keep capture sessions separate and record session metadata; the current split is sample-level, not session-aware.
4. Run `python -m pytest tests -q`.
5. Run `python -m scripts.run_ml_pipeline --dataset datasets/custom --output reports`.
6. Review `reports/metrics.json`, confusion matrices, FAR/FRR/EER, and validation thresholds. Report only measured real-data test results.
7. Provision the trusted generated model bundle to the deployment and set `BIOGUARD_MODEL_PATH`. Until a compatible bundle is present, verification correctly returns `not_evaluated`.

## Remaining engineering and acceptance gates

- Session-aware or participant-independent evaluation.
- Face detection/alignment and liveness/spoof experiments if required by the professor.
- Browser interaction and actual webcam/microphone testing on the project owner's machine.
- Production hardening: OIDC/RBAC, rate limiting, managed key storage/rotation, identity deletion/retention policy, monitoring, and independent security review.
- Any real access-control policy integration must be independently reviewed. The current API deliberately keeps `policy_decision=pending`.

The original Streamlit app, original biometric service modules, risk engine, security agent, automation engine, and speech-command modules referenced by older documentation are absent from both accessible branches. They must be restored from the actual source/backup if they are still required; this branch does not fabricate replacements for them.
