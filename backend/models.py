import enum
import uuid
from sqlalchemy import Column, String, Text, DateTime, Enum
from datetime import datetime
from database import Base

class JobStatus(str, enum.Enum):
    UPLOADED = "UPLOADED"
    PROCESSING = "PROCESSING"
    TRANSCRIBING = "TRANSCRIBING"
    SUMMARIZING = "SUMMARIZING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class AudioJob(Base):
    __tablename__ = "audio_jobs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    filename = Column(String, nullable=False)
    storage_url = Column(String, nullable=False)
    status = Column(Enum(JobStatus), default=JobStatus.UPLOADED)
    transcript = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)