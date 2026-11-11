"""Traditional-ML biometric research pipeline for BioGuard X.

No deep-learning models are used. This module is a new implementation because
the original training/model source files are absent from both repository branches.
It requires consented, paired face/voice samples with matching file stems.
"""
from __future__ import annotations

import argparse
import itertools
import json
import random
from pathlib import Path

import cv2
import joblib
import numpy as np
import soundfile as sf
from scipy.fft import dct
from scipy.signal import resample_poly
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score, confusion_matrix, f1_score, precision_score,
    recall_score, roc_auc_score, roc_curve,
)
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp"}
AUDIO_EXTENSIONS = {".wav", ".flac", ".ogg"}


def face_features(path: str | Path) -> dict[str, np.ndarray]:
    raw = np.fromfile(str(path), dtype=np.uint8)
    image = cv2.imdecode(raw, cv2.IMREAD_GRAYSCALE)
    if image is None or image.size == 0 or min(image.shape) < 64:
        raise ValueError(f"Invalid or too-small face image: {path}")
    if image.size > 25_000_000:
        raise ValueError(f"Face image exceeds the pixel limit: {path}")
    image = cv2.equalizeHist(cv2.resize(image, (128, 128), interpolation=cv2.INTER_AREA))
    hog = cv2.HOGDescriptor((128, 128), (16, 16), (8, 8), (8, 8), 9)
    hog_vector = hog.compute(image).reshape(-1).astype(np.float32)

    center = image[1:-1, 1:-1]
    neighbors = (
        image[:-2, :-2], image[:-2, 1:-1], image[:-2, 2:],
        image[1:-1, 2:], image[2:, 2:], image[2:, 1:-1],
        image[2:, :-2], image[1:-1, :-2],
    )
    lbp = np.zeros(center.shape, dtype=np.uint8)
    for bit, neighbor in enumerate(neighbors):
        lbp |= ((neighbor >= center).astype(np.uint8) << bit)
    histogram = np.bincount(lbp.ravel(), minlength=256).astype(np.float32)
    histogram /= max(float(histogram.sum()), 1.0)
    return {"hog": hog_vector, "lbp": histogram}


def voice_features(path: str | Path) -> np.ndarray:
    audio, sample_rate = sf.read(str(path), dtype="float32", always_2d=True)
    if audio.size == 0 or sample_rate < 8000 or not np.isfinite(audio).all():
        raise ValueError(f"Invalid voice recording: {path}")
    signal = audio.mean(axis=1)
    if len(signal) < sample_rate // 2:
        raise ValueError(f"Voice recording must be at least 0.5 seconds: {path}")
    if sample_rate != 16000:
        divisor = int(np.gcd(sample_rate, 16000))
        signal = resample_poly(signal, 16000 // divisor, sample_rate // divisor)
    signal = np.append(signal[0], signal[1:] - 0.97 * signal[:-1])
    frame_length, hop = 400, 160
    if len(signal) < frame_length:
        raise ValueError(f"Voice recording is too short: {path}")
    frames = np.stack([
        signal[i:i + frame_length]
        for i in range(0, len(signal) - frame_length + 1, hop)
    ])
    frames = frames * np.hamming(frame_length).astype(np.float32)
    power = np.abs(np.fft.rfft(frames, n=512)) ** 2
    mel = lambda hz: 2595.0 * np.log10(1.0 + hz / 700.0)
    hz = lambda value: 700.0 * (10.0 ** (value / 2595.0) - 1.0)
    points = hz(np.linspace(mel(0), mel(8000), 28))
    bins = np.floor(513 * points / 16000).astype(int)
    filters = np.zeros((26, 257), dtype=np.float32)
    for index in range(1, 27):
        left, middle, right = bins[index - 1:index + 2]
        for k in range(max(0, left), min(middle, 257)):
            filters[index - 1, k] = (k - left) / max(1, middle - left)
        for k in range(max(0, middle), min(right, 257)):
            filters[index - 1, k] = (right - k) / max(1, right - middle)
    energies = np.log(np.maximum(power @ filters.T, 1e-10))
    mfcc = dct(energies, type=2, axis=1, norm="ortho")[:, :13]
    zcr = np.mean(np.abs(np.diff(np.signbit(frames), axis=1)), axis=1)
    rms = np.sqrt(np.mean(frames ** 2, axis=1))
    result = np.concatenate((
        mfcc.mean(axis=0), mfcc.std(axis=0),
        [zcr.mean(), zcr.std(), rms.mean(), rms.std()],
    )).astype(np.float32)
    if not np.isfinite(result).all():
        raise ValueError(f"Voice features are not finite: {path}")
    return result


def _split_stems(stems: list[str], seed: int) -> dict[str, set[str]]:
    if len(stems) < 10:
        raise ValueError("Each participant needs at least 10 matched face/voice samples for disjoint train/validation/test pair evaluation.")
    shuffled = sorted(stems)
    random.Random(seed).shuffle(shuffled)
    n = len(shuffled)
    train_end = max(2, int(n * 0.6))
    validation_end = max(train_end + 1, int(n * 0.8))
    validation_end = min(validation_end, n - 1)
    return {
        "train": set(shuffled[:train_end]),
        "validation": set(shuffled[train_end:validation_end]),
        "test": set(shuffled[validation_end:]),
    }


def load_paired_dataset(root: str | Path, seed: int = 42) -> dict[str, list[dict]]:
    """Load matched face/voice files; matching filename stems pair the same session."""
    root = Path(root)
    participants = sorted(p for p in root.glob("participant_*") if p.is_dir())
    if len(participants) < 2:
        raise ValueError("At least two participant_* folders are required.")
    splits: dict[str, list[dict]] = {"train": [], "validation": [], "test": []}
    for participant in participants:
        face_dir, voice_dir = participant / "face", participant / "voice"
        faces = {p.stem: p for p in face_dir.iterdir() if p.is_file() and p.suffix.lower() in IMAGE_EXTENSIONS} if face_dir.exists() else {}
        voices = {p.stem: p for p in voice_dir.iterdir() if p.is_file() and p.suffix.lower() in AUDIO_EXTENSIONS} if voice_dir.exists() else {}
        common = sorted(set(faces) & set(voices))
        assigned = _split_stems(common, seed)
        for split_name, stems in assigned.items():
            for stem in sorted(stems):
                face = face_features(faces[stem])
                voice = voice_features(voices[stem])
                splits[split_name].append({
                    "identity": participant.name,
                    "sample_id": stem,
                    "hog": face["hog"],
                    "lbp": face["lbp"],
                    "face": np.concatenate((face["hog"], face["lbp"])),
                    "voice": voice,
                })
    for name, records in splits.items():
        if len({r["identity"] for r in records}) < 2:
            raise ValueError(f"The {name} split needs samples from at least two participants.")
    return splits


def make_pairs(records: list[dict], feature_key: str) -> tuple[np.ndarray, np.ndarray, list[tuple[str, str]]]:
    by_identity: dict[str, list[dict]] = {}
    for record in records:
        by_identity.setdefault(record["identity"], []).append(record)
    identities = sorted(by_identity)
    genuine, impostor = [], []
    for identity in identities:
        genuine.extend(
            (a, b) for a, b in itertools.combinations(by_identity[identity], 2)
        )
    for i, first in enumerate(identities):
        for second in identities[i + 1:]:
            impostor.extend((a, b) for a in by_identity[first] for b in by_identity[second])
    count = min(len(genuine), len(impostor), 10000)
    if count < 2:
        raise ValueError("Not enough genuine and impostor pairs; add more samples per participant.")
    rng = random.Random(42)
    genuine = rng.sample(genuine, count)
    impostor = rng.sample(impostor, count)
    pairs = genuine + impostor
    labels = np.asarray([1] * count + [0] * count, dtype=np.int32)
    differences = np.stack([
        np.abs(a[feature_key] - b[feature_key]) for a, b in pairs
    ]).astype(np.float32)
    identities_for_pairs = [(a["identity"], b["identity"]) for a, b in pairs]
    return differences, labels, identities_for_pairs


def calibrate_eer(y_true: np.ndarray, scores: np.ndarray) -> tuple[float, float]:
    fpr, tpr, thresholds = roc_curve(y_true, scores)
    fnr = 1.0 - tpr
    index = int(np.nanargmin(np.abs(fpr - fnr)))
    return float(thresholds[index]), float((fpr[index] + fnr[index]) / 2.0)


def evaluate(y_true: np.ndarray, scores: np.ndarray, threshold: float) -> dict:
    predicted = (scores >= threshold).astype(np.int32)
    tn, fp, fn, tp = confusion_matrix(y_true, predicted, labels=[0, 1]).ravel()
    fpr, tpr, _ = roc_curve(y_true, scores)
    eer_index = int(np.nanargmin(np.abs(fpr - (1.0 - tpr))))
    return {
        "threshold": float(threshold),
        "accuracy": float(accuracy_score(y_true, predicted)),
        "precision": float(precision_score(y_true, predicted, zero_division=0)),
        "recall": float(recall_score(y_true, predicted, zero_division=0)),
        "f1": float(f1_score(y_true, predicted, zero_division=0)),
        "far": float(fp / max(fp + tn, 1)),
        "frr": float(fn / max(fn + tp, 1)),
        "eer": float((fpr[eer_index] + 1.0 - tpr[eer_index]) / 2.0),
        "roc_auc": float(roc_auc_score(y_true, scores)),
        "confusion_matrix": [[int(tn), int(fp)], [int(fn), int(tp)]],
    }


def train_pipeline(dataset_root: str | Path, output_dir: str | Path, seed: int = 42) -> dict:
    splits = load_paired_dataset(dataset_root, seed)
    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)
    bundle, report = {}, {
        "dataset": str(Path(dataset_root)),
        "split_counts": {key: len(value) for key, value in splits.items()},
        "protocol": "per-participant disjoint sample files; pairs built separately within each split; matching face/voice filename stems; validation EER threshold",
        "models": {},
        "hierarchical": {},
    }
    keys = ("hog", "lbp", "face", "voice", "early_fusion")
    for key in keys:
        train_records, val_records, test_records = (splits[s] for s in ("train", "validation", "test"))
        if key == "early_fusion":
            for records in (train_records, val_records, test_records):
                for record in records:
                    record["early_fusion"] = np.concatenate((record["face"], record["voice"]))
        x_train, y_train, _ = make_pairs(train_records, key)
        x_val, y_val, _ = make_pairs(val_records, key)
        x_test, y_test, _ = make_pairs(test_records, key)
        estimators = {
            "SVM": make_pipeline(StandardScaler(), CalibratedClassifierCV(SVC(C=1.0, kernel="rbf", class_weight="balanced", random_state=seed), cv=3, method="sigmoid", ensemble=False)),
            "RandomForest": RandomForestClassifier(n_estimators=100, min_samples_leaf=2, class_weight="balanced", random_state=seed, n_jobs=-1),
        }
        bundle[key] = {}
        report["models"][key] = {}
        for model_name, model in estimators.items():
            model.fit(x_train, y_train)
            val_scores = model.predict_proba(x_val)[:, 1]
            threshold, validation_eer = calibrate_eer(y_val, val_scores)
            test_scores = model.predict_proba(x_test)[:, 1]
            metrics = evaluate(y_test, test_scores, threshold)
            metrics["validation_eer"] = validation_eer
            report["models"][key][model_name] = metrics
            bundle[key][model_name] = {"model": model, "threshold": threshold}

    face_model = bundle["face"]["SVM"]
    voice_model = bundle["voice"]["SVM"]
    face_val, _, _ = make_pairs(splits["validation"], "face")
    face_test, test_y, _ = make_pairs(splits["test"], "face")
    voice_test, _, _ = make_pairs(splits["test"], "voice")
    face_scores = face_model["model"].predict_proba(face_test)[:, 1]
    voice_scores = voice_model["model"].predict_proba(voice_test)[:, 1]
    face_threshold = face_model["threshold"]
    voice_threshold = voice_model["threshold"]
    face_validation_scores = face_model["model"].predict_proba(face_val)[:, 1]
    margin = max(0.05, float(np.quantile(np.abs(face_validation_scores - face_threshold), 0.25)))
    hierarchical = np.where(
        face_scores >= face_threshold + margin, 1,
        np.where(face_scores <= face_threshold - margin, 0, (voice_scores >= voice_threshold).astype(int)),
    )
    tn, fp, fn, tp = confusion_matrix(test_y, hierarchical, labels=[0, 1]).ravel()
    hierarchy_metrics = evaluate(test_y, hierarchical.astype(np.float32), 0.5)
    report["hierarchical"] = {
        **hierarchy_metrics,
        "uncertainty_margin": margin,
        "face_first_then_voice": True,
    }
    bundle["hierarchical"] = {"face_threshold": face_threshold, "voice_threshold": voice_threshold, "uncertainty_margin": margin}
    bundle["protocol"] = report["protocol"]
    bundle["feature_version"] = "bioguard-traditional-v1"
    joblib.dump(bundle, output / "bioguard_traditional_ml.joblib")
    (output / "metrics.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description="Train/evaluate BioGuard X traditional-ML biometric models.")
    parser.add_argument("--dataset", default="datasets/custom")
    parser.add_argument("--output", default="reports")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    report = train_pipeline(args.dataset, args.output, args.seed)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
