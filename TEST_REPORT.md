# Test report — verified CI results

## Latest code-validation run

- Workflow: [BioGuard API tests, run #171](https://github.com/abdullah1xcd/-BioGuard-X-Hierarchical-Multimodal-Biometric-Verification-System-/actions/runs/43186962473)
- Commit tested: `d785261b6181ae4b6efaf0a46738794e505213dc`
- Result: **PASS**
- Root and frontend npm installs/build scripts: PASS
- Docker API image build: PASS
- Python compilation: PASS
- Frontend Node tests: **9 passed**
- Vanilla JavaScript syntax: PASS
- Dependency consistency (`pip check`): PASS
- Python API/ML suite: **24 tests passed** (18 API + 6 ML)

The API suite covers authentication, health/calibration gates, encrypted template storage, consent and profile validation, failed-attempt audit records, feature parity, model-gated experimental inference, no-access-decision behavior, Vercel persistent-storage gating, Vercel payload-size rejection, and PostgreSQL adapter SQL/schema behavior using a fake connection. The ML suite covers face/voice/fingerprint features, pair construction, metrics/calibration, and synthetic training. The new frontend tests cover the multipart request-size boundary and local demo behavior.

## Historical CI

- [Run #107](https://github.com/abdullah1xcd/-BioGuard-X-Hierarchical-Multimodal-Biometric-Verification-System-/actions/runs/43123791346): PASS on an earlier code state; 18 Python tests.
- [Run #148](https://github.com/abdullah1xcd/-BioGuard-X-Hierarchical-Multimodal-Biometric-Verification-System-/actions/runs/43182935703): PASS on the earlier API/frontend hardening state.

## What CI does not validate

- No real-data training or biometric accuracy: no consented dataset is included.
- No real-world FAR/FRR/EER or security performance claim: synthetic CI data is only a software smoke test.
- No session-aware or participant-independent generalization.
- No live PostgreSQL server connection; PostgreSQL adapter/schema behavior is unit-tested with a fake connection.
- No successful live Vercel deployment, environment-variable setup, or live Vercel routing check. The latest Vercel status is failed; its logs require `npx vercel inspect dpl_FkGZLmaSXZuNVv2jkuH5omK5mh3w --logs` in an authenticated Vercel CLI session.
- No browser visual/interaction test, webcam/microphone hardware test, liveness/spoof test, or production security review.

The API can return experimental match/no-match results only when a trusted compatible model bundle is configured. Every result keeps policy_decision pending; no access grant or denial is made.

Runs #165 and #166 were triggered by later documentation-only commits after the code commit tested by run #164; their status was still in progress when this report was written.
