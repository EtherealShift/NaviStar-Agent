"""
NaviStar 应用入口。

职责：
  1. 创建 FastAPI 应用实例，注册 CORS 中间件和 API 路由。
  2. 在 lifespan 中初始化日志、运行时配置、数据库表。
  3. 启动 uvicorn 服务器，并可选地监听父进程（用于 GUI 嵌入模式）。
"""

import os
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from app.api.v1.mcps import mcpsRouter
from app.api.v1.settings import settingsRouter
from common.config.constants import API_DESCRIPTION, API_TITLE, API_VERSION
from common.config.logger_config import setup_logger

if sys.stdout is None:
    sys.stdout = open(os.devnull, "w", encoding="utf-8")
if sys.stderr is None:
    sys.stderr = open(os.devnull, "w", encoding="utf-8")

from common.config.sqlalchemy_config import create_tables

from app.api.v1.agent import agentRouter


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期：启动时初始化数据库表"""
    setup_logger()
    await create_tables()
    yield


app = FastAPI(
    title=API_TITLE,
    description=API_DESCRIPTION,
    version=API_VERSION,
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

app.include_router(settingsRouter, prefix="/settings")

app.include_router(mcpsRouter, prefix="/mcp")

