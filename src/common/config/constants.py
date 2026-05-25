from enum import StrEnum


class RuntimeEnvironment(StrEnum):
    DEVELOPMENT = "development"
    PRODUCTION = "production"


APP_NAME = "NaviStar"
API_TITLE = "Agent Chat API"
API_DESCRIPTION = "小星智能对话服务"
API_VERSION = "1.0.0"

DEFAULT_BACKEND_HOST = "127.0.0.1"
DEFAULT_BACKEND_PORT = 8000

DEFAULT_MODEL_NAME = "deepseek-v4-flash"
MODEL_LIST = {
    "DEEPSEEK": [
        "deepseek-v4-pro",
        DEFAULT_MODEL_NAME,
    ]
}

DEFAULT_DB_FILENAME = "navistar.db"
DEFAULT_ENV_FILENAME = ".env"
DEFAULT_MCP_TOOLS_FILENAME = "mcp_tools.json"
RESOURCES_DIR_NAME = "resources"

ENV_APP_ENV = "NAVISTAR_ENV"
ENV_PRODUCTION = "NAVISTAR_PRODUCTION"
ENV_PARENT_PID = "NAVISTAR_PARENT_PID"
ENV_BACKEND_HOST = "NAVISTAR_BACKEND_HOST"
ENV_BACKEND_PORT = "NAVISTAR_BACKEND_PORT"
ENV_DEEPSEEK_API_KEY = "DEEPSEEK_API_KEY"
ENV_TAVILY_API_KEY = "TAVILY_API_KEY"
ENV_ONE_API_KEY = "ONE_API_KEY"
ENV_ONE_API_URL = "ONE_API_URL"

DEFAULT_ONE_API_URL = "https://api.getoneapi.com"

LOG_FORMAT = (
    "<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | "
    "<level>{level: <8}</level> | "
    "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> | "
    "<level>{message}</level>"
)
LOG_ROTATION = "10 MB"
LOG_RETENTION = "30 days"
LOG_COMPRESSION = "zip"
