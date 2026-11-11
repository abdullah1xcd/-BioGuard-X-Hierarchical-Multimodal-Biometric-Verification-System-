# Traditional-ML biometric pipeline

## Implemented research pipeline

The training pipeline is implemented in `src/bioguard_ml.py` and uses traditional machine learning only. It does not use deep-learning models.

- Face features: HOG descriptor and an 8-neighbour LBP histogram, evaluated separately and together.
- Voice features: 13 MFCC coefficients (mean and standard deviation), plus zero-crossing rate (ZCR) and root-mean-square energy (RMS) statistics.
- Verification formulation: genuine (same participant) and impostor (different participant) sample pairs, represented by absolute feature differences.
- Classifiers: RBF SVM and Random Forest for each face feature configuration, voice, and early-fusion features.
- Early fusion: concatenated face and voice feature vectors before pairwise classification.
- Hierarchical verification: face-first SVM; use the voice SVM when the face score falls inside a validation-derived uncertainty band.
- Calibration/evaluation: choose the operating threshold on the validation split using the equal-error-rate (EER) point; report test accuracy, precision, recall, F1, FAR, FRR, EER, ROC-AUC, and confusion matrix.

## Dataset layout

The loader expects at least two participants and at least 10 matched face/voice samples per participant:

```text
datasets/custom/
  participant_001/
    face/
      sample_001.jpg
      sample_002.jpg
    voice/
      sample_001.wav
      sample_002.wav
  participant_002/
    face/
    voice/
```

A face image and its corresponding voice recording must share the same filename stem (for example, `sample_001.jpg` and `sample_001.wav`). This is how the loader pairs the two modalities for early fusion. Supported images: JPG, JPEG, PNG, BMP. Supported audio: WAV, FLAC, OGG.

Each participant's matched sample stems are deterministically shuffled and split into 60% train, 20% validation, and 20% test. Files are disjoint across splits. This is a sample-level split, not a session-aware split: collect independent capture sessions and avoid near-duplicate adjacent frames across splits. At least 10 samples are required so each split can contain genuine pairs.

Only use data collected with informed consent. Do not add real biometric samples to Git.

## Run

From the repository root with the root requirements installed:

```powershell
python -m pip install -r requirements.txt
python -m scripts.run_ml_pipeline --dataset datasets/custom --output reports
```

The command writes:
- `reports/bioguard_traditional_ml.joblib` — trained research models and validation thresholds.
- `reports/metrics.json` — test metrics and confusion matrices.

The dataset is not included in this repository. Consequently, no real-data training run or biometric performance result is claimed here. CI uses synthetic signals to test feature extraction, pair construction, and metric calculations; it does not establish identity-verification accuracy or spoof resistance.

## Scope and limitations

- The training pipeline is a new implementation because neither branch contained the original `src/`, `app/`, or `scripts/` research modules described by earlier documentation.
- The current FastAPI API is still an isolated experimental adapter. It has not yet loaded this trained model bundle; its verification endpoint deliberately returns `not_evaluated` / `pending`.
- Fingerprint is not yet part of this trained pipeline. The API's Gabor fingerprint descriptor is diagnostic only.
- Face detection/alignment, liveness detection, session-aware splitting, independent external evaluation, and production access-control integration remain unimplemented.
- These models are for coursework/research demonstrations, not real-world access control.
