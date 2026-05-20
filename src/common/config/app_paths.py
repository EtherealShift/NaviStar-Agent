"""
应用数据目录管理

开发模式:  数据存项目目录下（resources/db/, logs/）
生产模式:  数据存系统标准路径
  Windows: %APPDATA%/NaviStar/
  macOS:   ~/Library/Application Support/NaviStar/
  Linux:   ~/.local/share/NaviStar/

通过环境变量 NAVISTAR_PRODUCTION=1 切换到生产模式。
"""

import os
import sys
from pathlib import Path


def _project_root() -> Path:
    """从当前文件向上查找项目根目录（带 .git 或 pyproject.toml 的目录）"""
    here = Path(__file__).resolve()
    for parent in here.parents:
        if (parent / ".git").exists() or (parent / "pyproject.toml").exists():
            return parent
    # 找不到则回退到 src 的父目录
    return here.parent.parent.parent


def _data_home() -> Path:
    if sys.platform == "win32":
        base = Path.home() / "AppData" / "Roaming"
    elif sys.platform == "darwin":
        base = Path.home() / "Library" / "Application Support"
    else:
        base = Path.home() / ".local" / "share"
    return base / "NaviStar"


IS_PRODUCTION = bool(os.getenv("NAVISTAR_PRODUCTION"))

if IS_PRODUCTION:
    DATA_HOME = _data_home()
    DB_DIR = DATA_HOME / "db"
    LOG_DIR = DATA_HOME / "logs"
else:
    ROOT = _project_root()
    DB_DIR = ROOT / "resources" / "db"
    LOG_DIR = ROOT / "logs"

# 确保目录存在
for _d in (DB_DIR, LOG_DIR):
    _d.mkdir(parents=True, exist_ok=True)
