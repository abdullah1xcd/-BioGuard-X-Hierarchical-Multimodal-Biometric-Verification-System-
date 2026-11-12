import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("../frontend/", import.meta.url)));
const PORT = Number(process.env.PORT || 3000);
const HOST = "0.0.0.0";
const DEFAULT_API_ORIGIN = "https://bio-guard-x-hierarchical-multimodal.vercel.app";

let API_ORIGIN;
try {
  API_ORIGIN = new URL(process.env.BIOGUARD_API_ORIGIN || DEFAULT_API_ORIGIN);
  if (API_ORIGIN.protocol !== "https:" &&
      !["localhost", "127.0.0.1"].includes(API_ORIGIN.hostname)) {
    throw new Error("BIOGUARD_API_ORIGIN must use HTTPS for remote hosts.");
  }
  if (API_ORIGIN.pathname !== "/" || API_ORIGIN.search || API_ORIGIN.hash) {
    throw new Error("BIOGUARD_API_ORIGIN must be an origin only, without a path or query.");
  }
} catch (error) {
  console.error("Invalid BioGuard API origin:", error.message);
  process.exit(1);
}

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

const ALLOWED_API_ROUTES = new Map([
  ["GET /api/v1/health", true],
  ["POST /api/v1/identities/enroll", true],
  ["POST /api/v1/verification/multimodal", true]
]);

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(JSON.stringify(payload));
}

async function proxyApi(request, response, pathname) {
  if (!ALLOWED_API_ROUTES.has(request.method + " " + pathname)) {
    sendJson(response, 404, { detail: { code: "ROUTE_NOT_FOUND", message: "This API route is not available through the BioGuard preview proxy." } });
    return;
  }

  const headers = { accept: request.headers.accept || "application/json" };
  if (request.headers.authorization) headers.authorization = request.headers.authorization;
  if (request.headers["content-type"]) headers["content-type"] = request.headers["content-type"];
  if (request.headers["content-length"]) headers["content-length"] = request.headers["content-length"];

  try {
    const upstream = await fetch(new URL(pathname, API_ORIGIN), {
      method: request.method,
      headers,
      body: request.method === "GET" ? undefined : request,
      ...(request.method === "GET" ? {} : { duplex: "half" }),
      redirect: "manual",
      signal: AbortSignal.timeout(50000)
    });
    const body = Buffer.from(await upstream.arrayBuffer());
    response.writeHead(upstream.status, {
      "content-type": upstream.headers.get("content-type") || "application/json",
      "cache-control": "no-store"
    });
    response.end(body);
  } catch (error) {
    console.error("BioGuard API proxy request failed:", error.name || "Error");
    sendJson(response, 502, {
      detail: {
        code: "BIOGUARD_UPSTREAM_UNAVAILABLE",
        message: "The BioGuard API could not be reached. The request outcome may be unknown; check backend records before retrying."
      }
    });
  }
}

async function serveStatic(request, response, pathname) {
  if (!["GET", "HEAD"].includes(request.method)) {
    sendJson(response, 405, { detail: { code: "METHOD_NOT_ALLOWED", message: "Only GET and HEAD are supported for static assets." } });
    return;
  }

  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    sendJson(response, 400, { detail: { code: "INVALID_PATH", message: "The requested asset path is invalid." } });
    return;
  }

  const relativePath = decoded.replace(/^\/+/, "") || "index.html";
  const filePath = resolve(ROOT, relativePath);
  if (filePath !== ROOT && !filePath.startsWith(ROOT + sep)) {
    sendJson(response, 403, { detail: { code: "PATH_NOT_ALLOWED", message: "The requested asset path is not allowed." } });
    return;
  }

  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error("Not a file");
    let content;
    if (relativePath === "config.js") {
      const source = await readFile(filePath, "utf8");
      content = Buffer.from("window.__BIOGUARD_USE_SAME_ORIGIN_API__ = true;\n" + source);
    }
    response.writeHead(200, {
      "content-type": MIME_TYPES[extname(filePath).toLowerCase()] || "application/octet-stream",
      "content-length": content ? content.length : info.size,
      "cache-control": relativePath === "index.html" || relativePath === "config.js" ? "no-store" : "public, max-age=300"
    });
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    if (content) response.end(content);
    else createReadStream(filePath).pipe(response);
  } catch {
    sendJson(response, 404, { detail: { code: "ASSET_NOT_FOUND", message: "The requested website asset was not found." } });
  }
}

const server = createServer(async (request, response) => {
  let url;
  try {
    url = new URL(request.url || "/", "http://localhost");
  } catch {
    sendJson(response, 400, { detail: { code: "INVALID_URL", message: "The request URL is invalid." } });
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    await proxyApi(request, response, url.pathname);
    return;
  }
  await serveStatic(request, response, url.pathname);
});

server.listen(PORT, HOST, () => {
  console.log(`BioGuard X ready on http://${HOST}:${PORT}`);
  console.log(`API proxy target: ${API_ORIGIN.origin}`);
});
