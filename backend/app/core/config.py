from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict

APP_DIR = Path(__file__).resolve().parents[1]
DEFAULT_DB_PATH = (APP_DIR / "factory_reports.db").resolve()


class Settings(BaseSettings):
    app_name: str = "Factory Inspection Reporting API"
    api_v1_prefix: str = "/api/v1"
    database_url: str = f"sqlite+aiosqlite:///{DEFAULT_DB_PATH.as_posix()}"
    cors_origins: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://10.232.236.141:8080",
        "http://10.232.236.141:8000",
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def database_path(self) -> Path:
        supported_prefixes = ("sqlite+aiosqlite:///", "sqlite:///")
        if not self.database_url.startswith(supported_prefixes):
            msg = "Only sqlite:/// or sqlite+aiosqlite:/// URLs are supported"
            raise ValueError(msg)

        if self.database_url.startswith("sqlite+aiosqlite:///"):
            raw_path = self.database_url.replace("sqlite+aiosqlite:///", "", 1)
        else:
            raw_path = self.database_url.replace("sqlite:///", "", 1)

        db_path = Path(raw_path)
        if not db_path.is_absolute():
            db_path = (APP_DIR / db_path).resolve()
        return db_path


settings = Settings()
