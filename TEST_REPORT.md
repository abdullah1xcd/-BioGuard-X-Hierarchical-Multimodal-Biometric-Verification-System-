# Test report — verified CI results

## Latest completed code-validation run

- Workflow: [BioGuard API tests, run #46](https://github.com/abdullah1xcd/-BioGuard-X-Hierarchical-Multimodal-Biometric-Verification-System-/actions/runs/43115552858)
- Commit tested: `58edd945a47f08623b0dbde1d2e854166de4f7d4`
- Result: **PASS**
- Pytest: **14 passed, 0 failed**
- Python compilation: PASS
- Vanilla JavaScript syntax (`frontend/app.js`, `frontend/modules.js`): PASS
- Dependency consistency (`pip check`): PASS
- Vercel deployment status for this commit: PASS

The 14 automated tests cover API health/calibration gating, authentication rejection, encrypted template round-trip, identity reference validation, enrollment/verification safety gate, malformed email and consent validation, voice/fingerprint feature extraction, missing-sample handling, face HOG/LBP extraction, voice MFCC/ZCR/RMS extraction, pair balancing, EER/metric calculation, and a synthetic end-to-end training smoke test that writes a model bundle and metrics report.

## Warning

One upstream warning remains: Starlette currently deprecates using `httpx` with its `TestClient`. It does not fail the tests. The deprecated FastAPI `on_event` lifecycle and scikit-learn SVM probability warnings were removed in later commits.

## Not validated by CI

- Real-data training or biometric accuracy: no consented dataset is included.
- Real-world FAR/FRR/EER or security performance: synthetic test data is only a software smoke test.
- Browser visual/interaction testing on the owner's machine.
- Webcam/microphone hardware testing.
- Fingerprint trained classifier, liveness, spoof resistance, or API integration with the trained model bundle.

Do not present synthetic test results as biometric performance. See [TASK_2_ACCEPTANCE.md](TASK_2_ACCEPTANCE.md) for remaining assignment blockers.
