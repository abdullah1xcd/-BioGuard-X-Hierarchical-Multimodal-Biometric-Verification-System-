# Build status — verified against the current branch

| Area | Current status | Evidence / blocker |
|---|---|---|
| Vanilla HTML/CSS/JS frontend | Implemented | No frontend framework; JavaScript syntax checked in CI |
| Enrollment UI | Implemented | Form validation, selected modality uploads, consent acknowledgement, loading/success/error states |
| Verification UI | Implemented | Shows NOT EVALUATED when no trained bundle exists, or clearly labeled experimental match/no-match output while keeping policy pending |
| FastAPI adapter | Experimental prototype | Authenticated enrollment and diagnostic verification routes; encrypted templates and metadata audit |
| Face features | Implemented in new ML pipeline | HOG + LBP; unit-tested on synthetic image |
| Voice features | Implemented in new ML pipeline | MFCC + ZCR + RMS; unit-tested on synthetic audio |
| Traditional classifiers | Implemented in new ML pipeline | SVM and Random Forest for face, voice, and early fusion |
| Early fusion | Implemented in new ML pipeline | Concatenated face + voice features and pairwise classifiers |
| Hierarchical evaluation | Implemented in new ML pipeline | Face-first with validation-derived uncertainty band and voice fallback |
| Train/validation/test split | Implemented | Deterministic 60/20/20 sample-level split by participant; session-aware split remains a limitation |
| Evaluation metrics | Implemented | Accuracy, precision, recall, F1, FAR, FRR, EER, ROC-AUC, confusion matrix |
| Real-data training/results | NOT RUN | No consented dataset is included; requires at least 10 matched face/voice samples per participant |
| API-to-trained-model integration | Implemented as experimental inference | Shared face/voice/fingerprint feature dimensions, versioned joblib bundle loading, SVM score/threshold inference, early-fusion scoring, three-modality fusion, and face-first voice fallback; policy remains pending |
| Fingerprint trained classifier/fusion | Implemented, optional dataset path | Gabor texture descriptor + SVM/Random Forest + three-modality face/voice/fingerprint fusion when every paired sample has fingerprint data; no real dataset evaluation yet |
| Original risk engine, security agent, automation, speech commands, Streamlit app | NOT PRESENT in current branches | Neither main nor feature branch contains the original src/app/scripts implementation described by historical docs |
| Face detection/alignment and liveness | NOT IMPLEMENTED | Required before any real-world use |
| Hardware/browser end-to-end validation | NOT RUN | Requires owner machine, browser, webcam/microphone, and consented data |

## CI status

The GitHub Actions workflow checks API tests, traditional-ML unit tests, and Vanilla JavaScript syntax. A green CI run proves those automated software checks pass; it does not prove biometric accuracy, liveness, or production readiness.

## Required owner-side work

1. Collect consented, session-separated face/voice samples with matching filename stems; add same-stem fingerprint images for optional three-modality training.
2. Run `python -m scripts.run_ml_pipeline --dataset datasets/custom --output reports`.
3. Review the test metrics and confusion matrices; do not report synthetic CI data as model performance.
4. Review and test the API-to-model integration before enabling any verification outcome.
5. Run the frontend against the API on the target machine and test the actual camera/microphone flow if required.
