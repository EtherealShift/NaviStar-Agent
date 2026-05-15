import sqlite3
from pathlib import Path

from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver




async def get_checkpoint() -> AsyncSqliteSaver:
    # 用相对于本文件的路径，或者绝对路径
    _DB_PATH = Path(__file__).resolve().parent.parent.parent.joinpath("resources", "db", "memory.db")
    _DB_PATH.parent.mkdir(parents=True, exist_ok=True)

    _conn = sqlite3.connect(str(_DB_PATH), check_same_thread=False)

    # 赋值给变量，供外部导入使用
    checkpointer = AsyncSqliteSaver(conn=_conn)

    return checkpointer