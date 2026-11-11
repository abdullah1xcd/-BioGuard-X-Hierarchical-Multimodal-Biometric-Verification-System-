# Fixes and validation — current branch

## Implemented in this branch

- Vanilla HTML/CSS/JavaScript enrollment and verification forms, with modality selection, client-side field/file checks, consent/authorization acknowledgements, loading/success/error feedback, and explicit prototype labeling.
- Experimental FastAPI adapter with bearer-token operator authentication, server-side JSON and sample validation, upload size limits, in-memory sample processing, encrypted feature-template storage, and metadata-only audit events.
- Traditional-ML training pipeline in `src/bioguard_ml.py`: face HOG and LBP features; voice MFCC, ZCR, and RMS features; SVM and Random Forest pair classifiers; face-only, voice-only, early-fusion, and hierarchical paths; validation EER calibration and test metrics.
- CI checks for Python compilation, Vanilla JavaScript syntax, dependency consistency, API tests, ML feature tests, and a synthetic end-to-end training smoke test.

## Latest automated validation

See [TEST_REPORT.md](TEST_REPORT.md) for the latest completed GitHub Actions run and exact commit. The tests use synthetic inputs to validate software behavior; they are not biometric accuracy results.

## Important scope boundaries

- Neither `main` nor `frontend/vanilla-js-redesign` contained the original `src/`, `app/`, or `scripts/` research implementation described in older documentation. The current ML pipeline is a new implementation, not a preservation or restoration of those missing modules.
- The API is still separate from the trained ML bundle and deliberately returns NOT EVALUATED / PENDING.
- No consented dataset is included, so real training metrics are not available.
- The trained fingerprint classifier, speech-command workflow, risk engine, security analyst agent, automation engine, Streamlit app, liveness, and hardware capture are not implemented in this branch.

## Owner-side validation still required

1. Collect consented, matched face/voice data for at least two participants, with at least 10 matched stems per participant.
2. Run `python -m scripts.run_ml_pipeline --dataset datasets/custom --output reports`.
3. Review the resulting `reports/metrics.json` and model bundle; report only the measured held-out test results.
4. Perform browser/manual testing on the target machine.
5. Do not use the API for real access-control decisions.
