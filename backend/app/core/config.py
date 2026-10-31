from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    # AI Provider
    AI_PROVIDER: str = "gemini"
    AI_MODEL: str = "gemini-1.5-flash"
    AI_BASE_URL: Optional[str] = None
    AI_API_KEY: Optional[str] = None

    # Google Gemini
    GEMINI_API_KEY: Optional[str] = None

    # OpenAI
    OPENAI_API_KEY: Optional[str] = None

    # App
    SECRET_KEY: str = "change-this-secret"
    DATABASE_URL: str = "sqlite:///./pathwise.db"
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE_MB: int = 50
    ALLOWED_EXTENSIONS: str = "pdf,ppt,pptx"

    # CORS
    FRONTEND_URL: str = "http://localhost:3000"

    class Config:
        env_file = ".env"
        extra = "allow"

    @property
    def allowed_extensions_list(self):
        return [ext.strip().lower() for ext in self.ALLOWED_EXTENSIONS.split(",")]

    @property
    def max_upload_bytes(self):
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024


settings = Settings()

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
