import io

import cv2
import numpy as np
import soundfile as sf

from src.bioguard_ml import (
    calibrate_eer,
    evaluate,
    face_features,
    make_pairs,
    voice_features,
)


def test_face_extractor_produces_hog_and_lbp(tmp_path):
    image = np.random.default_rng(5).integers(0, 256, (180, 180), dtype=np.uint8)
    path = tmp_path / "face.png"
    assert cv2.imwrite(str(path), image)
    features = face_features(path)
    assert features["hog"].shape == (1764,)
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
