from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import get_db
from models import AudioJob, JobStatus
from worker import process_audio_pipeline
import uuid
import os
from dotenv import load_dotenv

load_dotenv()
app = FastAPI(title="Gnani Audio Notes API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def save_upload_file(file_bytes: bytes, filename: str) -> str:
    """Saves the file to a local directory for processing by the background worker."""
    os.makedirs("uploads", exist_ok=True)
    local_filename = f"uploads/{uuid.uuid4()}_{filename}"
    with open(local_filename, "wb") as f:
        f.write(file_bytes)
    return local_filename

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/api/jobs")
async def create_upload_job(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.lower().endswith(('.mp3', '.wav', '.m4a', '.ogg')):
        raise HTTPException(status_code=400, detail="Invalid audio format.")
    
    file_bytes = await file.read()
    try:
        storage_url = save_upload_file(file_bytes, file.filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Storage failure: {str(e)}")
    
    job = AudioJob(filename=file.filename, storage_url=storage_url, status=JobStatus.UPLOADED)
    db.add(job)
    db.commit()
    db.refresh(job)

    # Dispatch to Celery queue
    process_audio_pipeline.delay(str(job.id))
    
    return {"id": job.id, "status": job.status, "message": "Job queued successfully"}

@app.get("/api/jobs")
def list_jobs(db: Session = Depends(get_db)):
    return db.query(AudioJob).order_by(AudioJob.created_at.desc()).all()

@app.get("/api/jobs/{job_id}")
def get_job_status(job_id: str, db: Session = Depends(get_db)):
    job = db.query(AudioJob).filter(AudioJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@app.delete("/api/jobs/{job_id}")
def delete_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(AudioJob).filter(AudioJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Optional: Delete the physical file from the uploads folder to save space
    if job.storage_url and os.path.exists(job.storage_url):
        try:
            os.remove(job.storage_url)
        except OSError:
            pass # Ignore file deletion errors, proceed with DB deletion
            
    db.delete(job)
    db.commit()
    return {"detail": "Job deleted successfully"}