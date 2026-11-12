const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadBrowserScript(filename, exportName) {
  const context = { window: {} };
  const source = fs.readFileSync(path.join(__dirname, "..", filename), "utf8");
  vm.runInNewContext(source, context, { filename });
  return context.window[exportName];
}

const modules = loadBrowserScript("modules.js", "BioGuardModules");
const contract = loadBrowserScript("api-contract.js", "BioGuardApiContract");

test("demo enrollment is usable without exposing biometric file inputs", () => {
  const html = modules.enrollment({ apiConfigured: false });
  assert.match(html, /Demo-only preview/);
  assert.match(html, /No biometric files are selected, captured, uploaded, stored, or compared/);
  assert.match(html, /name="consent"/);
  assert.doesNotMatch(html, /type="file"/);
});

test("demo verification is clearly not evaluated and requires authorization", () => {
  const html = modules.verification({ apiConfigured: false });
  assert.match(html, /Demo-only preview/);
  assert.match(html, /does not create identities, compare biometrics, calculate risk, or make access decisions/);
  assert.match(html, /name="purpose"/);
  assert.match(html, /name="authorization"/);
  assert.doesNotMatch(html, /type="file"/);
});

test("API enrollment exposes all selectable modalities and protected sample inputs", () => {
  const html = modules.enrollment({ apiConfigured: true });
  assert.match(html, /Configured API mode/);
  assert.match(html, /name="enroll-modality"/);
  assert.match(html, /data-upload="face"/);
  assert.match(html, /data-upload="voice"/);
  assert.match(html, /data-upload="fingerprint"/);
  assert.match(html, /OPTIONAL/);
  assert.equal((html.match(/type="file"/g) || []).length, 3);
  assert.match(html, /name="consent"/);
});

test("API verification requires a claimed identity, purpose, authorization, and samples", () => {
  const html = modules.verification({ apiConfigured: true });
  assert.match(html, /name="verify-modality"/);
  assert.match(html, /name="identityRef"/);
  assert.match(html, /name="purpose"/);
  assert.match(html, /name="authorization"/);
  assert.equal((html.match(/type="file"/g) || []).length, 3);
});

test("enrollment response must confirm the requested identity, modalities, and audit event", () => {
  const response = {
    request_id: "request-1",
    identity: { identity_ref: "BG-123", status: "enrolled" },
    registered_modalities: ["face", "voice"],
    audit_event_id: "audit-1"
  };
  assert.equal(contract.assertEnrollmentResponse(response, "BG-123", ["voice", "face"]), response);

  for (const invalid of [
    { ...response, identity: { identity_ref: "BG-999", status: "enrolled" } },
    { ...response, registered_modalities: ["face"] },
    { ...response, audit_event_id: "" },
    null
  ]) {
    let caught;
    try {
      contract.assertEnrollmentResponse(invalid, "BG-123", ["face", "voice"]);
    } catch (error) {
      caught = error;
    }
    assert.equal(caught && caught.code, "INVALID_API_RESPONSE");
  }
});

test("verification response accepts not-evaluated and experimental outcomes only while policy stays pending", () => {
  const response = {
    request_id: "request-2",
    verification_id: "verification-2",
    outcome: "not_evaluated",
    policy_decision: "pending",
    reason_code: "CALIBRATION_REQUIRED",
    diagnostic_similarity: {},
    audit_event_id: "audit-2",
    message: "No access decision was made."
  };
  assert.equal(contract.assertVerificationResponse(response), response);
  assert.equal(contract.assertVerificationResponse({
    ...response,
    outcome: "match",
    reason_code: "EXPERIMENTAL_MODEL_RESULT"
  }).outcome, "match");

  for (const invalid of [
    { ...response, policy_decision: "granted" },
    { ...response, outcome: "access_granted" },
    { ...response, diagnostic_similarity: [] },
    { ...response, audit_event_id: null }
  ]) {
    let caught;
    try {
      contract.assertVerificationResponse(invalid);
    } catch (error) {
      caught = error;
    }
    assert.equal(caught && caught.code, "INVALID_API_RESPONSE");
  }
});
function loadRuntimeConfig(hostname, origin) {
  const context = { window: { location: { hostname, origin } } };
  const source = fs.readFileSync(path.join(__dirname, "..", "config.js"), "utf8");
  vm.runInNewContext(source, context, { filename: "config.js" });
  return context.window;
}

test("Vercel host defaults to same-origin API and enforces the combined request cap", () => {
  const config = loadRuntimeConfig("bioguard-demo.vercel.app", "https://bioguard-demo.vercel.app");
  assert.equal(config.BIOGUARD_API_BASE, "https://bioguard-demo.vercel.app");
  assert.equal(config.BIOGUARD_API_MAX_REQUEST_BYTES, 4 * 1024 * 1024);
});

test("local and custom hosts remain opt-in for API requests", () => {
  const local = loadRuntimeConfig("localhost", "http://localhost:5500");
  const custom = loadRuntimeConfig("bioguard.example.com", "https://bioguard.example.com");
  assert.equal(local.BIOGUARD_API_BASE, "");
  assert.equal(local.BIOGUARD_API_MAX_REQUEST_BYTES, 0);
  assert.equal(custom.BIOGUARD_API_BASE, "");
  assert.equal(custom.BIOGUARD_API_MAX_REQUEST_BYTES, 0);
});
test("combined multipart request cap blocks oversized selections while local mode stays uncapped", () => {
  const cap = 4 * 1024 * 1024;
  const overhead = 128 * 1024;
  assert.equal(contract.isWithinRequestLimit(cap - overhead, cap), true);
  assert.equal(contract.isWithinRequestLimit(cap - overhead + 1, cap), false);
  assert.equal(contract.isWithinRequestLimit(cap, cap), false);
  assert.equal(contract.isWithinRequestLimit(20 * 1024 * 1024, 0), true);
  assert.equal(contract.isWithinRequestLimit(-1, cap), false);
});
