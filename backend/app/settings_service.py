from sqlalchemy.orm import Session

from .config import (
    DEFAULT_SIMILARITY_THRESHOLD,
    DEFAULT_AUTO_LOG_UNKNOWN,
    DEFAULT_CAMERA_FLIP,
)
from .models import Setting

BOOL_DEFAULTS = {
    "auto_log_unknown": DEFAULT_AUTO_LOG_UNKNOWN,
    "camera_flip": DEFAULT_CAMERA_FLIP,
}


def _get(db: Session, key: str, default: str) -> str:
    row = db.query(Setting).filter(Setting.key == key).first()
    return row.value if row else default


def get_threshold(db: Session) -> float:
    try:
        return float(_get(db, "similarity_threshold", str(DEFAULT_SIMILARITY_THRESHOLD)))
    except ValueError:
        return DEFAULT_SIMILARITY_THRESHOLD


def get_bool_setting(db: Session, key: str) -> bool:
    default = BOOL_DEFAULTS.get(key, True)
    raw = _get(db, key, "true" if default else "false")
    return raw.lower() in ("true", "1", "yes")


def set_setting(db: Session, key: str, value: str):
    row = db.query(Setting).filter(Setting.key == key).first()
    if row is None:
        row = Setting(key=key, value=str(value))
        db.add(row)
    else:
        row.value = str(value)
    db.commit()
    return row


def get_all_settings(db: Session) -> dict:
    return {
        "similarity_threshold": get_threshold(db),
        "auto_log_unknown": get_bool_setting(db, "auto_log_unknown"),
        "camera_flip": get_bool_setting(db, "camera_flip"),
    }
