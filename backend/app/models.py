from datetime import datetime

from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship

from .database import Base


class Admin(Base):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(64), unique=True, index=True, nullable=False)
    email = Column(String(128), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(32), default="admin")
    created_at = Column(DateTime, default=datetime.utcnow)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    email = Column(String(128), unique=True, index=True, nullable=True)
    employee_id = Column(String(64), unique=True, index=True, nullable=True)
    department = Column(String(128), default="General")
    designation = Column(String(128), default="Member")
    phone = Column(String(32), default="")
    status = Column(String(16), default="active")  # active | inactive
    photo_path = Column(String(255), default="")
    embedding = Column(Text, default="")           # JSON array of floats
    sample_count = Column(Integer, default=0)
    threshold_override = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    logs = relationship("RecognitionLog", back_populates="user", cascade="all, delete-orphan")


class RecognitionLog(Base):
    __tablename__ = "recognition_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    name = Column(String(128), default="Unknown")
    confidence = Column(Float, default=0.0)
    is_known = Column(Boolean, default=False)
    source = Column(String(32), default="webcam")  # webcam | upload
    frame_path = Column(String(255), default="")
    device = Column(String(64), default="")
    extra = Column(Text, default="")
    recognized_at = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User", back_populates="logs")


class Setting(Base):
    __tablename__ = "settings"

    key = Column(String(64), primary_key=True)
    value = Column(Text, default="")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
