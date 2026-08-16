from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import create_access_token, get_current_admin, verify_password, hash_password
from ..database import get_db
from ..models import Admin
from ..schemas import LoginRequest, TokenResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    admin = db.query(Admin).filter(
        (Admin.username == payload.username) | (Admin.email == payload.username)
    ).first()
    if admin is None or not verify_password(payload.password, admin.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token = create_access_token(admin.username)
    return TokenResponse(
        access_token=token,
        admin={
            "id": admin.id,
            "username": admin.username,
            "email": admin.email,
            "role": admin.role,
        },
    )


@router.get("/me")
def me(admin: Admin = Depends(get_current_admin)):
    return {
        "id": admin.id,
        "username": admin.username,
        "email": admin.email,
        "role": admin.role,
        "created_at": admin.created_at,
    }


@router.put("/change-password")
def change_password(
    payload: dict,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    current = payload.get("current_password", "")
    new_password = payload.get("new_password", "")
    if not verify_password(current, admin.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(new_password) < 6:
        raise HTTPException(status_code=422, detail="New password must be at least 6 characters")
    admin.password_hash = hash_password(new_password)
    db.commit()
    return {"status": "ok", "message": "Password updated"}


@router.put("/change-username")
def change_username(
    payload: dict,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    new_username = (payload.get("new_username") or "").strip()
    if not new_username:
        raise HTTPException(status_code=422, detail="Username is required")
    exists = db.query(Admin).filter(Admin.username == new_username, Admin.id != admin.id).first()
    if exists:
        raise HTTPException(status_code=409, detail="Username already taken")
    admin.username = new_username
    db.commit()
    return {"status": "ok", "username": admin.username, "message": "Username updated"}


def ensure_default_admin(db: Session):
    """Create the default admin account on first run (only when no admin exists)."""
    count = db.query(Admin).count()
    if count == 0:
        db.add(Admin(username="admin", email="admin@faceid.local", password_hash=hash_password("admin123")))
        db.commit()
