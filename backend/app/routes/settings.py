import base64
from datetime import datetime, timedelta
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_admin
from ..config import BASE_DIR
from ..database import get_db
from ..face_service import decode_base64_image, encode_embedding, engine
from ..models import Admin, RecognitionLog, Setting, User
from ..schemas import SettingsUpdate
from ..settings_service import get_all_settings, set_setting

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("")
def get_settings(db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    return get_all_settings(db)


@router.put("")
def update_settings(payload: SettingsUpdate, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    if payload.similarity_threshold is not None:
        set_setting(db, "similarity_threshold", str(payload.similarity_threshold))
    if payload.auto_log_unknown is not None:
        set_setting(db, "auto_log_unknown", str(payload.auto_log_unknown).lower())
    if payload.camera_flip is not None:
        set_setting(db, "camera_flip", str(payload.camera_flip).lower())
    return get_all_settings(db)


@router.post("/seed-users")
def seed_users(db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    """Create demo user profiles (no face embeddings) for testing the UI."""
    demo = [
        {"name": "Alice Johnson", "email": "alice@company.com", "employee_id": "EMP-1001", "department": "Engineering", "designation": "Software Engineer", "phone": "555-0101"},
        {"name": "Bob Smith", "email": "bob@company.com", "employee_id": "EMP-1002", "department": "Finance", "designation": "Accountant", "phone": "555-0102"},
        {"name": "Carol Davis", "email": "carol@company.com", "employee_id": "EMP-1003", "department": "HR", "designation": "HR Manager", "phone": "555-0103"},
        {"name": "David Wilson", "email": "david@company.com", "employee_id": "EMP-1004", "department": "Engineering", "designation": "DevOps Engineer", "phone": "555-0104"},
        {"name": "Emma Brown", "email": "emma@company.com", "employee_id": "EMP-1005", "department": "Sales", "designation": "Sales Executive", "phone": "555-0105"},
    ]
    created = 0
    for item in demo:
        exists = db.query(User).filter(User.employee_id == item["employee_id"]).first()
        if exists:
            continue
        user = User(**item)
        db.add(user)
        db.flush()
        # Register a real face for the first demo user so recognition works out of the box
        if item["employee_id"] == "EMP-1001":
            sample = Path(BASE_DIR / "static" / "samples" / "lena.jpg")
            if sample.exists():
                import cv2
                img = cv2.imread(str(sample))
                emb, _face = engine.compute_embedding_from_image(img)
                if emb is not None:
                    user.embedding = encode_embedding(emb)
                    user.sample_count = 1
                    user.photo_path = str(sample)
        created += 1
    db.commit()
    return {"status": "ok", "created": created}


@router.post("/seed-logs")
def seed_logs(db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    """Generate historical recognition logs so dashboards and reports have data."""
    users = db.query(User).filter(User.status == "active").all()
    if not users:
        raise HTTPException(status_code=400, detail="Create users first (seed users)")
    now = datetime.utcnow()
    created = 0
    # 14 days of synthetic activity
    for day_offset in range(14, -1, -1):
        # fewer logs on weekends
        day = now - timedelta(days=day_offset)
        if day.weekday() >= 5:
            entries = 6
        else:
            entries = 14 + (day_offset % 5) * 3
        for _ in range(entries):
            user = users[(created + day_offset) % len(users)]
            hour = 8 + (created * 7) % 12
            minute = (created * 13) % 60
            ts = day.replace(hour=hour, minute=minute, second=0, microsecond=0)
            is_known = (created % 10) < 9
            db.add(
                RecognitionLog(
                    user_id=user.id if is_known else None,
                    name=user.name if is_known else "Unknown",
                    confidence=round(0.72 + ((created % 20) / 100), 4) if is_known else 0.0,
                    is_known=is_known,
                    source="webcam",
                    recognized_at=ts,
                )
            )
            created += 1
    db.commit()
    return {"status": "ok", "created": created}


@router.post("/clear-logs")
def clear_logs(db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    db.query(RecognitionLog).delete()
    db.commit()
    return {"status": "ok", "cleared": True}
