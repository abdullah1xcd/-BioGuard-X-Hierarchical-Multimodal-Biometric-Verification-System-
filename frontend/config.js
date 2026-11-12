// Public runtime configuration for the static Vanilla JS frontend.
// Vercel serves the API on the same origin. The AI Studio Node server injects
// __BIOGUARD_USE_SAME_ORIGIN_API__ and proxies the approved /api routes server-side.
// Local static-file previews remain demo-only unless an API origin is explicitly configured.
// Never place API tokens, database credentials, or encryption keys in this file.
const isVercelHost = /\\.vercel\\.app$/i.test(window.location.hostname);
const useSameOriginApi = isVercelHost || window.__BIOGUARD_USE_SAME_ORIGIN_API__ === true;
window.BIOGUARD_API_BASE = window.BIOGUARD_API_BASE || (useSameOriginApi ? window.location.origin : "");
window.BIOGUARD_API_MAX_REQUEST_BYTES = window.BIOGUARD_API_MAX_REQUEST_BYTES || (useSameOriginApi ? 4 * 1024 * 1024 : 0);
