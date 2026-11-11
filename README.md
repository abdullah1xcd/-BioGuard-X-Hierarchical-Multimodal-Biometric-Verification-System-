# BioGuard X — Intelligent Adaptive Multimodal Biometric Security & Automation Platform

Traditional-ML only (no deep learning). The current branch contains a new HOG/LBP face + MFCC/ZCR/RMS voice pair-verification training pipeline, SVM/Random Forest classifiers, early fusion, and face-first hierarchical evaluation. See ML_PIPELINE.md for the exact dataset contract and current limitations.

## Quick start (Windows)
    py -3.12 -m venv .venv
    .venv\Scripts\activate
    pip install -r requirements.txt
    python -m pytest tests -q
    # put data in datasets/custom/participant_001/{face,voice,commands,fingerprint}/  (see DATASET_GUIDE.md)
    python -m scripts.validate_dataset
    python -m scripts.run_ml_pipeline --dataset datasets/custom --output reports  # trains/evaluates face, voice, early fusion and hierarchy
    python -m scripts.train_commands       # optional: speech-command model
    python -m scripts.run_security_eval    # agent/automation scenario evaluation
    streamlit run app/main.py

## Fingerprint verification and three-modality workflow
The project now includes a dedicated **Fingerprint Verification** page for claimed-identity checks, plus an optional Face + Voice + Fingerprint path on the Multimodal Verification page. Fingerprint model training is enabled when every participant used in the Face/Voice experiment has at least 10 fingerprint images. After collecting data, run `python -m scripts.run_all`; the bundle must contain `fp_ver`, `refs_fp`, `w3`, and `thr3`. The three-modality route uses validation-calibrated score fusion, while the required Face + Voice early feature fusion remains unchanged. See `FIXES_AND_VALIDATION.md` for changes, test results, and limitations.

## Layout
`src/bioguard_ml.py` contains the new traditional-ML training/evaluation pipeline; `api/` contains the experimental FastAPI adapter; `frontend/` contains the Vanilla HTML/CSS/JS UI; `scripts/run_ml_pipeline.py` is the training CLI; `tests/` contains CI tests. The former research modules and Streamlit application described in older documentation are not present in either branch. See BUILD_STATUS.md and ML_PIPELINE.md for verified status.

## Experimental FastAPI prototype

An isolated development API has been added under `api/` because the original Python source directories described in this README are not present in the accessible branch snapshot. It provides consent-gated enrollment, encrypted handcrafted feature-template storage, and diagnostic similarity processing. It is **not** a recreation of the missing trained biometric/fusion/hierarchy/risk modules. Verification is deliberately hard-gated to `not_evaluated` / `pending` until the pipeline is validated and calibrated. See [ML_PIPELINE.md](ML_PIPELINE.md), [api/README.md](api/README.md), and [frontend/API_INTEGRATION_CONTRACT.md](frontend/API_INTEGRATION_CONTRACT.md). Install its optional dependencies with `pip install -r requirements-api.txt`; the original Streamlit requirements and startup instructions are unchanged.
