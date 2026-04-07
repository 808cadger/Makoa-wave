# config.py — GlowAI server settings via environment variables
# Aloha from Pearl City!

from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    anthropic_api_key: str
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_days: int = 7
    database_url: str = "sqlite:///./glowai.db"
    allowed_origins: str = "http://localhost:3000,http://localhost:8080"

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    class Config:
        env_file = ".env"


settings = Settings()
