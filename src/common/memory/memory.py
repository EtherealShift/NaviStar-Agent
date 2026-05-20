import aiosqlite

from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver

from common.config.app_paths import DB_DIR


async def get_checkpoint() -> AsyncSqliteSaver:
    _conn = await aiosqlite.connect(str(DB_DIR / "navistar.db"))

    checkpointer = AsyncSqliteSaver(conn=_conn)

    return checkpointer