from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Factory Inspection Reporting API"
    api_v1_prefix: str = "/api/v1"
    database_url: str = "sqlite+aiosqlite:///./factory_reports.db"

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
            db_path = (Path.cwd() / db_path).resolve()
        return db_path


settings = Settings()
