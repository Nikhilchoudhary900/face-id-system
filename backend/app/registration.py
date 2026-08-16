import logging

from sqlalchemy.orm import Session

from .face_service import decode_embedding, engine
from .models import User
from .settings_service import get_threshold


def build_registered_map(db: Session) -> dict:
    """Return {user_id: embedding} for all active users with embeddings."""
    users = db.query(User).filter(User.status == "active", User.embedding != "").all()
    registered = {}
    for u in users:
        try:
            registered[u.id] = decode_embedding(u.embedding)
        except Exception as exc:  # pragma: no cover
            logging.getLogger("faceid").warning("Bad embedding for user %s: %s", u.id, exc)
    return registered


def user_threshold(db: Session, user: User) -> float:
    if user.threshold_override is not None:
        return float(user.threshold_override)
    return get_threshold(db)


def match_user(db: Session, embedding) -> tuple:
    """Match an embedding to a registered user.

    Returns (user, similarity). user is None when no match.
    """
    registered = build_registered_map(db)
    threshold = get_threshold(db)
    uid, sim = engine.match_embedding(embedding, registered, threshold)
    if uid is None:
        return None, sim
    user = db.query(User).filter(User.id == uid).first()
    return user, sim
