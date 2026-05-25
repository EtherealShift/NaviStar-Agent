import aiosqlite

from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver

from common.config.app_settings import get_app_settings


async def get_checkpoint() -> AsyncSqliteSaver:
    _conn = await aiosqlite.connect(str(get_app_settings().database_path))

    checkpointer = AsyncSqliteSaver(conn=_conn)

    return checkpointer
