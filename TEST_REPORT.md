# Test report
Executed in the build sandbox with a minimal pytest-compatible runner (pytest/librosa/streamlit were not installable there):
`tests/test_core_security_automation.py` -> **24 passed, 0 failed** (DB, enrolment/consent/deletion, permissions, role mismatch, commands blocked without identity,
risk, agent detection/approval, event triggers, dedupe, approval/reject/expiry, allow-list, retry/non-retry, recovery/escalation, scheduler, backup, reports, high-risk workflow).
Security scenario evaluation (`python -m scripts.run_security_eval`, 5 positive + 4 benign scenarios written by the developer, so it checks consistency, not real-world accuracy):
detection 1.0, false positives 0.0, avg analysis 7.2 ms, automation success 0.778 (rest = workflows waiting for approval), approvals decided 0.4.
NOT executed: `tests/test_features.py` (needs cv2 Haar + librosa), biometric training/evaluation, Streamlit app, webcam/microphone (no hardware), Ollama.
Run these on your machine and append the results here.
