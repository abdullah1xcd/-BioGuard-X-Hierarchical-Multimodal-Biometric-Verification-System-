# BioGuard X API integration contract (draft — not implemented)

## Status and scope

This document is a proposed integration boundary for the vanilla JavaScript frontend. It is **not** an implemented API, a FastAPI service, or evidence that the biometric engines are callable through HTTP.

Repository inspection on 2026-11-11 found that the checked-out `main` and `frontend/vanilla-js-redesign` GitHub trees contain the frontend and project documentation, but do not contain the Python source directories referenced by the documentation (`src/`, `app/`, `scripts/`, `tests/`). The root README and installation guide describe a Streamlit application, but the referenced `app/main.py` and Python service implementations are not present in the repository tree available for this integration. No FastAPI dependency, application entry point, router, or OpenAPI contract is present either.

**Therefore no browser API calls are enabled.** Enrollment and verification remain explicit local demo flows. Do not deploy a route based on this draft until the missing Python source is restored and each service adapter is reviewed and tested.

## Smallest safe architecture

Keep the existing Streamlit application and Python biometric/security modules as the source of truth. Once the Python source is available:

1. Identify the existing enrollment, verification, risk/policy, permission, and audit service entry points. Reuse those services; do not copy biometric logic into a new web layer.
2. Add a separately mounted FastAPI adapter (for example, `api/main.py`) that imports the existing service layer. Do not change Streamlit startup or its current navigation.
3. Add a small authenticated API router and request/response schemas. The adapter must call the same domain services and persistence layer as Streamlit, not maintain a second identity store or audit trail.
4. Keep raw sample handling server-side. Use temporary files with strict limits and cleanup; do not log sample bytes, derived templates, feature vectors, or secrets.
5. Keep the current frontend in demo mode until the adapter has an implemented OpenAPI document, passing service tests, and a deployed HTTPS origin.

A thin adapter is safer than turning Streamlit internals into public HTTP endpoints, but the adapter cannot be implemented or verified against absent service code.

## Proposed API surface

All paths below are **proposals only**. They are not currently served.

| Method and path | Purpose | Status |
|---|---|---|
| `POST /api/v1/identities/enroll` | Consent-backed identity enrollment | Not implemented |
| `POST /api/v1/verification/multimodal` | Claimed-identity biometric verification | Not implemented |
| `GET /api/v1/health` | Non-sensitive service readiness | Not implemented |

Do not add identity listing, audit browsing, analytics, or administrative endpoints until their authorization rules and data ownership are defined.

## Authentication and transport

- Require an authenticated operator session for every route. Prefer the existing platform identity/session mechanism if one exists; otherwise define a reviewed server-side session or short-lived bearer-token mechanism before implementation.
- Enforce role/permission checks server-side for enrollment and verification. A browser checkbox is an acknowledgement, not authorization.
- Use HTTPS only outside local development. If cookie sessions are used, add CSRF protection and strict SameSite settings. Restrict CORS to the exact frontend origin; never use wildcard origins with credentials.
- Apply per-user and per-IP rate limits, request timeouts, and an overall multipart body limit.
- Return generic client errors; keep stack traces, filesystem paths, model locations, and internal security details in protected server logs only.

## Enrollment request (proposed)

**Request:** `multipart/form-data`

| Part | Type | Required | Validation |
|---|---|---:|---|
| `profile` | JSON string | Yes | `full_name` 2–100 chars; optional `external_ref` 3–32 chars from `[A-Za-z0-9_-]`; reject unknown fields |
| `modalities` | JSON string array | Yes | Non-empty subset of `face`, `voice`, `fingerprint`; must match supplied file parts |
| `consent` | JSON string | Yes | `granted: true`, policy version and consent capture context; server records authenticated actor and server receipt time |
| `face_sample` | File | If face selected | Image decode validation; maximum 10 MiB |
| `voice_sample` | File | If voice selected | Audio decode validation; maximum 20 MiB |
| `fingerprint_sample` | File | If fingerprint selected | Image decode validation; maximum 10 MiB |

Do not trust filename extensions or browser-provided MIME types. Inspect file signatures and decode with approved libraries. Reject missing, extra, malformed, or mismatched modality parts. The limits above are proposed initial caps, not backend-confirmed capabilities.

**Success response (proposed, HTTP 201):**

```json
{
  "request_id": "server-generated-correlation-id",
  "identity": {
    "identity_ref": "server-generated-or-approved-reference",
    "status": "enrolled"
  },
  "registered_modalities": ["face", "voice"],
  "audit_event_id": "server-generated-event-id"
}
```

Return no raw sample, biometric template, feature vector, filesystem path, or model detail.

## Verification request (proposed)

**Request:** `multipart/form-data`

| Part | Type | Required | Validation |
|---|---|---:|---|
| `claimed_identity_ref` | String | Yes | 3–32 permitted characters; must resolve to an active identity |
| `modalities` | JSON string array | Yes | Non-empty subset of supported modalities; must match supplied file parts |
| `authorization` | JSON string | Yes | Operator attestation/context; server independently checks permission and purpose |
| `face_sample` | File | If face selected | Decodable image; maximum 10 MiB |
| `voice_sample` | File | If voice selected | Decodable audio; maximum 20 MiB |
| `fingerprint_sample` | File | If fingerprint selected | Decodable image; maximum 10 MiB |

**Response (proposed, HTTP 200):**

```json
{
  "request_id": "server-generated-correlation-id",
  "verification_id": "server-generated-verification-id",
  "outcome": "verified",
  "policy_decision": "pending",
  "reason_code": "POLICY_REVIEW_REQUIRED",
  "audit_event_id": "server-generated-event-id"
}
```

Allowed `outcome` values: `verified`, `not_verified`, `review_required`, `not_evaluated`. Allowed `policy_decision` values: `allow`, `deny`, `pending`. These values are illustrative schema choices and must be reconciled with the actual verifier and policy service. A biometric outcome is not an access grant. Only the existing server-side permission/policy/approval flow may decide access; risk signals alone must never grant access. Avoid returning raw similarity scores or thresholds to the browser unless a documented product/security review explicitly approves them.

## Error envelope (proposed)

Use a stable, non-sensitive error shape:

```json
{
  "error": {
    "code": "INVALID_SAMPLE",
    "message": "One or more samples could not be accepted.",
    "request_id": "server-generated-correlation-id"
  }
}
```

Suggested HTTP mapping: 400 malformed request; 401 unauthenticated; 403 unauthorized or consent/purpose not permitted; 404 unknown identity; 413 upload too large; 415 unsupported media; 422 validation/decoding failure; 429 rate limited; 503 service/model unavailable. Do not convert a backend/model failure into a negative biometric match or an access decision.

## Audit and retention requirements

- Write audit events server-side for enrollment attempts, consent acceptance/rejection, verification attempts, policy outcomes, and administrative actions.
- Record actor/session ID, action, identity reference where appropriate, selected modality names, server timestamp, correlation ID, outcome/reason code, and approval reference. Do not log raw biometrics, templates, feature arrays, credentials, or full request bodies.
- Define retention, deletion, backup, and model-retraining implications with the existing database/service owners before enabling enrollment.
- Default to ephemeral raw upload handling and cleanup after processing unless the existing approved retention policy explicitly requires otherwise. Never silently persist browser uploads.

## Frontend integration gate

The frontend may switch from demo mode only after all of the following are true:

- The Python service source and supported service-call signatures are present and inspected.
- The adapter is implemented and exposes a reviewed OpenAPI schema.
- Authentication, roles, CSRF/CORS, consent, upload limits, audit writes, retention, and error handling are tested server-side.
- Integration tests prove the adapter calls the real services and that failures return `not_evaluated`/service errors rather than fabricated matches.
- A local or staging HTTPS deployment has been tested with synthetic/consented test data.

Until then, keep `frontend/app.js` in local demo mode and keep the visible `NOT EVALUATED` boundary.
