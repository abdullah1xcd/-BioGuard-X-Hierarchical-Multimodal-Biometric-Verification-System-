# Next steps

## Required to produce real biometric results

1. Install the project dependencies: `pip install -r requirements.txt`.
2. Collect consented face and voice samples for at least two participants. Each participant needs at least 10 matched samples; corresponding image/audio filenames must share the same stem. Keep capture sessions independent and avoid near-duplicate frames across splits.
3. Run `python -m pytest tests -q`.
4. Run `python -m scripts.run_ml_pipeline --dataset datasets/custom --output reports`.
5. Review `reports/metrics.json` and the saved model bundle. Report only the measured test results from this run.

## Remaining engineering work

- Integrate the trained model bundle into the FastAPI service after dataset evaluation and model review.
- Add a session-aware split protocol and external/participant-independent evaluation.
- Add the optional fingerprint classifier and evaluate its fusion with face/voice.
- Implement face detection/alignment and liveness experiments.
- Perform browser and real webcam/microphone testing on the project owner's machine.
- Do not enable real access-control decisions until the model and policy pipeline have been independently reviewed.

The original Streamlit app, security agent, automation engine, speech-command system, and other research modules referenced by older docs are absent from both currently accessible branches; they are not represented as completed features in this branch.
