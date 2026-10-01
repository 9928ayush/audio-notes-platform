from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
import os
from dotenv import load_dotenv

load_dotenv()

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

# NullPool is strictly required here to prevent Neon Serverless Postgres
# from throwing "SSL SYSCALL" dropped-connection errors during idle periods.
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    poolclass=NullPool
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
# cd D:\college\project\audio-notes-platform\backend
# C:\Users\9928a\AppData\Local\Programs\Python\Python312\python.exe -m celery -A worker.celery_app worker --loglevel=info --pool=solo        
# cd D:\college\project\audio-notes-platform\backend 
# C:\Users\9928a\AppData\Local\Programs\Python\Python312\python.exe -m uvicorn main:app --reload --port 8000
# cd D:\college\project\audio-notes-platform\frontend
# npm run dev