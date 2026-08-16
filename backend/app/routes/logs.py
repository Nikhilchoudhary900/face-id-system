import csv
import io
import os
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..auth import get_current_admin
from ..config import LOG_IMAGE_DIR
from ..database import get_db
from ..models import Admin, RecognitionLog, User

router = APIRouter(prefix="/api/logs", tags=["logs"])


def _serialize_log(l: RecognitionLog) -> dict:
    return {
        "id": l.id,
        "user_id": l.user_id,
        "name": l.name,
        "confidence": l.confidence,
        "is_known": l.is_known,
        "source": l.source,
        "frame_url": l.frame_path or None,
        "recognized_at": l.recognized_at,
    }


@router.get("")
def list_logs(
    q: str = "",
    known: str = "",
    source: str = "",
    date_from: str = "",
    date_to: str = "",
    page: int = Query(1, ge=1),
    per_page: int = Query(30, ge=1, le=200),
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin),
):
    query = db.query(RecognitionLog)
    if q:
        like = f"%{q}%"
        query = query.filter(or_(RecognitionLog.name.ilike(like)))
    if known in ("true", "false"):
        query = query.filter(RecognitionLog.is_known == (known == "true"))
    if source:
        query = query.filter(RecognitionLog.source == source)
    if date_from:
        try:
            dt = datetime.fromisoformat(date_from)
            query = query.filter(RecognitionLog.recognized_at >= dt)
        except ValueError:
            pass
    if date_to:
        try:
            dt = datetime.fromisoformat(date_to)
            query = query.filter(RecognitionLog.recognized_at <= dt)
        except ValueError:
            pass
    total = query.count()
    items = (
        query.order_by(RecognitionLog.recognized_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    return {"total": total, "page": page, "per_page": per_page, "items": [_serialize_log(l) for l in items]}


@router.get("/export")
def export_logs(
    q: str = "",
    known: str = "",
    source: str = "",
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin),
):
    query = db.query(RecognitionLog)
    if q:
        query = query.filter(RecognitionLog.name.ilike(f"%{q}%"))
    if known in ("true", "false"):
        query = query.filter(RecognitionLog.is_known == (known == "true"))
    if source:
        query = query.filter(RecognitionLog.source == source)
    logs = query.order_by(RecognitionLog.recognized_at.desc()).all()

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["ID", "Timestamp", "Name", "User ID", "Confidence", "Status", "Source"])
    for l in logs:
        writer.writerow(
            [
                l.id,
                l.recognized_at.strftime("%Y-%m-%d %H:%M:%S") if l.recognized_at else "",
                l.name,
                l.user_id or "",
                round(l.confidence, 4),
                "Known" if l.is_known else "Unknown",
                l.source,
            ]
        )
    buffer.seek(0)
    filename = f"recognition_logs_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/frame/{filename}")
def get_frame(filename: str, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    safe = os.path.basename(filename)
    path = LOG_IMAGE_DIR / safe
    if not path.exists():
        raise HTTPException(status_code=404, detail="Frame not found")
    return FileResponse(path, media_type="image/jpeg")
