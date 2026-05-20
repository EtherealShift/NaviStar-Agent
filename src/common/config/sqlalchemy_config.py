from contextlib import asynccontextmanager
from loguru import logger
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from common.config.app_paths import DB_DIR

# 确保所有实体模型被导入，以便 Base.metadata 包含所有表定义
from app.models.enty.conversation_messages import Conversation, MessagesGroup, MessageContent  # noqa: F401
from app.models.enty.base import Base

_DB_PATH = DB_DIR / "navistar.db"

_engine = None
_SessionFactory = None



def _get_engine():
    global _engine
    if _engine is None:
        _engine = create_async_engine(
            url=f"sqlite+aiosqlite:///{_DB_PATH.as_posix()}",
            echo=False,
        )
    return _engine

async def _get_session_factory():
    global _SessionFactory
    if _SessionFactory is None:
        engine = _get_engine()
        _SessionFactory = async_sessionmaker(
            bind=engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )
    return _SessionFactory

async def create_tables():
    """创建所有数据库表（如果不存在）"""
    engine = _get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.success("数据库表初始化完成")


@asynccontextmanager
async def db_session():
    factory = await _get_session_factory()
    session: AsyncSession = factory()
    try:
        yield session
        await session.commit()
    except SQLAlchemyError as e:
        await session.rollback()
        logger.error("数据库操作失败（SQLAlchemy），数据已回滚: {}", e)
        raise
    except Exception as e:
        await session.rollback()
        logger.error("数据库操作失败，数据已回滚: {}", e)
        raise
    finally:
        await session.close()