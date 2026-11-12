(() => {
  const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
  const hasText = (value) => typeof value === "string" && value.trim().length > 0;

  function isWithinRequestLimit(totalBytes, maxRequestBytes, overheadBytes = 128 * 1024) {
    const total = Number(totalBytes);
    const limit = Number(maxRequestBytes);
    const overhead = Number(overheadBytes);
    if (!Number.isFinite(total) || total < 0) return false;
    if (!Number.isFinite(limit) || limit < 0) return false;
    if (limit === 0) return true;
    if (!Number.isFinite(overhead) || overhead < 0) return false;
    return total + overhead <= limit;
  }

  function invalidResponse(message) {
    const error = new Error(message);
    error.code = "INVALID_API_RESPONSE";
    return error;
  }

  function sameStringSet(actual, expected) {
    if (!Array.isArray(actual) || !Array.isArray(expected) || actual.length !== expected.length) return false;
    if (actual.some((value) => !hasText(value))) return false;
    const actualSet = new Set(actual);
    const expectedSet = new Set(expected);
    return actualSet.size === actual.length &&
      expectedSet.size === expected.length &&
      actual.every((value) => expectedSet.has(value));
  }

  function assertEnrollmentResponse(body, expectedIdentityRef, expectedModalities) {
    if (
      !isRecord(body) ||
      !hasText(body.request_id) ||
      !isRecord(body.identity) ||
      body.identity.identity_ref !== expectedIdentityRef ||
      body.identity.status !== "enrolled" ||
      !sameStringSet(body.registered_modalities, expectedModalities) ||
      !hasText(body.audit_event_id)
    ) {
      throw invalidResponse(
        "The API returned an incomplete enrollment response. The enrollment outcome is unconfirmed; check the identity and audit records before retrying."
      );
    }
    return body;
  }

  function assertVerificationResponse(body) {
    if (
      !isRecord(body) ||
      !hasText(body.request_id) ||
      !hasText(body.verification_id) ||
      !["match", "no_match", "not_evaluated"].includes(body.outcome) ||
      body.policy_decision !== "pending" ||
      !hasText(body.reason_code) ||
      !isRecord(body.diagnostic_similarity) ||
      !hasText(body.audit_event_id) ||
      !hasText(body.message)
    ) {
      throw invalidResponse(
        "The API returned an incomplete or unsafe verification response. The request outcome is unconfirmed; check the audit records before retrying."
      );
    }
    return body;
  }

  window.BioGuardApiContract = Object.freeze({
    assertEnrollmentResponse,
    assertVerificationResponse,
    isWithinRequestLimit
  });
})();
