from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    admin: dict


class UserBase(BaseModel):
    name: str
    email: Optional[str] = None
    employee_id: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    phone: Optional[str] = None
    status: str = "active"
    threshold_override: Optional[float] = None


class UserCreate(UserBase):
    pass


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    employee_id: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    phone: Optional[str] = None
    status: Optional[str] = None
    threshold_override: Optional[float] = None


class UserOut(UserBase):
    id: int
    photo_url: Optional[str] = None
    sample_count: int
    has_embedding: bool
    created_at: datetime
    updated_at: Optional[datetime] = None


class RecognizeRequest(BaseModel):
    image: str  # base64 data url or raw base64
    source: str = "upload"


class FaceResult(BaseModel):
    face_id: int
    bbox: List[float]
    score: float
    matched_user: Optional[dict] = None
    similarity: float = 0.0
    is_known: bool = False


class RecognizeResponse(BaseModel):
    faces: List[FaceResult]
    processed_at: datetime


class LogOut(BaseModel):
    id: int
    user_id: Optional[int] = None
    name: str
    confidence: float
    is_known: bool
    source: str
    frame_url: Optional[str] = None
    recognized_at: datetime


class LogListResponse(BaseModel):
    total: int
    items: List[LogOut]


class StatsOverview(BaseModel):
    total_users: int
    active_users: int
    total_recognitions: int
    known_today: int
    unknown_today: int
    accuracy_today: float
    recognitions_today: int
    users_by_department: List[dict]
    activity_24h: List[dict]


class SettingsOut(BaseModel):
    similarity_threshold: float
    auto_log_unknown: bool
    camera_flip: bool


class SettingsUpdate(BaseModel):
    similarity_threshold: Optional[float] = Field(None, ge=0.0, le=1.0)
    auto_log_unknown: Optional[bool] = None
    camera_flip: Optional[bool] = None
