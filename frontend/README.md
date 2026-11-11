# BioGuard X — Vanilla Frontend

This folder contains the BioGuard X dashboard and the next two frontend modules, built with **HTML5, CSS3, and Vanilla JavaScript**. It does not use React, Vue, Angular, Streamlit, or a frontend build framework.

## Run locally

From the \`frontend\` directory, start a static server:

\`\`\`bash
python -m http.server 5500
\`\`\`

Then visit \`http://localhost:5500\`. The modules use local JavaScript and do not require a package install.

## Current frontend scope

- Responsive dark security operations dashboard with illustrative metrics and events
- Identity Enrollment form with profile validation, modality selection, sample-file checks, and explicit consent acknowledgement
- Biometric Verification form with claimed identity, modality selection, sample-file checks, and authorization acknowledgement
- Clear loading, validation, success, and demo-result states
- Face and voice modalities plus optional fingerprint (Gabor + HOG/LBP)
- Mobile navigation and responsive form layouts

## Demo-mode boundary

The enrollment and verification workflows currently perform **client-side form validation only**. Selected files are not uploaded, stored, or analyzed. The UI does not create an identity record, extract biometric features, compare samples, calculate match scores, calculate risk, or grant access. The verification result intentionally says **NOT EVALUATED**.

Use synthetic or explicitly consented test material only. Do not use real biometric samples in this browser-only preview.

## Backend status and integration plan

The project documentation describes a **17-page Streamlit application** (\`streamlit run app/main.py\`) with Python biometric engines and SQLite. However, direct GitHub tree inspection on 2026-11-11 found that neither \`main\` nor \`frontend/vanilla-js-redesign\` contains the referenced \`src/\`, \`app/\`, \`scripts/\`, or \`tests/\` directories. The documented \`app/main.py\` entry point and Python service implementations are therefore not available in the repository tree inspected for this integration. No FastAPI dependency, application entry point, router, or OpenAPI contract is present. No API endpoint can be confirmed, so the frontend does not send requests.

A separately mounted FastAPI adapter may be the smallest safe HTTP layer once the missing Python source is restored and the existing service interfaces are inspected. A draft contract, proposed schemas, security requirements, and integration gates are documented in [API_INTEGRATION_CONTRACT.md](./API_INTEGRATION_CONTRACT.md). Candidate routes in this README are proposals only, not implemented or verified:

| Purpose | Candidate route | Status |
|---|---|---|
| Create identity enrollment | \`POST /api/identities/enroll\` | Proposed only |
| List identities | \`GET /api/identities\` | Proposed only |
| Verify selected modalities | \`POST /api/verification/multimodal\` | Proposed only |
| Read verification events | \`GET /api/verification/events\` | Proposed only |
| Read dashboard summary | \`GET /api/dashboard/summary\` | Proposed only |

Before connecting the browser, agree on multipart upload fields, accepted media types and size limits, authentication/session handling, response schemas, error codes, and whether raw samples or derived templates are retained. Keep biometric processing, template storage, risk evaluation, authorization, and audit writes on the Python server. Enforce consent, access control, rate limits, input validation, secure storage, and deletion policy server-side. Risk signals must never grant access by themselves.

## Existing Python system

The frontend is a presentation layer only. Do not replace or rewrite the existing Python face, voice, fingerprint, fusion, hierarchy, security, automation, or SQLite modules when their source is restored. The current GitHub branch snapshot exposes project documentation describing those components, but not their implementation files. Keep the frontend in demo mode until the actual backend code is available and the integration gates in [API_INTEGRATION_CONTRACT.md](./API_INTEGRATION_CONTRACT.md) are satisfied.
