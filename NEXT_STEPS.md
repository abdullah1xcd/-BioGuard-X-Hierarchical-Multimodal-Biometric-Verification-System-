# Remaining work to complete BioGuard X validation

## Required owner-side steps

1. Collect consented face and voice samples for at least two participants, with 10+ matched filename stems per participant. For three-modality fusion, add a same-stem fingerprint image for every paired sample.
2. Keep capture sessions separate and record session metadata; the current default split is sample-level, not session-aware.
3. Run `python -m pytest tests -q`.
4. Run `python -m scripts.run_ml_pipeline --dataset datasets/custom --output reports`.
5. Review `reports/metrics.json`, confusion matrices, FAR/FRR/EER, and thresholds. Report only measured real-data test results.
6. Configure `BIOGUARD_MODEL_PATH` to the generated model bundle and test the frontend/API locally with the actual files.

## Remaining engineering and acceptance gates

- Session-aware or participant-independent evaluation protocol.
- Face detection/alignment and liveness/spoof experiments if required by the professor.
- Browser interaction and actual webcam/microphone testing on the project owner's machine.
- Production hardening: HTTPS, rate limiting, managed key storage, identity deletion/retention policy, and independent security review.
- Any real access-control policy integration must be independently reviewed. The current API deliberately keeps `policy_decision=pending`.

The original Streamlit app, risk engine, security agent, automation engine, and speech-command modules referenced by older documentation are absent from both accessible branches. They are not represented as completed features.