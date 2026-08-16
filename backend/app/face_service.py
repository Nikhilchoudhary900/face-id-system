import base64
import io
import json
import logging

import cv2
import numpy as np
from PIL import Image

from .config import (
    YUNET_MODEL,
    SFACE_MODEL,
    EMBEDDING_DIM,
    DEFAULT_SIMILARITY_THRESHOLD,
)

logger = logging.getLogger("faceid.face")


def decode_base64_image(data: str) -> np.ndarray:
    """Decode a base64 data-url or raw base64 string into a BGR image."""
    if data.startswith("data:"):
        data = data.split(",", 1)[1]
    raw = base64.b64decode(data)
    pil = Image.open(io.BytesIO(raw)).convert("RGB")
    arr = np.array(pil)
    return cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)


def encode_embedding(embedding: np.ndarray) -> str:
    return json.dumps(np.asarray(embedding, dtype=np.float64).reshape(-1).tolist())


def decode_embedding(text: str) -> np.ndarray:
    return np.asarray(json.loads(text), dtype=np.float32)


class FaceEngine:
    """Deep learning face detection (YuNet) and recognition (SFace) engine."""

    def __init__(self):
        self._detector = None
        self._recognizer = None
        self.load()

    def load(self):
        if self._detector is None:
            self._detector = cv2.FaceDetectorYN_create(
                str(YUNET_MODEL), "", (320, 320)
            )
        if self._recognizer is None:
            self._recognizer = cv2.FaceRecognizerSF_create(str(SFACE_MODEL), "")

    def detect_faces(self, img: np.ndarray, score_threshold: float = 0.5):
        """Return list of dicts: bbox [x,y,w,h], landmarks, score."""
        self.load()
        h, w = img.shape[:2]
        self._detector.setInputSize((w, h))
        self._detector.setScoreThreshold(score_threshold)
        _, faces = self._detector.detect(img)
        results = []
        if faces is not None:
            for i in range(faces.shape[0]):
                row = faces[i]
                x, y, fw, fh = int(row[0]), int(row[1]), int(row[2]), int(row[3])
                landmarks = [(float(row[4 + j * 2]), float(row[4 + j * 2 + 1])) for j in range(5)]
                results.append(
                    {
                        "face_id": i,
                        "bbox": [x, y, fw, fh],
                        "landmarks": landmarks,
                        "score": float(row[14]),
                    }
                )
        return results

    def compute_embedding(self, img: np.ndarray, face: dict) -> np.ndarray:
        """Extract a 128-d facial embedding from a detected face."""
        self.load()
        row = np.zeros((1, 15), dtype=np.float32)
        x, y, fw, fh = face["bbox"]
        row[0, 0:4] = [x, y, fw, fh]
        for j, (lx, ly) in enumerate(face["landmarks"]):
            row[0, 4 + j * 2] = lx
            row[0, 4 + j * 2 + 1] = ly
        row[0, 14] = face["score"]
        aligned = self._recognizer.alignCrop(img, row)
        feature = self._recognizer.feature(aligned)
        emb = np.asarray(feature, dtype=np.float32).reshape(EMBEDDING_DIM)
        norm = np.linalg.norm(emb)
        return (emb / norm) if norm > 0 else emb

    def compute_embedding_from_image(self, img: np.ndarray, score_threshold: float = 0.5):
        """Detect the largest face in an image and return (embedding, face)."""
        faces = self.detect_faces(img, score_threshold)
        if not faces:
            return None, None
        faces.sort(key=lambda f: f["bbox"][2] * f["bbox"][3], reverse=True)
        face = faces[0]
        emb = self.compute_embedding(img, face)
        return emb, face

    @staticmethod
    def similarity(e1: np.ndarray, e2: np.ndarray) -> float:
        """Cosine similarity between two normalized embeddings in [0, 1]."""
        v = float(np.dot(e1, e2))
        return max(0.0, min(1.0, v))

    def match_embedding(self, embedding: np.ndarray, registered: dict, threshold: float):
        """Compare an embedding against a {user_id: embedding} map.

        Returns (user_id, similarity) best match or (None, 0.0).
        """
        best_id, best_sim = None, 0.0
        for uid, emb in registered.items():
            sim = self.similarity(embedding, emb)
            if sim > best_sim:
                best_id, best_sim = uid, sim
        if best_id is not None and best_sim >= threshold:
            return best_id, best_sim
        return None, best_sim


engine = FaceEngine()
