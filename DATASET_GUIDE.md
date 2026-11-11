# Dataset guide
Layout: `datasets/custom/participant_001/{face/*.jpg, voice/*.wav, fingerprint/*.png, commands/<command_key>/*.wav, metadata.json}`.
Command keys: open_dashboard, view_profile, show_report, generate_report, show_security_log, logout.
Recommended per participant: 30-50 face images (lighting/angle/distance, 3 sessions), ~30 voice recordings, at least 10 fingerprint images to enable three-modality training, and ~10 recordings per command. Fingerprint training is enabled only when all participants included in the paired Face/Voice experiment also have sufficient fingerprint samples.
Splits: per participant 60/20/20 train/val/test with disjoint files; face and voice are paired only inside the same split.
Caveat: random splits can place near-duplicate consecutive frames in different splits -> collect separate sessions and keep session 3 for test only.
Consent: enrolment requires explicit consent (stored in metadata.json + DB). Exclude under-16 participants.
FaciaVox (https://zenodo.org/records/14861092): access is controlled; place it under `datasets/public/faciavox` only after obtaining it under its
Data Usage Agreement. **No FaciaVox loader was written/tested** (status: NOT IMPLEMENTED) because the data was not available.


## Traditional-ML pipeline filename pairing

For the current `src/bioguard_ml.py` training command, each participant must have at least 10 face images and 10 voice recordings with matching filename stems. For example, `face/session1_001.jpg` must pair with `voice/session1_001.wav`. The loader uses those shared stems to build early-fusion samples. The current split is 60/20/20 by sample stem per participant; use separate capture sessions and avoid near-duplicate frames across splits because session-aware splitting is not implemented yet.

Run `python -m scripts.run_ml_pipeline --dataset datasets/custom --output reports` after installing `requirements.txt`. No biometric dataset is included in Git, and no real-data performance results should be claimed until this command has completed successfully on consented data.
