import os
import time
import uuid
from datetime import datetime

import cv2
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_admin
from ..config import LOG_IMAGE_DIR
from ..database import get_db
from ..face_service import decode_base64_image, engine
from ..models import Admin, RecognitionLog, User
from ..registration import match_user
from ..settings_service import get_bool_setting

router = APIRouter(tags=["recognition"])

_last_log_ts = {}  # simple per-key dedupe cooldown (in-memory)


def _save_frame(img) -> str:
    LOG_IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"frame_{uuid.uuid4().hex[:10]}.jpg"
    cv2.imwrite(str(LOG_IMAGE_DIR / filename), img)
    return f"/api/logs/frame/{filename}"


def _cooldown_ok(key: str, seconds: float = 5.0) -> bool:
    now = time.time()
    if now - _last_log_ts.get(key, 0) < seconds:
        return False
    _last_log_ts[key] = now
    return True


def _process_frame(db: Session, image_bgr, source: str, log: bool, threshold: float | None = None):
    from ..settings_service import get_threshold

    threshold = threshold or get_threshold(db)
    faces = engine.detect_faces(image_bgr)
    results = []
    cooldown = float(get_bool_setting(db, "log_cooldown") and 5 or 0)

    for face in faces:
        emb = engine.compute_embedding(image_bgr, face)
        user, sim = match_user(db, emb)
        is_known = user is not None
        result = {
            "face_id": face["face_id"],
            "bbox": face["bbox"],
            "score": round(face["score"], 4),
            "similarity": round(sim, 4),
            "is_known": is_known,
            "matched_user": None,
        }
        if user is not None:
            result["matched_user"] = {
                "id": user.id,
                "name": user.name,
                "department": user.department,
                "designation": user.designation,
                "employee_id": user.employee_id,
                "photo_url": f"/api/users/{user.id}/photo" if user.photo_path else None,
            }

        if log:
            key = f"user_{user.id}" if user else "unknown"
            if cooldown and not _cooldown_ok(key, cooldown):
                pass
            else:
                frame_url = _save_frame(image_bgr) if not user else ""
                db.add(
                    RecognitionLog(
                        user_id=user.id if user else None,
                        name=user.name if user else "Unknown",
                        confidence=round(sim, 4),
                        is_known=is_known,
                        source=source,
                        frame_path=frame_url,
                        recognized_at=datetime.utcnow(),
                    )
                )
                db.commit()

        results.append(result)
    return results


@router.post("/api/recognize")
def recognize_upload(payload: dict, db: Session = Depends(get_db)):
    image = payload.get("image")
    source = payload.get("source", "upload")
    log = bool(payload.get("log", False))
    if not image:
        raise HTTPException(status_code=422, detail="No image provided")
    try:
        img = decode_base64_image(image)
    except Exception:
        raise HTTPException(status_code=422, detail="Invalid image data")

    results = _process_frame(db, img, source, log)
    return {"faces": results, "processed_at": datetime.utcnow(), "face_count": len(results)}


@router.post("/api/recognition/frame")
def recognize_frame(payload: dict, db: Session = Depends(get_db)):
    image = payload.get("image")
    source = payload.get("source", "webcam")
    log = bool(payload.get("log", False))
    if not image:
        raise HTTPException(status_code=422, detail="No image provided")
    try:
        img = decode_base64_image(image)
    except Exception:
        raise HTTPException(status_code=422, detail="Invalid image data")
    results = _process_frame(db, img, source, log)
    return {"faces": results, "processed_at": datetime.utcnow(), "face_count": len(results)}
