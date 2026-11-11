# Task 2 acceptance checklist — Hierarchical Multimodal Biometric Verification

This checklist separates implemented software from work that still requires the original research code, consented data, or owner-side validation. It does not mark blocked items as complete.

## Core assignment

- [x] Traditional machine learning only; no deep-learning identity model is used.
- [x] Face feature extraction: HOG and LBP.
- [x] Voice feature extraction: MFCC statistics, ZCR, and RMS.
- [x] At least two traditional classifiers: SVM and Random Forest.
- [x] Face feature variants are evaluated separately (HOG, LBP) and combined.
- [x] Voice-only verification model path.
- [x] Face-only verification model path.
- [x] Face + voice early feature-fusion model path.
- [x] Face-first hierarchical path with voice fallback for uncertain face scores.
- [x] Train/validation/test split with disjoint sample files within each participant.
- [x] Validation-set EER threshold calibration.
- [x] Test metrics: accuracy, precision, recall, F1, FAR, FRR, EER, ROC-AUC, and confusion matrix.
- [x] Synthetic end-to-end training smoke test in CI.
- [ ] Real-data training and test results — blocked until consented data is supplied.
- [ ] Session-aware or participant-independent evaluation — not implemented; current split is sample-level.
- [ ] Compare and discuss real model results in the final report — blocked until real metrics exist.

## Frontend and API task

- [x] Pure HTML/CSS/Vanilla JavaScript; no React, Vue, Angular, or frontend framework.
- [x] Identity enrollment form and biometric verification form.
- [x] Face, voice, and optional fingerprint selection and file validation.
- [x] Consent acknowledgement for enrollment and authorization acknowledgement for verification.
- [x] Loading, success, and error feedback.
- [x] Explicit prototype/demo labeling; illustrative dashboard metrics are not represented as live results.
- [x] API-side bearer authentication, consent/purpose validation, file-size/decode checks, encrypted template storage, and metadata audit events.
- [x] API verification remains NOT EVALUATED / PENDING; no access decision is fabricated.
- [ ] Integration with the original biometric/fusion/risk services — blocked because those source modules are absent from both branches.
- [ ] API loading of the newly trained model bundle — not implemented; the current API is still an isolated diagnostic prototype.

## Optional / bonus work

- [ ] Trained fingerprint classifier and fusion with face/voice — not implemented. The API's Gabor descriptor is diagnostic only.
- [ ] Speech-command verification and identity-based permissions — not present in the accessible repository.
- [ ] Real-time webcam/microphone capture — not implemented in this Vanilla JS flow.
- [ ] Liveness/spoof evaluation — not implemented.

## Repository and safety constraints

- [x] Changes are committed only to `frontend/vanilla-js-redesign`.
- [x] `main` has not been modified or merged.
- [x] No real biometric dataset or fabricated performance numbers are committed.
- [x] Verification is not used for real access-control decisions.

## Current CI gate

The workflow runs Python compilation, Vanilla JavaScript syntax checks, dependency consistency checks, API tests, ML feature/evaluation tests, and a synthetic end-to-end training smoke test. A green CI run does not replace real-data evaluation or hardware/browser acceptance testing.
