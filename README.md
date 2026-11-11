# BioGuard X — Intelligent Adaptive Multimodal Biometric Security & Automation Platform

Traditional-ML only (no deep learning). The current branch contains a new HOG/LBP face + MFCC/ZCR/RMS voice pair-verification training pipeline, SVM/Random Forest classifiers, early fusion, and face-first hierarchical evaluation. See ML_PIPELINE.md for the exact dataset contract and current limitations.

## Quick start (Windows)
    py -3.12 -m venv .venv
    .venv\Scripts\activate
    pip install -r requirements.txt
    python -m pytest tests -q

After collecting consented, matched face/voice samples, run:
    python -m scripts.run_ml_pipeline --dataset datasets/custom --output reports

The expected folder structure and matching filename-stem rule are documented in [DATASET_GUIDE.md](DATASET_GUIDE.md) and [ML_PIPELINE.md](ML_PIPELINE.md). The repository does not contain biometric datasets or pre-trained models, so the training command must be run locally before reporting real performance metrics.

For the experimental HTTP API, install `requirements-api.txt` and follow [api/README.md](api/README.md). For the Vanilla JS frontend, follow [frontend/README.md](frontend/README.md).

## Layout
`src/bioguard_ml.py` contains the new traditional-ML training/evaluation pipeline; `api/` contains the experimental FastAPI adapter; `frontend/` contains the Vanilla HTML/CSS/JS UI; `scripts/run_ml_pipeline.py` is the training CLI; `tests/` contains CI tests. The former research modules and Streamlit application described in older documentation are not present in either branch. See BUILD_STATUS.md and ML_PIPELINE.md for verified status.

## Experimental FastAPI prototype

An isolated development API has been added under `api/` because the original Python source directories described in this README are not present in the accessible branch snapshot. It provides consent-gated enrollment, encrypted handcrafted feature-template storage, and diagnostic similarity processing. It is **not** a recreation of the missing trained biometric/fusion/hierarchy/risk modules. Verification is deliberately hard-gated to `not_evaluated` / `pending` until the pipeline is validated and calibrated. See [ML_PIPELINE.md](ML_PIPELINE.md), [api/README.md](api/README.md), and [frontend/API_INTEGRATION_CONTRACT.md](frontend/API_INTEGRATION_CONTRACT.md). Install its optional dependencies with `pip install -r requirements-api.txt`.
