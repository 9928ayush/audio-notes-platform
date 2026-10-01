import os
from dotenv import load_dotenv

load_dotenv()

from celery import Celery
from database import SessionLocal
from models import AudioJob, JobStatus
from gnani_service import transcribe_audio
from llm_service import generate_summary

redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
celery_app = Celery("audio_tasks", broker=redis_url, backend=redis_url)

@celery_app.task(bind=True, max_retries=3)
def process_audio_pipeline(self, job_id: str):
    db = SessionLocal()
    job = db.query(AudioJob).filter(AudioJob.id == job_id).first()
    
    if not job:
        db.close()
        return

    try:
        # State 1: ASR Transcription
        job.status = JobStatus.TRANSCRIBING
        db.commit()
        
        transcript = transcribe_audio(job.storage_url)
        if not transcript:
            raise ValueError("ASR API returned an empty response.")
        
        job.transcript = transcript
        db.commit()

        # State 2: LLM Summarization
        job.status = JobStatus.SUMMARIZING
        db.commit()
        
        summary = generate_summary(transcript)
        job.summary = summary
        job.status = JobStatus.COMPLETED
        db.commit()

    except Exception as e:
        db.rollback()
        job.status = JobStatus.FAILED
        job.error_message = str(e)
        db.commit()
    finally:
        db.close()