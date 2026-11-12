# Installation (Windows 10/11, Python 3.12)

1. Create and activate a virtual environment:

   ```powershell
   py -3.12 -m venv .venv
   .venv\Scripts\Activate.ps1
   ```

2. Install the dependencies used by the current API and traditional-ML pipeline:

   ```powershell
   python -m pip install --upgrade pip
   pip install -r requirements.txt
   ```

3. Run automated tests:

   ```powershell
   python -m pytest tests -q
   ```

4. Add consented, matched face/voice samples under `datasets/custom/participant_XXX/{face,voice}/`. See [DATASET_GUIDE.md](DATASET_GUIDE.md) and [ML_PIPELINE.md](ML_PIPELINE.md).

5. Train and evaluate the traditional-ML research models:

   ```powershell
   python -m scripts.run_ml_pipeline --dataset datasets/custom --output reports
   ```

6. Start the experimental API:

   ```powershell
   $env:BIOGUARD_API_TOKEN = "replace-with-a-long-random-secret"
   $env:BIOGUARD_ENCRYPTION_KEY = (python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
   uvicorn api.main:app --reload
   ```

7. In a second terminal, serve the Vanilla JS frontend:

   ```powershell
   cd frontend
   py -m http.server 5500
   ```

   Open `http://localhost:5500`.

Keep the encryption key stable between restarts and back it up securely. Never commit secrets or real biometric data. The experimental API loads a trusted, versioned model bundle from `BIOGUARD_MODEL_PATH` (default: `reports/bioguard_traditional_ml.joblib`). No trained bundle or consented biometric dataset is included in this repository, so verification remains NOT EVALUATED until a compatible bundle is trained and supplied. Even with a bundle, results are experimental and policy remains PENDING; no access decision is made. This API adapter does not restore the missing original research services or Streamlit application. Do not use this prototype for real access-control decisions.
