import io

import cv2
import numpy as np
import soundfile as sf

from src.bioguard_ml import (
    calibrate_eer,
    evaluate,
    face_features,
    fingerprint_features,
    make_pairs,
    voice_features,
    train_pipeline,
)


def test_face_extractor_produces_hog_and_lbp(tmp_path):
    image = np.random.default_rng(5).integers(0, 256, (180, 180), dtype=np.uint8)
    path = tmp_path / "face.png"
    assert cv2.imwrite(str(path), image)
    features = face_features(path)
    assert features["hog"].shape == (8100,)
    assert features["lbp"].shape == (256,)
    assert np.isfinite(features["hog"]).all()
    assert np.isfinite(features["lbp"]).all()
    assert np.isclose(features["lbp"].sum(), 1.0)


def test_voice_extractor_includes_mfcc_zcr_and_rms(tmp_path):
    sample_rate = 16000
    time = np.arange(sample_rate, dtype=np.float32) / sample_rate
    signal = (0.2 * np.sin(2 * np.pi * 220 * time)).astype(np.float32)
    path = tmp_path / "voice.wav"
    sf.write(path, signal, sample_rate)
    features = voice_features(path)
    assert features.shape == (30,)
    assert np.isfinite(features).all()
    assert features[-2] > 0


def test_pair_builder_balances_genuine_and_impostor_trials():
    records = []
    for identity, offset in (("participant_001", 0.0), ("participant_002", 5.0)):
        for index in range(3):
            records.append({
                "identity": identity,
                "sample_id": str(index),
                "vector": np.asarray([offset + index, offset + index + 1], dtype=np.float32),
            })
    x, y, pairs = make_pairs(records, "vector")
    assert x.shape == (12, 2)
    assert y.shape == (12,)
    assert int((y == 1).sum()) == int((y == 0).sum()) == 6
    assert len(pairs) == 12


def test_eer_calibration_and_report_metrics_are_finite():
    labels = np.asarray([0, 0, 0, 1, 1, 1], dtype=np.int32)
    scores = np.asarray([0.05, 0.10, 0.20, 0.80, 0.90, 0.95], dtype=np.float32)
    threshold, eer = calibrate_eer(labels, scores)
    report = evaluate(labels, scores, threshold)
    assert 0.0 <= threshold <= 1.0
    assert 0.0 <= eer <= 1.0
    for key in ("accuracy", "precision", "recall", "f1", "far", "frr", "eer", "roc_auc"):
        assert np.isfinite(report[key])
    assert report["confusion_matrix"] == [[3, 0], [0, 3]]



def test_training_pipeline_smoke_with_synthetic_paired_data(tmp_path):
    dataset = tmp_path / "dataset"
    for participant_index, frequency in ((1, 220), (2, 440)):
        participant = dataset / f"participant_{participant_index:03d}"
        face_dir, voice_dir, fingerprint_dir = participant / "face", participant / "voice", participant / "fingerprint"
        face_dir.mkdir(parents=True)
        voice_dir.mkdir(parents=True)
        fingerprint_dir.mkdir(parents=True)
        for sample_index in range(10):
            rng = np.random.default_rng(participant_index * 100 + sample_index)
            image = rng.integers(0, 256, (160, 160), dtype=np.uint8)
            image = np.clip(image.astype(np.int16) + participant_index * 8, 0, 255).astype(np.uint8)
            assert cv2.imwrite(str(face_dir / f"sample_{sample_index:03d}.png"), image)
            sample_rate = 16000
            time = np.arange(sample_rate, dtype=np.float32) / sample_rate
            signal = 0.2 * np.sin(2 * np.pi * (frequency + sample_index) * time)
            signal += rng.normal(0, 0.005, size=sample_rate).astype(np.float32)
            sf.write(voice_dir / f"sample_{sample_index:03d}.wav", signal.astype(np.float32), sample_rate)
            fingerprint = rng.integers(0, 256, (160, 160), dtype=np.uint8)
            assert cv2.imwrite(str(fingerprint_dir / f"sample_{sample_index:03d}.png"), fingerprint)

    output = tmp_path / "reports"
    report = train_pipeline(dataset, output, seed=7)
    assert set(report["models"]) == {"hog", "lbp", "face", "voice", "early_fusion", "fingerprint", "multimodal_fusion"}
    assert set(report["models"]["face"]) == {"SVM", "RandomForest"}
    assert set(report["models"]["voice"]) == {"SVM", "RandomForest"}
    assert set(report["models"]["fingerprint"]) == {"SVM", "RandomForest"}
    assert set(report["models"]["multimodal_fusion"]) == {"SVM", "RandomForest"}
    assert report["hierarchical"]["face_first_then_voice"] is True
    assert (output / "bioguard_traditional_ml.joblib").is_file()
    assert (output / "metrics.json").is_file()


def test_fingerprint_extractor_returns_24_finite_features(tmp_path):
    image = np.random.default_rng(29).integers(0, 256, (160, 160), dtype=np.uint8)
    path = tmp_path / "fingerprint.png"
    assert cv2.imwrite(str(path), image)
    features = fingerprint_features(path)
    assert features.shape == (24,)
    assert np.isfinite(features).all()
