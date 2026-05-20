import os
import sys
from pathlib import Path


APP_NAME = "NaviStar"


def _project_root() -> Path:
    here = Path(__file__).resolve()
    for parent in here.parents:
        if (parent / "pyproject.toml").exists() or (parent / ".git").exists():
            return parent
    return here.parents[3]


def _data_home() -> Path:
    if sys.platform == "win32":
        base = Path(os.getenv("APPDATA") or Path.home() / "AppData" / "Roaming")
    elif sys.platform == "darwin":
        base = Path.home() / "Library" / "Application Support"
    else:
        base = Path(os.getenv("XDG_DATA_HOME") or Path.home() / ".local" / "share")
    return base / APP_NAME


IS_PRODUCTION = os.getenv("NAVISTAR_PRODUCTION") == "1" or bool(getattr(sys, "frozen", False))
PROJECT_ROOT = None if IS_PRODUCTION else _project_root()
DATA_HOME = _data_home() if IS_PRODUCTION else PROJECT_ROOT
DB_DIR = DATA_HOME / "db"
LOG_DIR = DATA_HOME / "logs"
ENV_PATH = DATA_HOME / ".env"
MCP_TOOLS_PATH = DATA_HOME / "mcp_tools.json"

for directory in (DB_DIR, LOG_DIR):
    directory.mkdir(parents=True, exist_ok=True)
