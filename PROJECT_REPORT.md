# Project report template — current implementation

1. **Introduction and objective** — hierarchical multimodal biometric verification for coursework using traditional ML only.
2. **Requirements and constraints** — face and voice verification, optional fingerprint texture features, a Vanilla JS interface, and no automatic access decision.
3. **Architecture** — Vanilla HTML/CSS/JavaScript frontend; experimental FastAPI adapter in `api/main.py`; training pipeline in `src/bioguard_ml.py`; SQLite for local development and PostgreSQL for Vercel persistence.
4. **Dataset** — describe consent, participants, capture sessions, matched face/voice filename stems, optional matched fingerprint samples, and the split protocol. No biometric dataset is included in this repository.
5. **Feature extraction** — face HOG+LBP, voice MFCC/ZCR/RMS, and optional 8-orientation Gabor fingerprint texture features.
6. **Traditional ML** — calibrated RBF SVM and Random Forest pairwise classifiers.
7. **Verification approaches** — face-only, voice-only, face+voice early fusion, face-first hierarchical voice fallback, and optional three-modality fusion when the dataset is complete.
8. **API integration** — authenticated multipart enrollment and verification, server-side validation, consent/authorization acknowledgements, encrypted feature-template storage, and metadata-only audit events. Policy decisions remain pending.
9. **Evaluation methodology** — validation EER threshold calibration and held-out test metrics. Explain the sample-level split limitation.
10. **Metrics** — accuracy, precision, recall, F1, confusion matrix, FAR, FRR, EER, and ROC-AUC. Explain that FAR and FRR have different error costs and that accuracy alone can hide class imbalance.
11. **Results** — populate from `reports/metrics.json` only after running the pipeline on consented data. Never use CI synthetic metrics as biometric results. No trained bundle or real-data result is currently included.
12. **Limitations** — no session-aware/participant-independent evaluation, face detection/alignment, liveness, calibrated risk score, production authorization, or real-data results.
13. **Conclusion and future work** — real-data evaluation, session-aware testing, optional fingerprint evaluation, model-bundle deployment, browser/hardware acceptance tests, and security hardening.
14. **References** — OpenCV HOG, MFCC literature, scikit-learn SVM/Random Forest, and the exact dataset sources/licences used.
