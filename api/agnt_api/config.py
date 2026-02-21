from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

API_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = API_DIR / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "agnt-api"
    app_env: str = "dev"
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    database_url: str = "postgresql+asyncpg://agnt:agnt@localhost:5433/agnt"

    s3_endpoint_url: str = "http://localhost:9002"
    s3_public_url: str | None = None
    s3_access_key: str = "minioadmin"
    s3_secret_key: str = "minioadmin"
    s3_bucket: str = "agnt-results"
    s3_region: str = "us-east-1"

    @property
    def database_sync_url(self) -> str:
        if "+asyncpg" not in self.database_url:
            raise ValueError("DATABASE_URL must use postgresql+asyncpg for runtime.")
        return self.database_url.replace("+asyncpg", "+psycopg", 1)


@lru_cache
def get_settings() -> Settings:
    return Settings()
