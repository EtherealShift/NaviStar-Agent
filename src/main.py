from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from common.config.app_settings import get_app_settings
from common.config.constants import API_DESCRIPTION, API_TITLE, API_VERSION
from common.config.settings_config import load_runtime_settings
from common.config.logger_config import setup_logger
setup_logger()
load_runtime_settings()
from common.config.sqlalchemy_config import create_tables

from app.api.v1.agent import agentRouter


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期：启动时初始化数据库表"""
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

if __name__ == "__main__":
    settings = get_app_settings()
    uvicorn.run(app, host=settings.backend_host, port=settings.backend_port, log_level="warning")
