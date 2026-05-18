from contextlib import asynccontextmanager

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from common.config.logger_config import setup_logger
from common.config.sqlalchemy_config import create_tables

from app.api.v1.agent import agentRouter


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期：启动时初始化数据库表"""
    await create_tables()
    yield


app = FastAPI(
    title="Agent Chat API",
    description="小星智能对话服务",
    version="1.0.0",
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(agentRouter, prefix="/ai")