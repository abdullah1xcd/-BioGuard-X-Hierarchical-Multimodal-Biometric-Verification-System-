# Import BioGuard X into Google AI Studio

This branch adds a dependency-free Node.js development server so Google AI Studio can start the existing Vanilla JavaScript website.

## Import

1. In Google AI Studio, choose **Build** and import the GitHub repository.
2. Select the branch `ai-studio/import-compatibility` (or the pull request branch after review).
3. Let AI Studio install the project and run its development server.
4. The project uses `npm run dev`; the server listens on the platform-provided `PORT` (default 3000).

## API connection

The Node server serves the original files from `frontend/` and proxies only these same-origin routes to the existing deployed FastAPI service:

- `GET /api/v1/health`
- `POST /api/v1/identities/enroll`
- `POST /api/v1/verification/multimodal`

The default upstream is `https://bio-guard-x-hierarchical-multimodal.vercel.app`. To use another deployment, set the server-side environment variable `BIOGUARD_API_ORIGIN` to its HTTPS origin (no path). The browser continues to prompt for the existing operator bearer token and keeps it in page memory only. The proxy forwards that authorization header; it does not store or invent credentials.

The proxy avoids browser CORS restrictions without widening the FastAPI CORS allowlist. It does not proxy arbitrary URLs or routes.

## Important

- The original HTML, CSS, JavaScript modules, biometric extraction code, FastAPI backend, Vercel configuration, and API request/response contracts are preserved.
- AI Studio runs the frontend and proxy. The biometric processing remains on the existing deployed Python API; this does not port or simulate the biometric algorithms in JavaScript.
- The backend still requires its existing server-side token, encryption key, and persistent PostgreSQL configuration. Do not put these secrets in frontend files or AI Studio client-side code.
- Enrollment and verification require real supported samples and valid authorization/consent. Health success alone does not prove those operations succeed.
- This is an import/runtime compatibility adapter, not a redesign of the website.
