# Audio Notes Platform

A full-stack application that processes audio files, generates transcripts using the Gnani ASR API, and creates structured summaries using LLMs.

## Prerequisites
- PostgreSQL running locally or via Docker
- Redis running locally or via Docker (for Celery)
- Node.js 18+ and Python 3.10+

## Backend Setup
1. `cd backend`
2. `python -m venv venv`
3. `source venv/bin/activate` (or `venv\\Scripts\\activate` on Windows)
4. `pip install -r requirements.txt`
5. `cp .env.example .env` and fill in your credentials.
6. Run migrations: `python -c "from database import engine; from models import Base; Base.metadata.create_all(bind=engine)"`
7. Start FastAPI: `uvicorn main:app --reload --port 8000`
8. Start Celery (new terminal): `celery -A worker.celery_app worker --loglevel=info`

## Frontend Setup
1. `cd frontend`
2. `npm install`
3. `npm run dev`
4. Open `http://localhost:3000`

## Deployment Notes
- **Backend:** Deploy on Render/Railway. Ensure `DATABASE_URL` and `REDIS_URL` point to managed instances. Deploy the web service (`uvicorn main:app --host 0.0.0.0 --port 10000`) and a background worker (`celery -A worker.celery_app worker`).
- **Frontend:** Deploy on Vercel. Set `NEXT_PUBLIC_API_URL` to your backend URL.