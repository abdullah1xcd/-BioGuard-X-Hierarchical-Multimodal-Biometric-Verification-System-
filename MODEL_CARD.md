# Model card — current traditional-ML pipeline

## Intended use

University coursework and controlled research demonstrations only. This is not a production biometric security or access-control system.

## Feature extraction

- Face HOG: OpenCV HOG descriptor on a normalized 128×128 grayscale image (8,100 dimensions with the configured descriptor).
- Face LBP: 8-neighbour local binary pattern histogram (256 bins).
- Combined face representation: concatenated HOG + LBP.
- Voice: 13 MFCC coefficient means + 13 standard deviations, plus mean/std of zero-crossing rate and RMS energy (30 dimensions).

No deep-learning identity model is used. Face detection/alignment and liveness detection are not implemented.

## Verification models

- Pairwise verification uses absolute differences between two sample feature vectors.
- Classifiers: calibrated RBF SVM and Random Forest.
- Face variants: HOG, LBP, and combined HOG+LBP.
- Voice: MFCC/ZCR/RMS feature vector.
- Early fusion: concatenated face and voice features before pairwise classification.
- Hierarchical path: face-first SVM, with voice SVM fallback inside a validation-derived uncertainty band.
- Operating thresholds are calibrated on the validation split using the EER point.

## Evaluation

The pipeline reports accuracy, precision, recall, F1, FAR, FRR, EER, ROC-AUC, and confusion matrices on the held-out test split. No real-data results are published in this repository because no consented dataset has been supplied. CI's synthetic smoke test verifies that training/evaluation code executes; it does not establish model quality.

## Known limitations

- Sample-level per-participant split; not session-aware or participant-independent.
- Filename-stem matching is required to pair face and voice samples for early fusion.
- Fingerprint is not included in the trained ML pipeline; the API's Gabor feature is diagnostic only.
- The FastAPI prototype does not yet load this model bundle and always reports verification as NOT EVALUATED / PENDING.
- No liveness, spoof-resistance evaluation, independent external validation, or production security review.
