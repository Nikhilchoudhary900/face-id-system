import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/data/faceid.db")

SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production-face-id-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("TOKEN_EXPIRE_MINUTES", "480"))

MODEL_DIR = Path(os.getenv("MODEL_DIR", BASE_DIR / "models"))
YUNET_MODEL = MODEL_DIR / "face_detection_yunet.onnx"
SFACE_MODEL = MODEL_DIR / "face_recognition_sface.onnx"

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", BASE_DIR / "static" / "uploads"))
PHOTO_DIR = Path(os.getenv("PHOTO_DIR", BASE_DIR / "static" / "photos"))
LOG_IMAGE_DIR = Path(os.getenv("LOG_IMAGE_DIR", BASE_DIR / "static" / "log_frames"))

DEFAULT_SIMILARITY_THRESHOLD = float(os.getenv("FACE_THRESHOLD", "0.50"))
DEFAULT_AUTO_LOG_UNKNOWN = os.getenv("AUTO_LOG_UNKNOWN", "true").lower() == "true"
DEFAULT_CAMERA_FLIP = os.getenv("CAMERA_FLIP", "false").lower() == "true"

EMBEDDING_DIM = 128
