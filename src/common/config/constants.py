
import os
from pathlib import Path


def _root_path() -> Path:
    src_root = Path(__file__).resolve()
    while src_root.name != "src":
        src_root = src_root.parent
    return src_root




# ------------------------ Paths ------------------------
SRC_ROOT = _root_path()
RESOURCES = os.path.join(SRC_ROOT, "resources")
ENV_PATH = os.path.join(RESOURCES, ".env")
CONFIG_JSON = os.path.join(RESOURCES, "config.json")
SUPPLIER_YAML_PATH = os.path.join(RESOURCES, "supplier.yaml")
LOG_DIR = os.path.join(RESOURCES, "log")
MCP_SERVER_PATH = os.path.join(RESOURCES, "mcp_server.json")

# ------------------------ Database ------------------------
DEFAULT_DB_FILENAME = "navistar.db"
DB_PATH = os.path.join(RESOURCES, "db", DEFAULT_DB_FILENAME)


# ------------------------ App ------------------------
APP_NAME = "NaviStar"
API_TITLE = "Agent Chat API"
API_DESCRIPTION = "小星智能对话服务"
API_VERSION = "1.0.0"

DEFAULT_BACKEND_HOST = "127.0.0.1"
DEFAULT_BACKEND_PORT = 8000



# ------------------------ url ------------------------
DEFAULT_ONE_API_URL = "https://api.getoneapi.com"
DEEPSEEK_BASE_URL = "https://api.deepseek.com"
MIMO_BASE_URL = "https://api.xiaomi.com"











LOG_FORMAT = (
    "<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | "
    "<level>{level: <8}</level> | "
    "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> | "
    "<level>{message}</level>"
)

LOG_ROTATION = "10 MB"
LOG_RETENTION = "30 days"
LOG_COMPRESSION = "zip"


