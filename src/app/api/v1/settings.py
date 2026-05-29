from fastapi import APIRouter

from app.models.req.settings_req import SettingsReq, ModelKeyReq
from app.service.settings_service import get_settings, update_settings, update_env_key
from common.models.result import Result

settingsRouter = APIRouter()


@settingsRouter.get("/get_settings")
async def get_app_settings() -> Result:
    """
    获取模型设置。
    """
    return await get_settings()

@settingsRouter.post("/update_settings")
async def update_app_settings(req: SettingsReq) -> Result:
    """
    更新模型设置。
    """
    return await update_settings(req)


@settingsRouter.post("/update_model_key")
async def get_model_key(req: ModelKeyReq) -> Result:
    """
    更新模型密钥。
    """
    return update_env_key(req)
