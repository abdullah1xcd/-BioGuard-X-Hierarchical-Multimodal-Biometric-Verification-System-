# BioGuard X — Hierarchical Multimodal Biometric Verification (Research Prototype)

BioGuard X is a traditional-machine-learning coursework prototype. It includes HOG/LBP face features, MFCC/ZCR/RMS voice features, optional Gabor fingerprint features, SVM and Random Forest classifiers, face+voice early fusion, optional three-modality fusion, and face-first hierarchical verification. No deep-learning identity model is used.

## Quick start (Windows)

```powershell
py -3.12 -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python -m pytest tests -q
```

After collecting consented samples, train and evaluate:

```powershell
python -m scripts.run_ml_pipeline --dataset datasets/custom --output reports
```

The dataset layout and matching filename-stem rule are documented in [DATASET_GUIDE.md](DATASET_GUIDE.md) and [ML_PIPELINE.md](ML_PIPELINE.md). No biometric dataset or trained model is included, so real-data metrics must be generated locally and must not be replaced by synthetic CI results.

## Experimental API and frontend

Install API dependencies with `pip install -r requirements-api.txt` and follow [api/README.md](api/README.md). The API can load the versioned model bundle from `BIOGUARD_MODEL_PATH`, perform experimental face/voice/fingerprint inference, and keep its authorization policy decision pending. It never grants or denies access. The frontend is pure Vanilla HTML/CSS/JS; see [frontend/README.md](frontend/README.md).

## Layout

- `src/bioguard_ml.py`: feature extraction, traditional classifiers, fusion, calibration, metrics, and training.
- `scripts/run_ml_pipeline.py`: training CLI.
- `api/`: experimental FastAPI adapter and encrypted template storage.
- `frontend/`: Vanilla HTML/CSS/JS interface.
- `tests/`: API, feature-parity, model-inference, and synthetic training tests.

The original research modules and Streamlit application described in older documentation were absent from both accessible branches. This branch does not claim to restore them. See [TASK_2_ACCEPTANCE.md](TASK_2_ACCEPTANCE.md), [BUILD_STATUS.md](BUILD_STATUS.md), and [TEST_REPORT.md](TEST_REPORT.md) for exact implementation and remaining validation gates.

## Important limitations

No real-data training has been run because no consented dataset was supplied. The current split is sample-level rather than session-aware or participant-independent. Face detection/alignment, liveness/spoof resistance, speech-command permission workflows, production security hardening, and independent external evaluation are not implemented. This prototype is for coursework/research only, not real-world access control.
