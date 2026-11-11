const navItems = document.querySelectorAll(".nav-item[data-page]");
const pageTitle = document.getElementById("pageTitle");
const pageSubtitle = document.getElementById("pageSubtitle");
const breadcrumbCurrent = document.getElementById("breadcrumbCurrent");
const toast = document.getElementById("toast");
const overviewView = document.getElementById("overviewView");
const moduleView = document.getElementById("moduleView");
const overviewMarkup = overviewView.innerHTML;
const API_BASE_URL = window.BIOGUARD_API_BASE || "http://127.0.0.1:8000";
let operatorApiToken = "";

const pageCopy = {
  overview: ["Overview", "Here's what's happening across your biometric security environment."],
  verification: ["Biometric verification", "Run identity checks across face, voice, and fingerprint modalities."],
  enrollment: ["Identity enrollment", "Create a trusted identity profile and register biometric samples."],
  identities: ["Identity directory", "Manage enrolled identities, profile status, and biometric records."],
  analytics: ["Security analytics", "Explore verification performance, trends, and model evaluation metrics."],
  intelligence: ["Threat intelligence", "Investigate risk signals, suspicious behavior, and analyst findings."],
  automation: ["Automation center", "Monitor security workflows, approvals, and automated responses."],
  audit: ["Audit trail", "Review a traceable history of authentication and administrative events."],
  access: ["Access control", "Manage roles, permissions, and privileged access policies."],
  settings: ["Platform settings", "Configure security preferences and environment options."]
};

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

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning, Admin ✳" : hour < 18 ? "Good afternoon, Admin ✳" : "Good evening, Admin ✳";
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
    const input = document.getElementById(prefix + "-" + kind);
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

function bindModuleEvents(page) {
  const prefix = page === "enrollment" ? "enroll" : "verify";
  const form = document.getElementById(page === "enrollment" ? "enrollmentForm" : "verificationForm");

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
    if (!operatorApiToken) {
      operatorApiToken = window.prompt("Enter the local BioGuard API operator token. It stays in this page's memory only.") || "";
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
    feedback.textContent = "Sending the selected samples to the local BioGuard API over your configured connection…";

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
        result.innerHTML = '<div class="result-header"><div><span class="demo-chip"><i></i> EXPERIMENTAL API</span><h3>Verification request processed</h3><p>Reference: ' +
          escapeHtml(form.elements.identityRef.value.trim()) + '</p></div><span class="result-status">NOT EVALUATED</span></div>' +
          '<div class="result-warning"><strong>No access decision was made.</strong><span>' +
          escapeHtml(body.message || "Threshold calibration is required before verification decisions can be enabled.") +
          '</span></div><pre class="api-diagnostic">' + escapeHtml(JSON.stringify(body.diagnostic_similarity || {}, null, 2)) +
          '</pre><div class="result-meta"><span>Selected signals <strong>' + selected.map(escapeHtml).join(" · ") +
          '</strong></span><span>Policy <strong>' + escapeHtml(body.policy_decision || "pending") + '</strong></span></div>';
        feedback.className = "form-feedback feedback-info";
        feedback.textContent = "The API processed the samples, but its uncalibrated baseline is not allowed to verify identity or grant access.";
        result.scrollIntoView({ behavior: "smooth", block: "nearest" });
        showToast("Verification processed — not evaluated.");
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
document.getElementById("notificationButton").addEventListener("click", () => showToast("You have 3 illustrative security items requiring attention."));
document.getElementById("helpButton").addEventListener("click", () => showToast("BioGuard X help center — documentation coming soon."));
document.getElementById("mobileMenu").addEventListener("click", () => document.getElementById("sidebar").classList.toggle("open"));

const today = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(new Date());
document.getElementById("todayLabel").textContent = today;
pageTitle.textContent = greeting();
bindOverviewEvents();