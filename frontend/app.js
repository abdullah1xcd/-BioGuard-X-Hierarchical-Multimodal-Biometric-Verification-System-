const navItems = document.querySelectorAll(".nav-item[data-page]");
const pageTitle = document.getElementById("pageTitle");
const pageSubtitle = document.getElementById("pageSubtitle");
const breadcrumbCurrent = document.getElementById("breadcrumbCurrent");
const toast = document.getElementById("toast");
const overviewView = document.getElementById("overviewView");
const moduleView = document.getElementById("moduleView");
const overviewMarkup = overviewView.innerHTML;
const API_BASE_URL = String(window.BIOGUARD_API_BASE || (["localhost", "127.0.0.1"].includes(window.location.hostname) ? "http://127.0.0.1:8000" : "")).trim().replace(/\/+$/, "");
let operatorApiToken = "";

const pageCopy = {
  overview: ["Overview", "Here's what's happening across your biometric security environment."],
  verification: ["Biometric verification", "Submit selected modalities for an experimental comparison; policy remains pending."],
  enrollment: ["Identity enrollment", "Create an experimental identity profile and register encrypted feature templates."],
  identities: ["Identity directory", "Manage enrolled identities, profile status, and biometric records."],
  analytics: ["Security analytics", "Explore verification performance, trends, and model evaluation metrics."],
  intelligence: ["Threat intelligence", "Investigate risk signals, suspicious behavior, and analyst findings."],
  automation: ["Automation center", "Monitor security workflows, approvals, and automated responses."],
  audit: ["Audit trail", "Review a traceable history of authentication and administrative events."],
  access: ["Access control", "Manage roles, permissions, and privileged access policies."],
  settings: ["Platform settings", "Configure security preferences and environment options."]
};

function apiBaseIsSecure() {
  if (!API_BASE_URL) return false;
  try {
    const url = new URL(API_BASE_URL);
    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    return url.protocol === "https:" || (loopback && url.protocol === "http:");
  } catch (_) {
    return false;
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2800);
}

function setPage(page) {
  navItems.forEach((item) => item.classList.toggle("active", item.dataset.page === page));
  const copy = pageCopy[page] || pageCopy.overview;
  pageTitle.textContent = page === "overview" ? greeting() : copy[0];
  pageSubtitle.textContent = copy[1];
  breadcrumbCurrent.textContent = copy[0];
  document.getElementById("sidebar").classList.remove("open");

  if (page === "overview") {
    moduleView.hidden = true;
    overviewView.hidden = false;
    overviewView.innerHTML = overviewMarkup;
    bindOverviewEvents();
    return;
  }

  overviewView.hidden = true;
  moduleView.hidden = false;
  if (page === "enrollment" || page === "verification") {
    moduleView.innerHTML = window.BioGuardModules[page]();
    bindModuleEvents(page);
  } else {
    moduleView.innerHTML = '<section class="panel coming-soon"><span class="coming-icon">⌁</span><h2>' + copy[0] + '</h2><p>This workspace is planned for the next BioGuard X frontend milestone. No live backend data is shown here yet.</p><span class="demo-chip"><i></i> PREVIEW</span></section>';
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function refreshApiHealth() {
  const label = document.querySelector('.system-status small');
  const pulse = document.querySelector('.system-status .status-pulse');
  if (!label || !pulse) return;
  if (!API_BASE_URL) {
    label.textContent = 'API URL not configured';
    pulse.style.backgroundColor = '#e6a34a';
    return;
  }
  if (!apiBaseIsSecure()) {
    label.textContent = 'HTTPS required for remote API';
    pulse.style.backgroundColor = '#e6a34a';
    return;
  }
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(API_BASE_URL + '/api/v1/health', { method: 'GET', signal: controller.signal });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const health = await response.json();
    if (health.status === 'ready') {
      label.textContent = 'API connected · ' + health.verification_mode.replace(/_/g, ' ');
      pulse.style.backgroundColor = '#29d5c2';
    } else if (health.status === 'degraded') {
      label.textContent = 'API connected · database unavailable';
      pulse.style.backgroundColor = '#e06464';
    } else {
      label.textContent = 'API connected · encryption configuration required';
      pulse.style.backgroundColor = '#e6a34a';
    }
  } catch (_) {
    label.textContent = 'API unreachable · check backend and CORS';
    pulse.style.backgroundColor = '#e06464';
  } finally {
    window.clearTimeout(timeout);
  }
}
function greeting() {
  const hour = new Date().getHours();
  return "Welcome to BioGuard X";
}

function bindOverviewEvents() {
  const search = document.getElementById("eventSearch");
  if (search) search.addEventListener("input", (event) => {
    const query = event.target.value.trim().toLowerCase();
    const rows = [...document.querySelectorAll("#eventRows tr")];
    let visible = 0;
    rows.forEach((row) => {
      const matches = row.textContent.toLowerCase().includes(query);
      row.hidden = !matches;
      if (matches) visible += 1;
    });
    document.getElementById("visibleCount").textContent = visible;
    document.getElementById("emptyState").hidden = visible !== 0;
  });

  const dismiss = document.getElementById("dismissNotice");
  if (dismiss) dismiss.addEventListener("click", () => document.querySelector(".notice-banner").remove());
  const viewAll = document.getElementById("viewAllEvents");
  if (viewAll) viewAll.addEventListener("click", () => setPage("audit"));
  const alerts = document.getElementById("allAlerts");
  if (alerts) alerts.addEventListener("click", () => setPage("intelligence"));
  const filter = document.getElementById("filterButton");
  if (filter) filter.addEventListener("click", () => showToast("Event filters will be connected to the audit API."));
  const period = document.getElementById("periodSelect");
  if (period) period.addEventListener("click", () => showToast("Date-range selection is coming with analytics integration."));
}

function selectedModalities(prefix) {
  return [...moduleView.querySelectorAll('input[name="' + prefix + '-modality"]:checked')].map((input) => input.value);
}

function selectedFiles(prefix, selected) {
  const files = {};
  selected.forEach((kind) => {
    const input = moduleView.querySelector('[data-upload="' + kind + '"]');
    files[kind] = input && input.files ? input.files[0] : null;
  });
  return files;
}

function validateFiles(files, errorElement) {
  const limits = { face: 10, voice: 20, fingerprint: 10 };
  const missing = Object.keys(files).filter((kind) => !files[kind]);
  const oversized = Object.keys(files).filter((kind) => files[kind] && files[kind].size > limits[kind] * 1024 * 1024);
  const wrongType = Object.keys(files).filter((kind) => {
    if (!files[kind]) return false;
    const type = files[kind].type || "";
    return kind === "voice" ? !type.startsWith("audio/") : !type.startsWith("image/");
  });
  if (missing.length || oversized.length || wrongType.length) {
    const parts = [];
    if (missing.length) parts.push("Add a sample for: " + missing.join(", ") + ".");
    if (oversized.length) parts.push("File exceeds the size limit: " + oversized.join(", ") + ".");
    if (wrongType.length) parts.push("Unsupported file type for: " + wrongType.join(", ") + ".");
    errorElement.textContent = parts.join(" ");
    return false;
  }
  errorElement.textContent = "";
  return true;
}

function showDemoPreview(page, form, feedback) {
  feedback.hidden = false;
  feedback.className = "form-feedback feedback-info";
  if (page === "enrollment") {
    feedback.textContent = "Offline demo preview only. No biometric files were uploaded, no feature extraction ran, and no identity or template was created.";
    showToast("Offline demo preview — no data sent.");
    return;
  }

  const result = document.getElementById("verificationResult");
  const identityRef = form.elements.identityRef.value.trim();
  const selected = selectedModalities("verify");
  result.hidden = false;
  result.innerHTML = '<div class="result-header"><div><span class="demo-chip"><i></i> OFFLINE DEMO</span><h3>Verification not evaluated</h3><p>Reference: ' +
    escapeHtml(identityRef || "Not provided") +
    '</p></div><span class="result-status">NOT EVALUATED</span></div>' +
    '<div class="result-warning"><strong>No biometric processing occurred.</strong><span>This offline preview sent no files, performed no comparison, generated no risk score, and made no access decision.</span></div>' +
    '<div class="result-meta"><span>Selected signals <strong>' + selected.map(escapeHtml).join(" · ") +
    '</strong></span><span>Policy <strong>pending</strong></span></div>';
  feedback.textContent = "Offline demo only. No biometric files were uploaded or processed.";
  result.scrollIntoView({ behavior: "smooth", block: "nearest" });
  showToast("Offline demo preview — not evaluated.");
}

function bindModuleEvents(page) {
  const prefix = page === "enrollment" ? "enroll" : "verify";
  const form = document.getElementById(page === "enrollment" ? "enrollmentForm" : "verificationForm");
  const demoPreviewButton = form.querySelector("[data-demo-preview]");
  if (demoPreviewButton) {
    demoPreviewButton.addEventListener("click", () => {
      const feedback = document.getElementById(page === "enrollment" ? "enrollFeedback" : "verifyFeedback");
      showDemoPreview(page, form, feedback);
    });
  }

  moduleView.querySelectorAll("[data-upload]").forEach((input) => {
    input.addEventListener("change", () => {
      const file = input.files && input.files[0];
      const label = moduleView.querySelector('[data-file-name="' + input.dataset.upload + '"]');
      if (!label) return;
      if (file) {
        const max = input.dataset.upload === "voice" ? 20 : 10;
        if (file.size > max * 1024 * 1024) {
          input.value = "";
          label.textContent = "File too large — max " + max + " MB";
          label.classList.add("file-invalid");
          return;
        }
        label.textContent = file.name;
        label.classList.remove("file-invalid");
      } else {
        label.textContent = "Choose a file";
        label.classList.remove("file-invalid");
      }
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const feedback = document.getElementById(page === "enrollment" ? "enrollFeedback" : "verifyFeedback");
    const uploadError = document.getElementById(page === "enrollment" ? "enrollUploadError" : "verifyUploadError");
    const selected = selectedModalities(prefix);
    const files = selectedFiles(prefix, selected);
    moduleView.querySelectorAll(".field-error[data-error]").forEach((node) => { node.textContent = ""; });
    feedback.hidden = true;
    feedback.className = "form-feedback";

    let valid = form.reportValidity();
    if (!selected.length) {
      uploadError.textContent = "Select at least one biometric modality.";
      valid = false;
    } else if (!validateFiles(files, uploadError)) {
      valid = false;
    }
    if (page === "enrollment") {
      const ref = form.elements.identityRef;
      if (ref.value.trim() && !/^[A-Za-z0-9_-]{3,32}$/.test(ref.value.trim())) {
        moduleView.querySelector('[data-error="identityRef"]').textContent = "Use 3–32 letters, numbers, hyphens, or underscores.";
        valid = false;
      }
    }
    if (!valid) {
      feedback.hidden = false;
      feedback.classList.add("feedback-error");
      feedback.textContent = "Please review the highlighted fields before continuing.";
      return;
    }

    const submit = form.querySelector('button[type="submit"]');
    const original = submit.innerHTML;
    if (!API_BASE_URL) {
      feedback.hidden = false;
      feedback.className = "form-feedback feedback-error";
      feedback.textContent = "The BioGuard API is not configured. You can use Offline demo preview without uploading files, or configure a hosted HTTPS API URL.";
      return;
    }
    if (!apiBaseIsSecure()) {
      feedback.hidden = false;
      feedback.className = "form-feedback feedback-error";
      feedback.textContent = "A remote API must use HTTPS. No biometric data was sent.";
      return;
    }
    if (!operatorApiToken) {
      operatorApiToken = window.prompt("Enter the BioGuard API operator token. It stays in this page's memory only.") || "";
    }
    if (!operatorApiToken) {
      feedback.hidden = false;
      feedback.className = "form-feedback feedback-error";
      feedback.textContent = "API token is required. No biometric data was sent.";
      return;
    }

    submit.disabled = true;
    submit.innerHTML = '<span class="button-spinner"></span> Processing…';
    feedback.hidden = false;
    feedback.className = "form-feedback feedback-info";
    feedback.textContent = "Sending the selected samples to the configured BioGuard API over the protected connection…";

    try {
      const payload = new FormData();
      payload.append("modalities", JSON.stringify(selected));
      selected.forEach((kind) => {
        if (files[kind]) payload.append(kind + "_sample", files[kind], files[kind].name);
      });

      let endpoint;
      if (page === "enrollment") {
        endpoint = "/api/v1/identities/enroll";
        payload.append("profile", JSON.stringify({
          full_name: form.elements.fullName.value.trim(),
          identity_ref: form.elements.identityRef.value.trim(),
          email: form.elements.email.value.trim() || null
        }));
        payload.append("consent", JSON.stringify({
          granted: true,
          policy_version: "bioguard-coursework-prototype-v1"
        }));
      } else {
        endpoint = "/api/v1/verification/multimodal";
        payload.append("claimed_identity_ref", form.elements.identityRef.value.trim());
        payload.append("authorization", JSON.stringify({
          authorized: true,
          purpose: "Authorized coursework prototype verification"
        }));
      }

      const response = await fetch(API_BASE_URL + endpoint, {
        method: "POST",
        headers: { Authorization: "Bearer " + operatorApiToken },
        body: payload
      });
      const body = await response.json().catch(() => ({}));
      if (response.status === 401) {
        operatorApiToken = "";
        throw new Error("Operator token was rejected. Submit again to enter a valid token.");
      }
      if (!response.ok) {
        const detail = body.detail || body.error || {};
        throw new Error(detail.message || detail.code || "API request failed with HTTP " + response.status);
      }

      if (page === "enrollment") {
        feedback.className = "form-feedback feedback-success";
        feedback.textContent = "Identity enrolled. Reference: " + body.identity.identity_ref +
          ". Stored modalities: " + body.registered_modalities.join(", ") +
          ". " + (body.notice || "");
        showToast("API enrollment completed.");
      } else {
        const result = document.getElementById("verificationResult");
        result.hidden = false;
        const modelOutcome = body.outcome === "match" ? "MODEL MATCH (EXPERIMENTAL)" :
          body.outcome === "no_match" ? "MODEL NO MATCH (EXPERIMENTAL)" : "NOT EVALUATED";
        const hasModelResult = body.outcome === "match" || body.outcome === "no_match";
        result.innerHTML = '<div class="result-header"><div><span class="demo-chip"><i></i> EXPERIMENTAL API</span><h3>' +
          (hasModelResult ? "Experimental model result" : "Verification request processed") +
          '</h3><p>Reference: ' + escapeHtml(form.elements.identityRef.value.trim()) +
          '</p></div><span class="result-status">' + modelOutcome + '</span></div>' +
          '<div class="result-warning"><strong>No access decision was made.</strong><span>' +
          escapeHtml(body.message || "A validated model and approved operating policy are required before access decisions.") +
          '</span></div><pre class="api-diagnostic">' + escapeHtml(JSON.stringify(body.diagnostic_similarity || {}, null, 2)) +
          '</pre><div class="result-meta"><span>Selected signals <strong>' + selected.map(escapeHtml).join(" · ") +
          '</strong></span><span>Policy <strong>' + escapeHtml(body.policy_decision || "pending") + '</strong></span></div>';
        feedback.className = "form-feedback feedback-info";
        feedback.textContent = hasModelResult ?
          "A trained model produced an experimental comparison only. The policy remains pending; no access is granted or denied." :
          "The API processed the samples, but no calibrated model result is available.";
        result.scrollIntoView({ behavior: "smooth", block: "nearest" });
        showToast(hasModelResult ? "Experimental model comparison completed." : "Verification processed — not evaluated.");
      }
    } catch (error) {
      feedback.className = "form-feedback feedback-error";
      feedback.textContent = "API request failed: " + error.message + ". No demo success was substituted.";
    } finally {
      submit.disabled = false;
      submit.innerHTML = original;
    }
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

navItems.forEach((item) => item.addEventListener("click", () => setPage(item.dataset.page)));

document.getElementById("newVerification").addEventListener("click", () => setPage("verification"));
document.getElementById("notificationButton").addEventListener("click", () => showToast("Live notifications are not implemented yet."));
document.getElementById("helpButton").addEventListener("click", () => showToast("BioGuard X help center — documentation coming soon."));
document.getElementById("mobileMenu").addEventListener("click", () => document.getElementById("sidebar").classList.toggle("open"));

const today = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(new Date());
document.getElementById("todayLabel").textContent = today;
pageTitle.textContent = greeting();
bindOverviewEvents();
refreshApiHealth();