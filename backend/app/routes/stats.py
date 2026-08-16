from collections import Counter
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..auth import get_current_admin
from ..database import get_db
from ..models import Admin, RecognitionLog, User

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("/overview")
def overview(db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    now = datetime.utcnow()
    start_today = now.replace(hour=0, minute=0, second=0, microsecond=0)

    total_users = db.query(func.count(User.id)).scalar() or 0
    active_users = (
        db.query(func.count(User.id)).filter(User.status == "active").scalar() or 0
    )
    total_recognitions = db.query(func.count(RecognitionLog.id)).scalar() or 0
    known_today = (
        db.query(func.count(RecognitionLog.id))
        .filter(RecognitionLog.is_known == True, RecognitionLog.recognized_at >= start_today)
        .scalar() or 0
    )
    unknown_today = (
        db.query(func.count(RecognitionLog.id))
        .filter(RecognitionLog.is_known == False, RecognitionLog.recognized_at >= start_today)
        .scalar() or 0
    )
    recognitions_today = known_today + unknown_today
    accuracy_today = round((known_today / recognitions_today) * 100, 1) if recognitions_today else 100.0

    dept_rows = (
        db.query(User.department, func.count(User.id))
        .group_by(User.department)
        .all()
    )
    users_by_department = [{"department": d or "General", "count": c} for d, c in dept_rows]

    activity = []
    for hour_offset in range(23, -1, -1):
        hour_start = now - timedelta(hours=hour_offset + 1)
        hour_end = now - timedelta(hours=hour_offset)
        count = (
            db.query(func.count(RecognitionLog.id))
            .filter(RecognitionLog.recognized_at >= hour_start, RecognitionLog.recognized_at < hour_end)
            .scalar() or 0
        )
        activity.append({"hour": hour_start.strftime("%Y-%m-%dT%H:00"), "count": count})

    return {
        "total_users": total_users,
        "active_users": active_users,
        "inactive_users": total_users - active_users,
        "total_recognitions": total_recognitions,
        "recognitions_today": recognitions_today,
        "known_today": known_today,
        "unknown_today": unknown_today,
        "accuracy_today": accuracy_today,
        "users_by_department": users_by_department,
        "activity_24h": activity,
    }


@router.get("/reports")
def reports(
    days: int = Query(7, ge=1, le=90),
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin),
):
    start = datetime.utcnow() - timedelta(days=days - 1)
    start = start.replace(hour=0, minute=0, second=0, microsecond=0)

    rows = (
        db.query(
            func.strftime("%Y-%m-%d", RecognitionLog.recognized_at).label("day"),
            RecognitionLog.is_known,
            func.count(RecognitionLog.id),
        )
        .filter(RecognitionLog.recognized_at >= start)
        .group_by("day", RecognitionLog.is_known)
        .all()
    )
    daily = {}
    for day, is_known, cnt in rows:
        daily.setdefault(day, {"known": 0, "unknown": 0})
        daily[day]["known" if is_known else "unknown"] += cnt

    daily_series = []
    for i in range(days):
        day = (start + timedelta(days=i)).strftime("%Y-%m-%d")
        d = daily.get(day, {"known": 0, "unknown": 0})
        daily_series.append(
            {
                "date": day,
                "known": d["known"],
                "unknown": d["unknown"],
                "total": d["known"] + d["unknown"],
            }
        )

    hourly_rows = (
        db.query(
            func.strftime("%H", RecognitionLog.recognized_at).label("hour"),
            func.count(RecognitionLog.id),
        )
        .filter(RecognitionLog.recognized_at >= start)
        .group_by("hour")
        .all()
    )
    hourly = [{"hour": h or "00", "count": c} for h, c in hourly_rows]

    top_rows = (
        db.query(RecognitionLog.name, func.count(RecognitionLog.id))
        .filter(RecognitionLog.is_known == True, RecognitionLog.recognized_at >= start)
        .group_by(RecognitionLog.name)
        .order_by(func.count(RecognitionLog.id).desc())
        .limit(10)
        .all()
    )
    top_users = [{"name": n or "Unknown", "count": c} for n, c in top_rows]

    return {
        "daily": daily_series,
        "hourly": hourly,
        "top_users": top_users,
        "range": {"days": days},
    }
