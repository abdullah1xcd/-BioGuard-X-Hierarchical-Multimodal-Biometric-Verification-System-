// Public runtime configuration for the static Vanilla JS frontend.
// Vercel deployments use the FastAPI service on the same origin by default.
// Local development remains demo-only until an API origin is explicitly configured.
// Never place API tokens, database credentials, or encryption keys in this file.
const isVercelHost = /\\.vercel\\.app$/i.test(window.location.hostname);
window.BIOGUARD_API_BASE = window.BIOGUARD_API_BASE || (isVercelHost ? window.location.origin : "");
window.BIOGUARD_API_MAX_REQUEST_BYTES = window.BIOGUARD_API_MAX_REQUEST_BYTES || (isVercelHost ? 4 * 1024 * 1024 : 0);
