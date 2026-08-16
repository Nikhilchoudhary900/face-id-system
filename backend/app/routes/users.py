import os
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..auth import get_current_admin
from ..config import PHOTO_DIR
from ..database import get_db
from ..face_service import decode_base64_image, encode_embedding, engine
from ..models import Admin, User
from ..registration import build_registered_map, match_user
from ..schemas import UserCreate, UserOut, UserUpdate

router = APIRouter(prefix="/api/users", tags=["users"])


def _serialize_user(u: User) -> dict:
    return {
        "id": u.id,
        "name": u.name,
        "email": u.email,
        "employee_id": u.employee_id,
        "department": u.department,
        "designation": u.designation,
        "phone": u.phone,
        "status": u.status,
        "sample_count": u.sample_count,
        "threshold_override": u.threshold_override,
        "has_embedding": bool(u.embedding),
        "photo_url": f"/api/users/{u.id}/photo" if u.photo_path else None,
        "created_at": u.created_at,
        "updated_at": u.updated_at,
    }


def _save_photo(image_bgr, user_id: int) -> str:
    PHOTO_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"u{user_id}_{uuid.uuid4().hex[:8]}.jpg"
    path = PHOTO_DIR / filename
    os.makedirs(PHOTO_DIR, exist_ok=True)
    import cv2

    cv2.imwrite(str(path), image_bgr)
    return str(path)


@router.get("")
def list_users(
    q: str = "",
    status_filter: str = "",
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin),
):
    query = db.query(User)
    if q:
        like = f"%{q}%"
        query = query.filter(
            or_(
                User.name.ilike(like),
                User.email.ilike(like),
                User.employee_id.ilike(like),
                User.department.ilike(like),
            )
        )
    if status_filter:
        query = query.filter(User.status == status_filter)
    total = query.count()
    users = (
        query.order_by(User.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    return {"total": total, "items": [_serialize_user(u) for u in users]}


@router.get("/{user_id}", response_model=dict)
def get_user(user_id: int, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    u = db.query(User).filter(User.id == user_id).first()
    if u is None:
        raise HTTPException(status_code=404, detail="User not found")
    return _serialize_user(u)


@router.post("", status_code=201)
def create_user(
    payload: dict,
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin),
):
    if not payload.get("name"):
        raise HTTPException(status_code=422, detail="Name is required")

    if payload.get("email"):
        exists = db.query(User).filter(User.email == payload["email"]).first()
        if exists:
            raise HTTPException(status_code=409, detail="Email already registered")

    u = User(
        name=payload["name"].strip(),
        email=payload.get("email") or None,
        employee_id=payload.get("employee_id") or None,
        department=payload.get("department") or "General",
        designation=payload.get("designation") or "Member",
        phone=payload.get("phone") or "",
        status=payload.get("status", "active"),
    )
    db.add(u)
    db.commit()
    db.refresh(u)

    image_data = payload.get("image")
    if image_data:
        try:
            _register_face(db, u, image_data)
        except HTTPException:
            db.delete(u)
            db.commit()
            raise

    db.refresh(u)
    return _serialize_user(u)


@router.put("/{user_id}")
def update_user(
    user_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin),
):
    u = db.query(User).filter(User.id == user_id).first()
    if u is None:
        raise HTTPException(status_code=404, detail="User not found")

    if payload.get("email") and payload["email"] != u.email:
        exists = db.query(User).filter(User.email == payload["email"], User.id != user_id).first()
        if exists:
            raise HTTPException(status_code=409, detail="Email already registered")

    for field in ("name", "email", "employee_id", "department", "designation", "phone", "status", "threshold_override"):
        if field in payload and payload[field] is not None:
            setattr(u, field, payload[field])
    u.updated_at = datetime.utcnow()

    if payload.get("image"):
        _register_face(db, u, payload["image"])

    db.commit()
    db.refresh(u)
    return _serialize_user(u)


@router.delete("/{user_id}", status_code=204)
def delete_user(user_id: int, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    u = db.query(User).filter(User.id == user_id).first()
    if u is None:
        raise HTTPException(status_code=404, detail="User not found")
    if u.photo_path and os.path.exists(u.photo_path):
        try:
            os.remove(u.photo_path)
        except OSError:
            pass
    db.delete(u)
    db.commit()
    return None


@router.post("/{user_id}/faces", status_code=200)
def register_face(
    user_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin),
):
    u = db.query(User).filter(User.id == user_id).first()
    if u is None:
        raise HTTPException(status_code=404, detail="User not found")

    images = payload.get("images") or []
    if not images:
        raise HTTPException(status_code=422, detail="At least one face image is required")

    embeddings = []
    for img_data in images:
        try:
            img = decode_base64_image(img_data)
        except Exception:
            raise HTTPException(status_code=422, detail="Invalid image data")
        emb, face = engine.compute_embedding_from_image(img)
        if emb is None:
            raise HTTPException(status_code=422, detail="No face detected in one of the images")
        embeddings.append(emb)

    avg = sum(embeddings) / len(embeddings)
    avg = avg / (np_norm(avg) or 1.0)
    u.embedding = encode_embedding(avg)
    u.sample_count = len(embeddings)
    u.updated_at = datetime.utcnow()

    if images:
        try:
            first_img = decode_base64_image(images[0])
            u.photo_path = _save_photo(first_img, u.id)
        except Exception:
            pass

    db.commit()
    db.refresh(u)
    return {"status": "ok", "sample_count": u.sample_count, "user": _serialize_user(u)}


@router.get("/{user_id}/photo")
def get_photo(user_id: int, db: Session = Depends(get_db)):
    u = db.query(User).filter(User.id == user_id).first()
    if u is None or not u.photo_path or not os.path.exists(u.photo_path):
        raise HTTPException(status_code=404, detail="No photo")
    return FileResponse(u.photo_path, media_type="image/jpeg")


def _register_face(db: Session, user: User, image_data: str):
    try:
        img = decode_base64_image(image_data)
    except Exception:
        raise HTTPException(status_code=422, detail="Invalid image data")
    emb, face = engine.compute_embedding_from_image(img)
    if emb is None:
        raise HTTPException(status_code=422, detail="No face detected in the uploaded image")
    user.embedding = encode_embedding(emb)
    user.sample_count = 1
    user.updated_at = datetime.utcnow()
    user.photo_path = _save_photo(img, user.id)
    db.commit()


def np_norm(v):
    return float(sum(x * x for x in v) ** 0.5)
