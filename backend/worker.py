import os
from pydub import AudioSegment
import imageio_ffmpeg
from dotenv import load_dotenv
from celery import Celery
from database import SessionLocal
from models import AudioJob, JobStatus
from gnani_service import transcribe_audio
from llm_service import generate_summary

# Force pydub to use the packaged FFmpeg binary so it works seamlessly on Render
AudioSegment.converter = imageio_ffmpeg.get_ffmpeg_exe()

load_dotenv()

def ensure_mp3_format(file_path: str) -> str:
    """Converts any audio file to a standard 128k MP3 format that Gnani accepts."""
    if file_path.lower().endswith('.mp3'):
        return file_path
    
    print(f"Converting {file_path} to MP3...")
    output_path = f"{os.path.splitext(file_path)[0]}.mp3"
    
    # Load the original file (m4a, ogg, wav) and export as standard MP3
    audio = AudioSegment.from_file(file_path)
    audio.export(output_path, format="mp3", bitrate="128k")
    
    return output_path

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
        # Step 0: Ensure the file is an MP3 so Gnani doesn't throw a 400 Bad Request
        safe_file_path = ensure_mp3_format(job.storage_url)

        # State 1: ASR Transcription
        job.status = JobStatus.TRANSCRIBING
        db.commit()
        
        # Pass the SAFE converted file to Gnani, not the original
        transcript = transcribe_audio(safe_file_path)
        
        # Cleanup the temporary MP3 to save server disk space
        if safe_file_path != job.storage_url and os.path.exists(safe_file_path):
            os.remove(safe_file_path)

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