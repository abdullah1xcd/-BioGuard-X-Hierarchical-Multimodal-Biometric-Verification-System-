(() => {
  function modalities(prefix) {
    return [
      ["face","Face recognition","HOG / LBP feature pipeline","◉",true],
      ["voice","Voice verification","MFCC · ZCR · RMS features","⌁",false],
      ["fingerprint","Fingerprint","Gabor + HOG / LBP","▦",false]
    ].map(function (m) {
      return '<label class="modality-card" for="' + prefix + '-' + m[0] + '"><input id="' + prefix + '-' + m[0] + '" name="' + prefix + '-modality" type="checkbox" value="' + m[0] + '"' + (m[4] ? ' checked' : '') + '><span class="modality-check"></span><span class="modality-icon">' + m[3] + '</span><span class="modality-copy"><strong>' + m[1] + '</strong><small>' + m[2] + '</small></span>' + (m[0] === "fingerprint" ? '<span class="optional-tag">OPTIONAL</span>' : '') + '</label>';
    }).join("");
  }

  function upload(prefix, kind, title, accept, hint) {
    return '<label class="upload-field" for="' + prefix + '-' + kind + '"><input id="' + prefix + '-' + kind + '" type="file" accept="' + accept + '" data-upload="' + kind + '"><span class="upload-icon">＋</span><span class="upload-copy"><strong>' + title + '</strong><small>' + hint + '</small><em data-file-name="' + kind + '">Choose a file</em></span></label>';
  }

  function uploads(prefix) {
    return '<div class="upload-grid">' +
      upload(prefix,"face","Face sample","image/*","JPG, PNG · max 10 MB") +
      upload(prefix,"voice","Voice sample","audio/*","WAV, MP3, M4A · max 20 MB") +
      upload(prefix,"fingerprint","Fingerprint sample","image/*","PNG, JPG · max 10 MB") + '</div>';
  }

  function heading(kicker, title, subtitle) {
    return '<div class="module-heading"><div><div class="eyebrow"><span class="eyebrow-line"></span> ' + kicker + '</div><h2>' + title + '</h2><p>' + subtitle + '</p></div><span class="demo-chip"><i></i> API PROTOTYPE</span></div>';
  }

  function section(number, title, subtitle, body) {
    return '<div class="form-section"><div class="form-section-title"><span class="step-number">' + number + '</span><div><h3>' + title + '</h3><p>' + subtitle + '</p></div></div>' + body + '</div>';
  }

  function enrollment() {
    return heading("IDENTITY MANAGEMENT","Register a new identity","Create a profile and select the biometric modalities to be registered.") +
      '<div class="module-layout"><form id="enrollmentForm" class="panel module-form" novalidate>' +
      section("01","Identity details","Enter the person’s basic profile information.",
        '<div class="form-grid"><label class="field"><span>Full name <b>*</b></span><input name="fullName" type="text" placeholder="e.g. Omar Mahmoud" autocomplete="name" required minlength="2" maxlength="100"><small class="field-error" data-error="fullName"></small></label>' +
        '<label class="field"><span>Identity reference <b>*</b></span><input name="identityRef" type="text" placeholder="e.g. BG-00843" required pattern="[A-Za-z0-9_-]{3,32}" maxlength="32"><small class="field-hint">Use a unique internal reference (3–32 characters).</small><small class="field-error" data-error="identityRef"></small></label>' +
        '<label class="field field-wide"><span>Email address <small>Optional</small></span><input name="email" type="email" placeholder="name@company.com" autocomplete="email"><small class="field-error" data-error="email"></small></label></div>') +
      '<div class="form-divider"></div>' +
      section("02","Biometric modalities","Choose at least one modality. Fingerprint is optional.",
        '<div class="modality-grid">' + modalities("enroll") + '</div><div class="upload-heading"><strong>Biometric sample files</strong><span>Selected samples are sent to the local API for experimental processing; raw files are not retained.</span></div>' + uploads("enroll") + '<small class="field-error" id="enrollUploadError"></small>') +
      '<div class="form-divider"></div>' +
      section("03","Consent & privacy","Biometric collection requires explicit, informed consent.",
        '<div class="consent-box"><span class="consent-symbol">ⓘ</span><p>Explain what biometric data is collected, why it is needed, how it is stored, and how the person can request deletion. Use only samples collected with permission.</p></div><label class="consent-check"><input type="checkbox" name="consent" required><span>I confirm that informed consent has been obtained and the person has agreed to this biometric enrollment. <b>*</b></span></label><small class="field-error" data-error="consent"></small>') +
      '<div class="form-actions"><span class="required-note"><b>*</b> Required fields</span><button class="button button-primary" type="submit"><span>＋</span> Create identity</button></div><div class="form-feedback" id="enrollFeedback" role="status" aria-live="polite" hidden></div></form>' +
      '<aside class="module-aside"><article class="panel info-panel"><div class="aside-icon teal">⌁</div><h3>Enrollment checklist</h3><ul class="check-list"><li>Confirm the person’s identity</li><li>Obtain informed consent</li><li>Use clear, high-quality samples</li><li>Register only necessary modalities</li><li>Store biometric templates securely</li></ul></article>' +
      '<article class="panel info-panel"><div class="aside-icon blue">⌘</div><h3>What happens next?</h3><p>In the connected system, the backend validates samples, extracts modality-specific features, and stores an enrollment reference. This preview does not run those steps.</p><div class="pipeline-mini"><span>Sample</span><i>→</i><span>Feature extraction</span><i>→</i><span>Secure reference</span></div></article><div class="privacy-note"><strong>Privacy by design</strong><p>Do not use real biometric samples in this demo. Use synthetic or consented test files only.</p></div></aside></div>';
  }

  function verification() {
    return heading("AUTHENTICATION WORKSPACE","Biometric verification","Submit a claimed identity and sample set for a verification workflow preview.") +
      '<div class="verification-layout"><form id="verificationForm" class="panel module-form" novalidate>' +
      section("01","Claimed identity","Who is requesting access?",
        '<label class="field"><span>Identity reference <b>*</b></span><input name="identityRef" type="text" placeholder="Enter registered ID, e.g. BG-00843" required minlength="3" maxlength="32"><small class="field-error" data-error="identityRef"></small></label>') +
      '<div class="form-divider"></div>' +
      section("02","Verification modalities","Select the signals available for this check.",
        '<div class="modality-grid">' + modalities("verify") + '</div><div class="upload-heading"><strong>Provide verification samples</strong><span>Selected modalities require a matching file.</span></div>' + uploads("verify") + '<small class="field-error" id="verifyUploadError"></small>') +
      '<div class="form-divider"></div>' +
      section("03","Authorization","Only submit samples you are permitted to process.",
        '<div class="consent-box"><span class="consent-symbol">ⓘ</span><p>Verification is a sensitive operation. Ensure the person knows the purpose of the check and that you are authorized to process these samples.</p></div><label class="consent-check"><input type="checkbox" name="authorization" required><span>I am authorized to submit these samples for verification and have the required permission. <b>*</b></span></label><small class="field-error" data-error="authorization"></small>') +
      '<div class="form-actions"><span class="required-note"><b>*</b> Required fields</span><button class="button button-primary" type="submit"><span>◎</span> Run verification</button></div><div class="form-feedback" id="verifyFeedback" role="status" aria-live="polite" hidden></div></form>' +
      '<aside class="module-aside"><article class="panel info-panel"><div class="aside-icon teal">◎</div><h3>Hierarchical verification</h3><p>The intended backend flow evaluates selected signals, applies configured fusion, and passes the result to risk and policy checks.</p><div class="pipeline-steps"><div><b>1</b><span><strong>Biometric matching</strong><small>Face / voice / fingerprint</small></span></div><div><b>2</b><span><strong>Fusion & hierarchy</strong><small>Combine available evidence</small></span></div><div><b>3</b><span><strong>Risk & policy</strong><small>Review before any access action</small></span></div><div><b>4</b><span><strong>Audit event</strong><small>Record the decision trail</small></span></div></div></article><article class="panel info-panel"><div class="aside-icon orange">⚑</div><h3>Important limitation</h3><p>Risk never grants access by itself. A production workflow must enforce server-side authorization and any required human approval.</p></article></aside></div><section class="panel result-panel" id="verificationResult" hidden></section>';
  }

  window.BioGuardModules = { enrollment: enrollment, verification: verification };
})();