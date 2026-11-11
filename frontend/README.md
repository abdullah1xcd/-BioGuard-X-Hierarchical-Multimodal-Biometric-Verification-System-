# BioGuard X — Vanilla Frontend

This folder contains the first frontend redesign milestone, built with **HTML5, CSS3, and Vanilla JavaScript**. It does not use React, Vue, Angular, Streamlit, or a frontend build framework.

## Run locally

Open `index.html` in a browser, or serve this folder with a local static server:

```bash
python -m http.server 5500
```

Then visit `http://localhost:5500`.

## Current scope

- Responsive dark security operations dashboard
- Sidebar navigation shell for the planned platform sections
- KPI cards, activity chart, security posture, event table, and alert panel
- Client-side event search, mobile navigation, dismissible notice, and toast feedback
- Clearly marked illustrative data

## Important integration note

The dashboard currently uses **demo-only values**. It does not claim to perform biometric verification in the browser. The existing Python biometric engines should remain in the backend and be exposed through a documented API (recommended: FastAPI). The next integration milestone should define endpoints for:

- `GET /api/dashboard/summary`
- `GET /api/verification/events`
- `POST /api/verification/face`
- `POST /api/verification/voice`
- `POST /api/verification/multimodal`
- `GET /api/security/alerts`
- `GET /api/identities`

Do not expose model files, database credentials, or privileged operations directly to browser JavaScript. Enforce authentication, authorization, input validation, rate limits, and audit logging on the server.
