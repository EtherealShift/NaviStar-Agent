
import os
from pathlib import Path

# Ensure directory exists
def _ensure_dir(path: str) -> str:
    Path(path).mkdir(parents=True, exist_ok=True)
    return path

# Ensure file exists
def _ensure_file(path: str) -> str:
    Path(path).touch(exist_ok=True)
    return path

# ------------------------ Paths ------------------------
CONFIG_DIR = _ensure_dir(os.path.join(Path.home(), ".naviStar"))

# 资源文件
RESOURCE_DIR = _ensure_dir(os.path.join(CONFIG_DIR, "resources"))

# .env文件
ENV_PATH = _ensure_file(os.path.join(RESOURCE_DIR, ".env"))

# 日志文件夹
LOG_DIR = _ensure_dir(os.path.join(CONFIG_DIR, "log"))

# 配置文件
CONFIG_YAML_PATH = os.path.join(RESOURCE_DIR, "config.yaml")

# ------------------------ Database ------------------------
DEFAULT_DB_FILENAME = "navistar.db"
# 数据文件
DB_DIR = _ensure_dir(os.path.join(CONFIG_DIR, "db"))
# 数据库地址
DB_PATH = os.path.join(DB_DIR, DEFAULT_DB_FILENAME)


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
