"""
Agent 对话记忆 / 检查点模块。

通过 LangGraph 的 AsyncSqliteSaver 实现对话历史的持久化，
使 Agent 在多轮对话间保持上下文连续性。
"""

import aiosqlite

from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver

from common.config.constants import DB_PATH

async def get_checkpoint() -> AsyncSqliteSaver:
    """创建异步 SQLite 检查点存储器。

    连接 NaviStar 的 SQLite 数据库（与业务表共享同一个 DB 文件），
    LangGraph Agent 通过 checkpointer 自动保存/恢复对话状态。
    """
    # ensure_resource_dirs()

    _conn = await aiosqlite.connect(DB_PATH)

    checkpointer = AsyncSqliteSaver(conn=_conn)

    return checkpointer
