const navItems = document.querySelectorAll(".nav-item[data-page]");
const pageTitle = document.getElementById("pageTitle");
const pageSubtitle = document.getElementById("pageSubtitle");
const breadcrumbCurrent = document.getElementById("breadcrumbCurrent");
const toast = document.getElementById("toast");

const pageCopy = {
  overview: ["Good evening, Admin ✳", "Here's what's happening across your biometric security environment."],
  verification: ["Biometric verification", "Run and review identity checks across face, voice, and fingerprint modalities."],
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

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    navItems.forEach((nav) => nav.classList.remove("active"));
    item.classList.add("active");
    const page = pageCopy[item.dataset.page] || pageCopy.overview;
    pageTitle.textContent = page[0];
    pageSubtitle.textContent = page[1];
    breadcrumbCurrent.textContent = page[0].replace(" ✳", "");
    document.getElementById("sidebar").classList.remove("open");

    if (item.dataset.page !== "overview") {
      showToast("This section is part of the next frontend milestone.");
    }
  });
});

document.getElementById("eventSearch").addEventListener("input", (event) => {
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

document.getElementById("dismissNotice").addEventListener("click", () => {
  document.querySelector(".notice-banner").remove();
});

document.getElementById("newVerification").addEventListener("click", () => {
  const verificationNav = document.querySelector('[data-page="verification"]');
  verificationNav.click();
});

document.getElementById("viewAllEvents").addEventListener("click", () => {
  document.querySelector('[data-page="audit"]').click();
});

document.getElementById("allAlerts").addEventListener("click", () => {
  document.querySelector('[data-page="intelligence"]').click();
});

document.getElementById("filterButton").addEventListener("click", () => {
  showToast("Event filters will be connected to the audit API.");
});

document.getElementById("periodSelect").addEventListener("click", () => {
  showToast("Date-range selection is coming with analytics integration.");
});

document.getElementById("notificationButton").addEventListener("click", () => {
  showToast("You have 3 security items requiring attention.");
});

document.getElementById("helpButton").addEventListener("click", () => {
  showToast("BioGuard X help center — documentation coming soon.");
});

document.getElementById("mobileMenu").addEventListener("click", () => {
  document.getElementById("sidebar").classList.toggle("open");
});

const today = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric"
}).format(new Date());
document.getElementById("todayLabel").textContent = today;

const hour = new Date().getHours();
const greeting = hour < 12 ? "Good morning, Admin ✳" : hour < 18 ? "Good afternoon, Admin ✳" : "Good evening, Admin ✳";
pageTitle.textContent = greeting;
