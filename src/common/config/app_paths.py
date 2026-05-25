from pathlib import Path

from common.config.app_settings import get_app_settings
from common.config.constants import APP_NAME as DEFAULT_APP_NAME


_settings = get_app_settings()

APP_NAME = _settings.app_name or DEFAULT_APP_NAME
IS_PRODUCTION = _settings.is_production
PROJECT_ROOT = _settings.project_root
DATA_HOME = _settings.data_home
DB_DIR = _settings.db_dir
LOG_DIR = _settings.log_dir
ENV_PATH = _settings.env_path
MCP_TOOLS_PATH = _settings.mcp_tools_path
RESOURCES_DIR = _settings.resources_dir


def resource_path(filename: str) -> Path:
    return get_app_settings().resource_path(filename)
