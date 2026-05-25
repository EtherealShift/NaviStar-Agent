import os
import sys
from functools import lru_cache
from pathlib import Path
from typing import Any

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from common.config.constants import (
    APP_NAME,
    DEFAULT_BACKEND_HOST,
    DEFAULT_BACKEND_PORT,
    DEFAULT_DB_FILENAME,
    DEFAULT_ENV_FILENAME,
    DEFAULT_MCP_TOOLS_FILENAME,
    DEFAULT_ONE_API_URL,
    ENV_APP_ENV,
    ENV_BACKEND_HOST,
    ENV_BACKEND_PORT,
    ENV_DEEPSEEK_API_KEY,
    ENV_ONE_API_KEY,
    ENV_ONE_API_URL,
    ENV_PRODUCTION,
    ENV_TAVILY_API_KEY,
    RESOURCES_DIR_NAME,
    RuntimeEnvironment,
)


def _project_root() -> Path:
    here = Path(__file__).resolve()
    for parent in here.parents:
        if (parent / "pyproject.toml").exists() or (parent / ".git").exists():
            return parent
    return here.parents[3]


def _resource_root() -> Path:
    if getattr(sys, "frozen", False):
        return Path(getattr(sys, "_MEIPASS", Path(sys.executable).parent)) / RESOURCES_DIR_NAME
    return _project_root() / "src" / RESOURCES_DIR_NAME


def _data_home(app_name: str = APP_NAME) -> Path:
    if sys.platform == "win32":
        base = Path(os.getenv("APPDATA") or Path.home() / "AppData" / "Roaming")
    elif sys.platform == "darwin":
        base = Path.home() / "Library" / "Application Support"
    else:
        base = Path(os.getenv("XDG_DATA_HOME") or Path.home() / ".local" / "share")
    return base / app_name


def _is_truthy(value: str | None) -> bool:
    return (value or "").strip().lower() in {"1", "true", "yes", "on", "prod", "production"}


def resolve_runtime_environment() -> RuntimeEnvironment:
    explicit = os.getenv(ENV_APP_ENV)
    if explicit:
        return _normalize_environment(explicit)
    if _is_truthy(os.getenv(ENV_PRODUCTION)) or bool(getattr(sys, "frozen", False)):
        return RuntimeEnvironment.PRODUCTION
    return RuntimeEnvironment.DEVELOPMENT


def resolve_settings_env_file() -> Path:
    environment = resolve_runtime_environment()
    if environment == RuntimeEnvironment.PRODUCTION:
        return _data_home() / DEFAULT_ENV_FILENAME
    return _project_root() / DEFAULT_ENV_FILENAME


def _normalize_environment(value: Any) -> RuntimeEnvironment:
    if isinstance(value, RuntimeEnvironment):
        return value
    normalized = str(value or RuntimeEnvironment.DEVELOPMENT).strip().lower()
    aliases = {
        "dev": RuntimeEnvironment.DEVELOPMENT,
        "development": RuntimeEnvironment.DEVELOPMENT,
        "local": RuntimeEnvironment.DEVELOPMENT,
        "prod": RuntimeEnvironment.PRODUCTION,
        "production": RuntimeEnvironment.PRODUCTION,
    }
    return aliases.get(normalized, RuntimeEnvironment.DEVELOPMENT)


class AppSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_name: str = Field(default=APP_NAME, validation_alias="NAVISTAR_APP_NAME")
    environment: RuntimeEnvironment = Field(
        default_factory=resolve_runtime_environment,
        validation_alias=ENV_APP_ENV,
    )
    navistar_production: bool = Field(
        default_factory=lambda: bool(getattr(sys, "frozen", False)),
        validation_alias=ENV_PRODUCTION,
    )
    backend_host: str = Field(default=DEFAULT_BACKEND_HOST, validation_alias=ENV_BACKEND_HOST)
    backend_port: int = Field(default=DEFAULT_BACKEND_PORT, validation_alias=ENV_BACKEND_PORT)

    deepseek_api_key: str = Field(default="", validation_alias=ENV_DEEPSEEK_API_KEY)
    tavily_api_key: str = Field(default="", validation_alias=ENV_TAVILY_API_KEY)
    one_api_key: str = Field(default="", validation_alias=ENV_ONE_API_KEY)
    one_api_url: str = Field(default=DEFAULT_ONE_API_URL, validation_alias=ENV_ONE_API_URL)

    @field_validator("environment", mode="before")
    @classmethod
    def _parse_environment(cls, value: Any) -> RuntimeEnvironment:
        return _normalize_environment(value)

    @model_validator(mode="after")
    def _force_packaged_environment(self) -> "AppSettings":
        if self.navistar_production or bool(getattr(sys, "frozen", False)):
            self.environment = RuntimeEnvironment.PRODUCTION
        return self

    @property
    def is_production(self) -> bool:
        return self.environment == RuntimeEnvironment.PRODUCTION

    @property
    def project_root(self) -> Path | None:
        return None if self.is_production else _project_root()

    @property
    def data_home(self) -> Path:
        if self.is_production:
            return _data_home(self.app_name)
        return self.project_root or _project_root()

    @property
    def resources_dir(self) -> Path:
        return _resource_root()

    @property
    def db_dir(self) -> Path:
        return self.data_home / "db"

    @property
    def log_dir(self) -> Path:
        return self.data_home / "logs"

    @property
    def env_path(self) -> Path:
        return self.data_home / DEFAULT_ENV_FILENAME

    @property
    def mcp_tools_path(self) -> Path:
        return self.data_home / DEFAULT_MCP_TOOLS_FILENAME

    @property
    def database_path(self) -> Path:
        return self.db_dir / DEFAULT_DB_FILENAME

    def resource_path(self, filename: str) -> Path:
        return self.resources_dir / filename

    def ensure_runtime_dirs(self) -> None:
        for directory in (self.data_home, self.db_dir, self.log_dir):
            directory.mkdir(parents=True, exist_ok=True)


@lru_cache(maxsize=1)
def get_app_settings() -> AppSettings:
    settings = AppSettings(_env_file=resolve_settings_env_file())
    settings.ensure_runtime_dirs()
    return settings


def reload_app_settings() -> AppSettings:
    get_app_settings.cache_clear()
    return get_app_settings()
