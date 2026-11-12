# Model card — current traditional-ML pipeline

## Intended use

University coursework and controlled research demonstrations only. This is not a production biometric security or access-control system.

## Feature extraction

- Face: HOG descriptor (8,100 dimensions) plus an 8-neighbour LBP histogram (256 dimensions), concatenated to 8,356 dimensions.
- Voice: 13 MFCC coefficient means + 13 standard deviations, plus mean/std of zero-crossing rate and RMS energy (30 dimensions).
- Fingerprint: optional non-live 24-dimensional Gabor texture descriptor (8 orientations × 3 statistics).

No deep-learning identity model is used. Face detection/alignment and liveness detection are not implemented.

## Verification models

- Pairwise verification uses absolute differences between two sample feature vectors.
- Classifiers: calibrated RBF SVM and Random Forest.
- Face-only, voice-only, and combined face HOG+LBP paths are trained by the pipeline.
- Face+voice early fusion concatenates both feature vectors before pairwise classification.
- Hierarchical face+voice verification evaluates face first and uses voice fallback when the face score falls inside a validation-derived uncertainty band.
- Optional three-modality fusion is trained only when every matched face/voice sample also has a same-stem fingerprint sample.
- The API loads a versioned bundle from `BIOGUARD_MODEL_PATH` (default: `reports/bioguard_traditional_ml.joblib`). It supports only modality combinations for which the bundle contains compatible calibrated SVM entries. Unsupported or incompatible combinations remain `not_evaluated`.

A model result is experimental only. The API always returns `policy_decision: pending`; it never grants or denies access.

## Evaluation

The pipeline calibrates thresholds on the validation split using EER and reports held-out test accuracy, precision, recall, F1, FAR, FRR, EER, ROC-AUC, and confusion matrices. No real-data results are published because no consented biometric dataset has been supplied. CI's synthetic smoke test verifies that training/evaluation code executes; it does not establish model quality.

## Known limitations

- No trained model artifact or consented dataset is included in the repository; verification therefore remains `not_evaluated` until a trusted compatible bundle is supplied.
- Current splitting is sample-level within participants, not session-aware or participant-independent.
- Fingerprint training is optional and requires matched same-stem samples across all splits.
- No face detection/alignment, liveness or robust spoof resistance, calibrated risk score, independent external validation, retention/deletion workflow, or production security review.
- This prototype must not be used for real-world access control or high-stakes decisions.
