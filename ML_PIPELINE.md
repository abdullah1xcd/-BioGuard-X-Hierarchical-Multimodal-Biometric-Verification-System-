# Traditional-ML biometric pipeline

## Implemented research pipeline

The training pipeline in `src/bioguard_ml.py` uses traditional machine learning only; no deep-learning identity model is used.

- Face features: HOG descriptor and 8-neighbour LBP histogram, evaluated separately and together.
- Voice features: 13 MFCC coefficients (mean and standard deviation), plus ZCR and RMS statistics.
- Fingerprint: optional non-live 24-dimensional Gabor texture descriptor.
- Pair verification: genuine (same participant) and impostor (different participant) pairs represented by absolute feature differences.
- Classifiers: calibrated RBF SVM and Random Forest.
- Fusion: face+voice early feature fusion; optional face+voice+fingerprint fusion when every paired sample has a matching fingerprint file.
- Hierarchical verification: face-first SVM; use voice SVM when the face score is inside a validation-derived uncertainty band.
- Calibration/evaluation: select thresholds on validation EER; report test accuracy, precision, recall, F1, FAR, FRR, EER, ROC-AUC, and confusion matrix.

## Dataset layout

At least two participants and 10 matched face/voice samples per participant are required. Face and voice filenames must share a stem. For optional three-modality training, every paired face/voice stem must also have a fingerprint image with the same stem.

```text
datasets/custom/
  participant_001/
    face/sample_001.jpg
    voice/sample_001.wav
    fingerprint/sample_001.png  # optional; same stem
  participant_002/
    face/
    voice/
    fingerprint/                 # optional
```

Supported images: JPG, JPEG, PNG, BMP. Supported audio: WAV, FLAC, OGG. Only use biometric data collected with informed consent. Do not add real biometric samples to Git.

Each participant's matched sample stems are deterministically shuffled and split 60/20/20 into train/validation/test. Files are disjoint across splits, but the split is sample-level, not session-aware or participant-independent. Use distinct capture sessions and avoid near-duplicate adjacent frames across splits. At least 10 matched samples are required so each split can contain genuine pairs.

## Run

```powershell
python -m pip install -r requirements.txt
python -m pytest tests -q
python -m scripts.run_ml_pipeline --dataset datasets/custom --output reports
```

Outputs:
- `reports/bioguard_traditional_ml.joblib`: versioned trained models and validation thresholds.
- `reports/metrics.json`: test metrics and confusion matrices by feature/model and hierarchical flow.

The API can load the bundle using `BIOGUARD_MODEL_PATH`. The API and training extractors are tested for feature parity. The API returns experimental model results only; its policy decision remains pending.

## Metric interpretation

Confusion matrix order is `[[TN, FP], [FN, TP]]`. FAR = FP/(FP+TN); FRR = FN/(FN+TP). EER is where FAR and FRR are closest; the operating threshold is selected on validation, not test. Compare model rows only on the same held-out split.

## Limitations

No consented biometric dataset is included, so no real-data training run or performance result is claimed. CI uses synthetic signals to test software behavior only. Session-aware/participant-independent evaluation, face detection/alignment, liveness/spoof resistance, independent external evaluation, and production access-control integration remain incomplete. The system is for coursework/research demonstration, not real-world access control.