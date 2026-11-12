const navItems = document.querySelectorAll(".nav-item[data-page]");
const pageTitle = document.getElementById("pageTitle");
const pageSubtitle = document.getElementById("pageSubtitle");
const breadcrumbCurrent = document.getElementById("breadcrumbCurrent");
const toast = document.getElementById("toast");
const overviewView = document.getElementById("overviewView");
const moduleView = document.getElementById("moduleView");
const overviewMarkup = overviewView.innerHTML;

const configuredApiBase = String(window.BIOGUARD_API_BASE || "").trim();
const API_BASE_URL = configuredApiBase.replace(/\/+$/, "");
const API_IS_CONFIGURED = Boolean(API_BASE_URL);
const API_CONFIG_ERROR = getApiConfigError(API_BASE_URL);
const API_CAN_SEND = API_IS_CONFIGURED && !API_CONFIG_ERROR;
const API_TIMEOUT_MS = 45000;
let operatorApiToken = "";

const pageCopy = {
  overview: ["Overview", "Here's what's happening across your biometric security environment."],
  verification: ["Biometric verification", "Run experimental identity checks across face, voice, and fingerprint modalities."],
  enrollment: ["Identity enrollment", "Create an identity record and register experimental biometric feature templates."],
  identities: ["Identity directory", "Manage enrolled identities, profile status, and biometric records."],
  analytics: ["Security analytics", "Explore verification performance, trends, and model evaluation metrics."],
  intelligence: ["Threat intelligence", "Investigate risk signals, suspicious behavior, and analyst findings."],
  automation: ["Automation center", "Monitor security workflows, approvals, and automated responses."],
  audit: ["Audit trail", "Review a traceable history of authentication and administrative events."],
  access: ["Access control", "Manage roles, permissions, and privileged access policies."],
  settings: ["Platform settings", "Configure security preferences and environment options."]
};

function getApiConfigError(baseUrl) {
  if (!baseUrl) return "";
  try {
    const parsed = new URL(baseUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) return "BIOGUARD_API_BASE must use HTTP or HTTPS.";
    if (parsed.pathname !== "/" || parsed.search || parsed.hash || parsed.username || parsed.password) {
      return "BIOGUARD_API_BASE must contain only the API origin, without a path or credentials.";
    }
    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
    if (!loopback && parsed.protocol !== "https:") {
      return "Remote BioGuard API URLs must use HTTPS.";
    }
    if (window.location.protocol === "https:" && parsed.protocol !== "https:" && !loopback) {
      return "The deployed HTTPS frontend requires an HTTPS BioGuard API URL.";
    }
    return "";
  } catch (_) {
    return "BIOGUARD_API_BASE must be a valid absolute API origin URL.";
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
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  overviewView.hidden = true;
  moduleView.hidden = false;
  if (page === "enrollment" || page === "verification") {
    moduleView.innerHTML = window.BioGuardModules[page]({ apiConfigured: API_CAN_SEND });
    bindModuleEvents(page);
  } else {
    moduleView.innerHTML = '<section class="panel coming-soon"><span class="coming-icon">⌁</span><h2>' +
      copy[0] + '</h2><p>This workspace is planned for a later BioGuard X milestone. No live backend data is shown here.</p>' +
      '<span class="demo-chip"><i></i> PREVIEW</span></section>';
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function refreshApiHealth() {
  const label = document.querySelector(".system-status small");
  const pulse = document.querySelector(".system-status .status-pulse");
  if (!label || !pulse) return;

  if (!API_IS_CONFIGURED) {
    label.textContent = "Demo mode · API URL not configured";
    pulse.style.backgroundColor = "#e6a34a";
    return;
  }
  if (API_CONFIG_ERROR) {
    label.textContent = "API configuration error";
    pulse.style.backgroundColor = "#e06464";
    return;
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(API_BASE_URL + "/api/v1/health", {
      method: "GET",
      cache: "no-store",
      credentials: "omit",
      signal: controller.signal
    });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const health = await response.json();
    if (health.status === "ready") {
      label.textContent = "API ready · " + String(health.verification_mode || "model status unavailable").replace(/_/g, " ");
      pulse.style.backgroundColor = "#29d5c2";
    } else if (health.status === "degraded") {
      label.textContent = "API connected · database unavailable";
      pulse.style.backgroundColor = "#e06464";
    } else {
      label.textContent = "API connected · configuration required";
      pulse.style.backgroundColor = "#e6a34a";
    }
  } catch (_) {
    label.textContent = "API unreachable · check backend and CORS";
    pulse.style.backgroundColor = "#e06464";
  } finally {
    window.clearTimeout(timeout);
  }
}

function greeting() {
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
  const extensions = {
    face: [".png", ".jpg", ".jpeg"],
    voice: [".wav", ".flac", ".ogg"],
    fingerprint: [".png", ".jpg", ".jpeg"]
  };
  const missing = Object.keys(files).filter((kind) => !files[kind]);
  const empty = Object.keys(files).filter((kind) => files[kind] && files[kind].size === 0);
  const oversized = Object.keys(files).filter((kind) => files[kind] && files[kind].size > limits[kind] * 1024 * 1024);
  const totalBytes = Object.values(files).reduce((sum, file) => sum + (file ? file.size : 0), 0);
  const maxRequestBytes = Number(window.BIOGUARD_API_MAX_REQUEST_BYTES || 0);
  const totalTooLarge = !window.BioGuardApiContract.isWithinRequestLimit(totalBytes, maxRequestBytes);
  const wrongType = Object.keys(files).filter((kind) => {
    const file = files[kind];
    if (!file) return false;
    const mime = String(file.type || "").toLowerCase();
    const extension = "." + String(file.name || "").split(".").pop().toLowerCase();
    const extensionValid = extensions[kind].includes(extension);
    const mimeCompatible = !mime || (kind === "voice" ? mime.startsWith("audio/") : mime.startsWith("image/"));
    return !extensionValid || !mimeCompatible;
  });

  if (missing.length || empty.length || oversized.length || wrongType.length || totalTooLarge) {
    const parts = [];
    if (missing.length) parts.push("Add a sample for: " + missing.join(", ") + ".");
    if (empty.length) parts.push("The selected sample is empty: " + empty.join(", ") + ".");
    if (oversized.length) parts.push("File exceeds the per-modality size limit: " + oversized.join(", ") + ".");
    if (totalTooLarge) parts.push("Combined sample files exceed the Vercel request limit. Keep the selected files below 3.88 MiB total.");
    if (wrongType.length) parts.push("Unsupported file type for: " + wrongType.join(", ") + ".");
    errorElement.textContent = parts.join(" ");
    return false;
  }
  errorElement.textContent = "";
  return true;
}

function setFeedback(element, state, message) {
  element.hidden = false;
  element.className = "form-feedback feedback-" + state;
  element.textContent = message;
}

function getApiErrorMessage(body, statusCode) {
  const detail = body && (body.detail || body.error);
  if (Array.isArray(detail)) {
    return detail.map((item) => item && (item.msg || item.message) || "Invalid request").join("; ");
  }
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object") {
    return detail.message || detail.code || "The API rejected the request.";
  }
  return (body && body.message) || "API request failed with HTTP " + statusCode;
}

function validateFormFields(form, page) {
  let valid = true;
  const setError = (name, message) => {
    const node = moduleView.querySelector('[data-error="' + name + '"]');
    if (node) node.textContent = message;
  };

  const identityRef = form.elements.identityRef;
  if (!identityRef.checkValidity()) {
    setError("identityRef", identityRef.value
      ? "Use 3–32 letters, numbers, hyphens, or underscores."
      : "Enter an identity reference.");
    valid = false;
  }

  if (page === "enrollment") {
    const fullName = form.elements.fullName;
    if (!fullName.checkValidity() || fullName.value.length < 2) {
      setError("fullName", "Enter at least 2 non-space characters.");
      valid = false;
    }
    const email = form.elements.email;
    if (email.value && !email.checkValidity()) {
      setError("email", "Enter a valid email address or leave this field empty.");
      valid = false;
    }
    if (!form.elements.consent.checked) {
      setError("consent", "Confirm that the person has explicitly consented.");
      valid = false;
    }
  } else {
    const purpose = form.elements.purpose;
    if (!purpose.checkValidity()) {
      setError("purpose", purpose.value
        ? "Use a verification purpose between 3 and 200 characters."
        : "Enter a verification purpose.");
      valid = false;
    }
    if (!form.elements.authorization.checked) {
      setError("authorization", "Confirm that you are authorized to submit these samples.");
      valid = false;
    }
  }

  return valid;
}

function renderDemoResult(page, form, selected, previousRequestUnconfirmed) {
  const result = document.getElementById(page === "enrollment" ? "enrollResult" : "verificationResult");
  const reference = escapeHtml(form.elements.identityRef.value.trim());
  const signals = selected.map(escapeHtml).join(" · ");
  result.dataset.mode = "demo";

  if (page === "enrollment") {
    result.innerHTML =
      '<div class="result-header"><div><span class="demo-chip"><i></i> LOCAL DEMO PREVIEW</span><h3>' +
      (previousRequestUnconfirmed ? "Enrollment status unconfirmed" : "Enrollment preview prepared") +
      '</h3><p>Reference entered: ' + reference + '</p></div><span class="result-status status-demo">' +
      (previousRequestUnconfirmed ? "REQUEST UNCONFIRMED" : "NO IDENTITY CREATED") + '</span></div>' +
      '<div class="result-warning"><strong>' +
      (previousRequestUnconfirmed ? "The API did not return a confirmed response." : "Demo only — no enrollment occurred.") +
      '</strong><span>' +
      (previousRequestUnconfirmed
        ? "This offline preview sends no additional data. The previous request may or may not have reached the API; check the backend identity and audit records before retrying."
        : "No biometric files were captured, uploaded, processed, or stored. No identity record or encrypted template was created.") +
      '</span></div>' +
      '<div class="result-meta"><span>Selected modalities<strong>' + signals + '</strong></span><span>Offline preview<strong>Not processed</strong></span></div>';
    setFeedback(document.getElementById("enrollFeedback"), "info",
      previousRequestUnconfirmed
        ? "Offline preview only. The earlier API request has an unknown outcome; verify backend records before retrying."
        : "Demo preview complete. No biometric data was sent and no identity was created.");
  } else {
    result.innerHTML =
      '<div class="result-header"><div><span class="demo-chip"><i></i> LOCAL DEMO PREVIEW</span><h3>Verification preview prepared</h3>' +
      '<p>Claimed reference: ' + reference + '</p></div><span class="result-status status-not-evaluated">NOT EVALUATED</span></div>' +
      '<div class="result-warning"><strong>' +
      (previousRequestUnconfirmed ? "The API did not return a confirmed response." : "No biometric comparison or risk scoring was performed.") +
      '</strong><span>' +
      (previousRequestUnconfirmed
        ? "This offline preview performs no additional comparison. The previous request may or may not have reached the API. No access decision is made here."
        : "This is a workflow preview only. No samples were uploaded or compared, and no access decision was made.") +
      '</span></div>' +
      '<div class="result-meta"><span>Selected modalities<strong>' + signals + '</strong></span><span>Policy<strong>Pending / not evaluated</strong></span></div>';
    setFeedback(document.getElementById("verifyFeedback"), "info",
      previousRequestUnconfirmed
        ? "Offline preview only. The earlier API request outcome is unknown; no access decision was made by this preview."
        : "Demo preview complete. No biometric samples were compared and no access decision was made.");
  }
  result.hidden = false;
}

function renderEnrollmentApiResult(body, form, selected) {
  const result = document.getElementById("enrollResult");
  const identity = body && body.identity ? body.identity : {};
  const reference = escapeHtml(identity.identity_ref || form.elements.identityRef.value.trim());
  const modalities = Array.isArray(body && body.registered_modalities) ? body.registered_modalities : selected;
  const notice = escapeHtml(body && body.notice || "The API stored experimental handcrafted features; this is not a validated biometric identity model.");
  result.dataset.mode = "api";
  result.innerHTML =
    '<div class="result-header"><div><span class="demo-chip"><i></i> EXPERIMENTAL API</span><h3>Enrollment record created</h3>' +
    '<p>Identity reference: ' + reference + '</p></div><span class="result-status status-experimental">STORED · EXPERIMENTAL</span></div>' +
    '<div class="result-warning"><strong>Experimental feature templates only.</strong><span>' + notice + '</span></div>' +
    '<div class="result-meta"><span>Registered modalities<strong>' + modalities.map(escapeHtml).join(" · ") + '</strong></span>' +
    '<span>Audit event<strong>' + escapeHtml(body && body.audit_event_id || "Recorded by API") + '</strong></span></div>';
  result.hidden = false;
  setFeedback(document.getElementById("enrollFeedback"), "success",
    "The experimental API created the enrollment record for " + reference + ". This does not establish a validated biometric identity.");
  showToast("Experimental enrollment API completed.");
}

function renderVerificationApiResult(body, selected, reference) {
  const result = document.getElementById("verificationResult");
  const outcome = body && body.outcome;
  const isMatch = outcome === "match";
  const isNoMatch = outcome === "no_match";
  const statusText = isMatch ? "EXPERIMENTAL MATCH" : isNoMatch ? "EXPERIMENTAL NO MATCH" : "NOT EVALUATED";
  const statusClass = isMatch ? "status-match" : isNoMatch ? "status-no-match" : "status-not-evaluated";
  const diagnostic = escapeHtml(JSON.stringify(body && body.diagnostic_similarity || {}, null, 2));
  const message = escapeHtml(body && body.message ||
    "A compatible calibrated model is required for comparison. Policy remains pending.");
  result.dataset.mode = "api";
  result.innerHTML =
    '<div class="result-header"><div><span class="demo-chip"><i></i> EXPERIMENTAL API</span><h3>Verification request processed</h3>' +
    '<p>Claimed reference: ' + escapeHtml(reference) + '</p></div><span class="result-status ' + statusClass + '">' + statusText + '</span></div>' +
    '<div class="result-warning"><strong>No access decision was made.</strong><span>' + message + '</span></div>' +
    '<details class="diagnostic-details"><summary>Diagnostic model output · not a calibrated risk score</summary><pre class="api-diagnostic">' + diagnostic + '</pre></details>' +
    '<div class="result-meta"><span>Selected modalities<strong>' + selected.map(escapeHtml).join(" · ") + '</strong></span>' +
    '<span>Policy decision<strong>' + escapeHtml(body && body.policy_decision || "pending") + '</strong></span>' +
    '<span>Reason code<strong>' + escapeHtml(body && body.reason_code || "Not supplied") + '</strong></span></div>';
  result.hidden = false;
  setFeedback(document.getElementById("verifyFeedback"), "info",
    isMatch || isNoMatch
      ? "A trained model returned an experimental comparison only. Policy remains pending; this result cannot grant or deny access."
      : "The API processed the request, but no compatible model result was available. No access decision was made.");
  showToast(isMatch || isNoMatch ? "Experimental comparison completed." : "Verification processed · not evaluated.");
}

function bindModuleEvents(page) {
  const prefix = page === "enrollment" ? "enroll" : "verify";
  const form = document.getElementById(page === "enrollment" ? "enrollmentForm" : "verificationForm");
  const feedback = document.getElementById(page === "enrollment" ? "enrollFeedback" : "verifyFeedback");
  const result = document.getElementById(page === "enrollment" ? "enrollResult" : "verificationResult");
  const uploadError = document.getElementById(page === "enrollment" ? "enrollUploadError" : "verifyUploadError");
  const modalityError = document.getElementById(prefix + "ModalityError");

  if (API_CAN_SEND) {
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
            uploadError.textContent = "The selected " + input.dataset.upload + " file exceeds the " + max + " MB limit.";
            return;
          }
          label.textContent = file.name;
          label.classList.remove("file-invalid");
        } else {
          label.textContent = "Choose a file";
          label.classList.remove("file-invalid");
        }
        uploadError.textContent = "";
      });
    });
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    moduleView.querySelectorAll(".field-error[data-error]").forEach((node) => { node.textContent = ""; });
    uploadError.textContent = "";
    modalityError.textContent = "";
    feedback.hidden = true;
    feedback.className = "form-feedback";
    result.hidden = true;
    result.innerHTML = "";

    if (form.elements.identityRef) form.elements.identityRef.value = form.elements.identityRef.value.trim();
    if (page === "enrollment") form.elements.fullName.value = form.elements.fullName.value.trim();
    if (page === "verification") form.elements.purpose.value = form.elements.purpose.value.trim();
    if (page === "enrollment" && form.elements.email.value) form.elements.email.value = form.elements.email.value.trim();

    const selected = selectedModalities(prefix);
    let valid = validateFormFields(form, page);
    if (!valid) form.reportValidity();

    if (!selected.length) {
      modalityError.textContent = "Select at least one biometric modality.";
      valid = false;
    }

    if (API_CAN_SEND) {
      const files = selectedFiles(prefix, selected);
      if (selected.length && !validateFiles(files, uploadError)) valid = false;
    }

    if (!valid) {
      setFeedback(feedback, "error", "Please review the highlighted fields before continuing.");
      return;
    }

    let token = "";
    if (API_CAN_SEND) {
      if (!operatorApiToken) {
        operatorApiToken = (window.prompt("Enter the BioGuard API operator token. It stays in this page's memory only.") || "").trim();
      }
      if (!operatorApiToken) {
        setFeedback(feedback, "error", "API token is required. No biometric data was sent.");
        return;
      }
      token = operatorApiToken;
    }

    const submit = form.querySelector('button[type="submit"]');
    const originalButton = submit.innerHTML;
    submit.disabled = true;
    submit.innerHTML = '<span class="button-spinner"></span> ' + (API_CAN_SEND ? "Processing…" : "Preparing preview…");
    setFeedback(feedback, "info", API_CAN_SEND
      ? "Sending selected samples to the configured experimental BioGuard API…"
      : "Preparing a local workflow preview. No biometric samples will be sent.");

    try {
      if (!API_CAN_SEND) {
        await new Promise((resolve) => window.setTimeout(resolve, 350));
        renderDemoResult(page, form, selected);
        return;
      }

      const files = selectedFiles(prefix, selected);
      const payload = new FormData();
      payload.append("modalities", JSON.stringify(selected));
      selected.forEach((kind) => {
        if (files[kind]) payload.append(kind + "_sample", files[kind], files[kind].name);
      });

      let endpoint;
      if (page === "enrollment") {
        endpoint = "/api/v1/identities/enroll";
        payload.append("profile", JSON.stringify({
          full_name: form.elements.fullName.value,
          identity_ref: form.elements.identityRef.value,
          email: form.elements.email.value || null
        }));
        payload.append("consent", JSON.stringify({
          granted: true,
          policy_version: "bioguard-coursework-prototype-v1"
        }));
      } else {
        endpoint = "/api/v1/verification/multimodal";
        payload.append("claimed_identity_ref", form.elements.identityRef.value);
        payload.append("authorization", JSON.stringify({
          authorized: true,
          purpose: form.elements.purpose.value
        }));
      }

      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);
      try {
        const response = await fetch(API_BASE_URL + endpoint, {
          method: "POST",
          headers: { Authorization: "Bearer " + token },
          body: payload,
          cache: "no-store",
          credentials: "omit",
          signal: controller.signal
        });
        const body = await response.json().catch(() => null);
        if (!response.ok) {
          if (response.status === 401) operatorApiToken = "";
          const apiError = new Error(getApiErrorMessage(body, response.status));
          apiError.status = response.status;
          apiError.code = body && body.detail && typeof body.detail === "object" ? body.detail.code || "" : "";
          throw apiError;
        }

        if (!window.BioGuardApiContract) {
          const contractError = new Error("The frontend API response validator did not load. The request outcome is unconfirmed.");
          contractError.code = "INVALID_API_RESPONSE";
          throw contractError;
        }
        if (page === "enrollment") {
          window.BioGuardApiContract.assertEnrollmentResponse(body, form.elements.identityRef.value, selected);
          renderEnrollmentApiResult(body, form, selected);
        } else {
          window.BioGuardApiContract.assertVerificationResponse(body);
          renderVerificationApiResult(body, selected, form.elements.identityRef.value);
        }
      } finally {
        window.clearTimeout(timeout);
      }
    } catch (error) {
      const unconfirmedResponse = error && error.code === "INVALID_API_RESPONSE";
      const message = error && error.name === "AbortError"
        ? "The API request timed out. Its outcome is unknown; check backend records before retrying."
        : unconfirmedResponse
          ? (error.message || "The API returned an incomplete response. Check backend records before retrying.") + " No demo success was substituted."
          : "API request failed: " + (error && error.message || "Unknown error") + ". No demo success was substituted.";
      setFeedback(feedback, "error", message);
      const backendUnavailable = error && (
        error.name === "AbortError" || error instanceof TypeError || unconfirmedResponse ||
        (error.status === 404 && !error.code) || error.status >= 500
      );
      if (API_CAN_SEND && backendUnavailable) {
        const demoButton = document.createElement("button");
        demoButton.type = "button";
        demoButton.className = "button button-demo";
        demoButton.textContent = "Continue with offline demo preview";
        demoButton.addEventListener("click", () => renderDemoResult(page, form, selected, true));
        feedback.appendChild(demoButton);
      }
    } finally {
      submit.disabled = false;
      submit.innerHTML = originalButton;
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