"""
FastAPI application entry point.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from loguru import logger

from app.core.config import settings
from app.db.database import init_db
from app.api.routes import documents, topics, roadmap, tutor, assessment, progress

# Initialize DB on startup
init_db()

# Ensure default demo user exists
from app.db.database import SessionLocal
from app.db.models import User

def ensure_demo_user():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == "demo-user-001").first()
        if not user:
            demo_user = User(
                id="demo-user-001",
                email="demo@pathwise.ai",
                name="Demo Student",
            )
            db.add(demo_user)
            db.commit()
            logger.info("Demo user created")
    finally:
        db.close()

ensure_demo_user()

app = FastAPI(
    title="Pathwise API",
    description="AI-Powered Personalized Learning Platform",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(documents.router)
app.include_router(topics.router)
app.include_router(roadmap.router)
app.include_router(tutor.router)
app.include_router(assessment.router)
app.include_router(progress.router)


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "version": "1.0.0",
        "ai_provider": settings.AI_PROVIDER,
        "ai_model": settings.AI_MODEL,
    }


@app.get("/api/settings")
def get_settings():
    """Return non-sensitive settings for the frontend."""
    return {
        "ai_provider": settings.AI_PROVIDER,
        "ai_model": settings.AI_MODEL,
        "max_upload_size_mb": settings.MAX_UPLOAD_SIZE_MB,
        "allowed_extensions": settings.allowed_extensions_list,
        "has_gemini": bool(settings.GEMINI_API_KEY),
        "has_openai": bool(settings.OPENAI_API_KEY),
    }
