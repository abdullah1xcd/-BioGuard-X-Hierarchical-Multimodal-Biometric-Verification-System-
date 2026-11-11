# Project report template — current implementation

1. **Introduction and objective** — hierarchical multimodal biometric verification for coursework; traditional ML only.
2. **Requirements and constraints** — face, voice, optional fingerprint; no deep-learning identity models.
3. **Architecture** — Vanilla JS UI, experimental FastAPI adapter, and traditional-ML training pipeline.
4. **Dataset** — describe consent, participants, capture sessions, matched face/voice filename stems, and split protocol. No dataset is included in this repository.
5. **Face features** — HOG and LBP, individually and combined.
6. **Voice features** — MFCC mean/std, zero-crossing rate, and RMS energy.
7. **Traditional ML** — calibrated RBF SVM and Random Forest pairwise classifiers.
8. **Verification approaches** — face-only, voice-only, early feature fusion, and face-first hierarchical fallback.
9. **Evaluation methodology** — validation EER threshold calibration; held-out test metrics.
10. **Metrics** — accuracy, precision, recall, F1, confusion matrix, FAR, FRR, EER, and ROC-AUC. Explain that FAR and FRR have different error costs and that accuracy alone can hide class imbalance.
11. **Results** — populate from `reports/metrics.json` only after running the pipeline on the consented dataset. Never use CI synthetic metrics as biometric results.
12. **Limitations** — sample-level (not session-aware) split, no trained fingerprint model, no liveness, no API-to-model integration, and no real-data results until dataset collection.
13. **Conclusion and future work** — dataset evaluation, session-aware/independent testing, optional fingerprint integration, API/model integration, and hardware/browser testing.
14. **References** — OpenCV HOG, MFCC literature, scikit-learn SVM/Random Forest, and the exact dataset sources/licences used.
