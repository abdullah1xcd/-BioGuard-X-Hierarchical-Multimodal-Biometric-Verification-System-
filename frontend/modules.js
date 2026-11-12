(() => {
  const MODALITIES = [
    { id: "face", label: "Face", detail: "HOG + LBP feature baseline", icon: "◉", checked: true, optional: false },
    { id: "voice", label: "Voice", detail: "MFCC + ZCR + RMS baseline", icon: "⌁", checked: false, optional: false },
    { id: "fingerprint", label: "Fingerprint", detail: "Gabor texture baseline", icon: "▦", checked: false, optional: true }
  ];

  function modalityCards(prefix) {
    return MODALITIES.map(function (item) {
      return '<label class="modality-card" for="' + prefix + '-' + item.id + '">' +
        '<input id="' + prefix + '-' + item.id + '" name="' + prefix + '-modality" type="checkbox" value="' + item.id + '"' +
        (item.checked ? ' checked' : '') + '>' +
        '<span class="modality-check" aria-hidden="true"></span>' +
        '<span class="modality-icon" aria-hidden="true">' + item.icon + '</span>' +
        '<span class="modality-copy"><strong>' + item.label + '</strong><small>' + item.detail + '</small></span>' +
        (item.optional ? '<span class="optional-tag">OPTIONAL</span>' : '') +
        '</label>';
    }).join("");
  }

  function upload(prefix, item) {
    const inputId = prefix + "-" + item.id + "-file";
    return '<label class="upload-field" for="' + inputId + '">' +
      '<input id="' + inputId + '" type="file" accept="' + item.accept + '" data-upload="' + item.id + '" aria-label="' + item.label + ' sample file">' +
      '<span class="upload-icon" aria-hidden="true">＋</span>' +
      '<span class="upload-copy"><strong>' + item.label + ' sample</strong>' +
      '<small>' + item.hint + '</small><em data-file-name="' + item.id + '">Choose a file</em></span>' +
      '</label>';
  }

  function sampleSection(prefix, apiConfigured) {
    const error = '<small class="field-error" id="' + prefix + 'UploadError" role="alert"></small>';
    if (!apiConfigured) {
      return '<div class="demo-upload-note" role="note">' +
        '<strong>Sample uploads are disabled in demo mode</strong>' +
        '<p>No biometric files are selected, captured, uploaded, stored, or compared in this preview. Configure an API URL to enable the protected upload workflow.</p>' +
        '</div>' + error;
    }
    const items = [
      { id: "face", label: "Face", accept: "image/png,image/jpeg,.png,.jpg,.jpeg", hint: "PNG or JPG · max 10 MB" },
      { id: "voice", label: "Voice", accept: "audio/wav,audio/flac,audio/ogg,.wav,.flac,.ogg", hint: "WAV, FLAC or OGG · max 20 MB" },
      { id: "fingerprint", label: "Fingerprint", accept: "image/png,image/jpeg,.png,.jpg,.jpeg", hint: "PNG or JPG · max 10 MB" }
    ];
    return '<div class="upload-heading"><strong>Biometric sample files</strong>' +
      '<span>Only files for selected modalities are sent to the configured experimental API.</span></div>' +
      '<div class="upload-grid">' + items.map(function (item) { return upload(prefix, item); }).join("") + '</div>' + error;
  }

  function modeBanner(apiConfigured) {
    if (apiConfigured) {
      return '<div class="module-mode-banner module-mode-api" role="note"><span class="module-mode-icon">↗</span>' +
        '<div><strong>Configured API mode</strong><p>Submissions use the configured API URL and require operator authentication. A configured URL does not guarantee that the service is reachable.</p></div></div>';
    }
    return '<div class="module-mode-banner module-mode-demo" role="note"><span class="module-mode-icon">◇</span>' +
      '<div><strong>Demo-only preview</strong><p>No API URL is configured. This preview never sends biometric samples and does not create identities, compare biometrics, calculate risk, or make access decisions.</p></div></div>';
  }

  function heading(kicker, title, subtitle, apiConfigured) {
    return '<div class="module-heading"><div><div class="eyebrow"><span class="eyebrow-line"></span> ' + kicker +
      '</div><h2>' + title + '</h2><p>' + subtitle + '</p></div>' +
      '<span class="demo-chip"><i></i> ' + (apiConfigured ? 'API URL SET' : 'DEMO ONLY') + '</span></div>' +
      modeBanner(apiConfigured);
  }

  function section(number, title, subtitle, body) {
    return '<div class="form-section"><div class="form-section-title"><span class="step-number">' + number +
      '</span><div><h3>' + title + '</h3><p>' + subtitle + '</p></div></div>' + body + '</div>';
  }

  function enrollment(options) {
    const apiConfigured = Boolean(options && options.apiConfigured);
    return heading("IDENTITY MANAGEMENT", "Register a new identity",
      "Create a profile and choose the biometric modalities for this enrollment.", apiConfigured) +
      '<div class="module-layout"><form id="enrollmentForm" class="panel module-form" novalidate>' +
      section("01", "Identity details", "Enter the person’s basic profile information.",
        '<div class="form-grid">' +
        '<label class="field"><span>Full name <b>*</b></span><input name="fullName" type="text" placeholder="e.g. Omar Mahmoud" autocomplete="name" required minlength="2" maxlength="100"><small class="field-error" data-error="fullName" role="alert"></small></label>' +
        '<label class="field"><span>Identity reference <b>*</b></span><input name="identityRef" type="text" placeholder="e.g. BG-00843" autocomplete="off" required pattern="[A-Za-z0-9_-]{3,32}" minlength="3" maxlength="32"><small class="field-hint">3–32 letters, numbers, hyphens, or underscores.</small><small class="field-error" data-error="identityRef" role="alert"></small></label>' +
        '<label class="field field-wide"><span>Email address <small>Optional</small></span><input name="email" type="email" placeholder="name@company.com" autocomplete="email" maxlength="254"><small class="field-error" data-error="email" role="alert"></small></label>' +
        '</div>') +
      '<div class="form-divider"></div>' +
      section("02", "Biometric modalities", "Select at least one modality. Fingerprint is optional.",
        '<div class="modality-grid" role="group" aria-label="Enrollment biometric modalities">' + modalityCards("enroll") + '</div>' +
        '<small class="field-error modality-error" id="enrollModalityError" role="alert"></small>' +
        sampleSection("enroll", apiConfigured)) +
      '<div class="form-divider"></div>' +
      section("03", "Consent & privacy", "Biometric collection requires explicit, informed consent.",
        '<div class="consent-box"><span class="consent-symbol" aria-hidden="true">ⓘ</span><p>Explain which biometric modalities are collected, the purpose, how templates are protected, the retention period, and how the person can request deletion. Use only samples collected with permission.</p></div>' +
        '<label class="consent-check"><input type="checkbox" name="consent" required><span>I confirm that the person has been informed and has explicitly agreed to this biometric enrollment. <b>*</b></span></label>' +
        '<small class="field-error" data-error="consent" role="alert"></small>') +
      '<div class="form-actions"><span class="required-note"><b>*</b> Required fields</span><button class="button button-primary" type="submit"><span>＋</span> ' +
      (apiConfigured ? 'Submit enrollment' : 'Preview enrollment') + '</button></div>' +
      '<div class="form-feedback" id="enrollFeedback" role="status" aria-live="polite" hidden></div></form>' +
      '<aside class="module-aside">' +
      '<article class="panel info-panel"><div class="aside-icon teal">⌁</div><h3>Enrollment checklist</h3><ul class="check-list"><li>Confirm the person’s identity</li><li>Obtain and document informed consent</li><li>Use only necessary modalities</li><li>Check sample quality and format</li><li>Protect templates and limit retention</li></ul></article>' +
      '<article class="panel info-panel"><div class="aside-icon blue">⌘</div><h3>What the API does</h3><p>In API mode, the experimental backend decodes samples, extracts handcrafted feature vectors, encrypts the vectors, and stores identity/template metadata. These features are not validated biometric identity embeddings.</p><div class="pipeline-mini"><span>Sample</span><i>→</i><span>Features</span><i>→</i><span>Encrypted template</span></div></article>' +
      '<div class="privacy-note"><strong>Research prototype only</strong><p>Do not use this system for real access control or high-stakes identity decisions. Follow your institution’s consent, privacy, and retention requirements.</p></div>' +
      '</aside></div><section class="panel result-panel" id="enrollResult" hidden></section>';
  }

  function verification(options) {
    const apiConfigured = Boolean(options && options.apiConfigured);
    return heading("AUTHENTICATION WORKSPACE", "Biometric verification",
      "Submit a claimed identity and selected signals for an experimental verification workflow.", apiConfigured) +
      '<div class="verification-layout"><form id="verificationForm" class="panel module-form" novalidate>' +
      section("01", "Claimed identity", "Identify the enrolled profile being checked.",
        '<label class="field"><span>Identity reference <b>*</b></span><input name="identityRef" type="text" placeholder="Enter a registered ID, e.g. BG-00843" autocomplete="off" required pattern="[A-Za-z0-9_-]{3,32}" minlength="3" maxlength="32"><small class="field-error" data-error="identityRef" role="alert"></small></label>') +
      '<div class="form-divider"></div>' +
      section("02", "Verification modalities", "Select the signals available for this check. Fingerprint is optional.",
        '<div class="modality-grid" role="group" aria-label="Verification biometric modalities">' + modalityCards("verify") + '</div>' +
        '<small class="field-error modality-error" id="verifyModalityError" role="alert"></small>' +
        sampleSection("verify", apiConfigured)) +
      '<div class="form-divider"></div>' +
      section("03", "Authorization & purpose", "Only submit samples you are permitted to process.",
        '<div class="consent-box"><span class="consent-symbol" aria-hidden="true">ⓘ</span><p>Verification requires a legitimate, documented purpose and authorization from the responsible operator. The checkbox is an acknowledgement, not a substitute for legal authority or server-side access control.</p></div>' +
        '<label class="field"><span>Verification purpose <b>*</b></span><input name="purpose" type="text" placeholder="e.g. Approved lab identity verification" required minlength="3" maxlength="200"><small class="field-hint">Describe why this verification is being performed (3–200 characters).</small><small class="field-error" data-error="purpose" role="alert"></small></label>' +
        '<label class="consent-check"><input type="checkbox" name="authorization" required><span>I am authorized to submit these samples for the stated purpose and have the required permission. <b>*</b></span></label>' +
        '<small class="field-error" data-error="authorization" role="alert"></small>') +
      '<div class="form-actions"><span class="required-note"><b>*</b> Required fields</span><button class="button button-primary" type="submit"><span>◎</span> ' +
      (apiConfigured ? 'Submit verification' : 'Preview verification') + '</button></div>' +
      '<div class="form-feedback" id="verifyFeedback" role="status" aria-live="polite" hidden></div></form>' +
      '<aside class="module-aside"><article class="panel info-panel"><div class="aside-icon teal">◎</div><h3>Experimental verification flow</h3><p>When a trained, compatible model bundle is configured, the API can compare the submitted features with encrypted enrollment templates. Model outputs remain experimental and policy stays pending.</p>' +
      '<div class="pipeline-steps"><div><b>1</b><span><strong>Feature comparison</strong><small>Selected face / voice / fingerprint signals</small></span></div><div><b>2</b><span><strong>Fusion or hierarchy</strong><small>Only where a compatible model exists</small></span></div><div><b>3</b><span><strong>Policy review</strong><small>No automatic access decision</small></span></div><div><b>4</b><span><strong>Metadata audit</strong><small>No raw sample in the audit record</small></span></div></div></article>' +
      '<article class="panel info-panel"><div class="aside-icon orange">⚑</div><h3>Important limitation</h3><p>There is no liveness or spoof detection, calibrated risk score, or production authorization workflow. A model result must never be treated as an access grant or denial.</p></article></aside></div>' +
      '<section class="panel result-panel" id="verificationResult" hidden></section>';
  }

  window.BioGuardModules = { enrollment: enrollment, verification: verification };
})();