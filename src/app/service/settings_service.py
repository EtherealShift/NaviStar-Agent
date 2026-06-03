"""
设置管理服务。
"""
from pathlib import Path

import yaml
from dotenv import set_key
from loguru import logger

from app.models.req.settings_req import SettingsReq, ModelKeyReq
from common.config.constants import CONFIG_YAML_PATH, ENV_PATH
from common.models.result import Result
from common.utils.file_utils import config_yaml_path


async def update_settings(req: SettingsReq) -> Result:
    """
    更新模型设置。
    """
    try:
        settings = config_yaml_path()
        model_settings = settings.setdefault("model", {})
        if req.temperature is not None:
            model_settings["temperature"] = req.temperature
        if req.reasoning_effort is not None:
            model_settings["reasoning_effort"] = req.reasoning_effort
        if req.supplier is not None:
            model_settings["supplier"] = req.supplier
        if req.model_name is not None:
            model_settings["model_name"] = req.model_name

        path = Path(CONFIG_YAML_PATH)
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("w", encoding="utf-8") as f:
            yaml.safe_dump(settings, f, allow_unicode=True, sort_keys=False)
    except Exception as e:
        logger.error(e)
        return Result(msg="配置设置失败").failure()

    return Result().success()


async def get_settings() -> Result:
    """
    获取模型设置。
    """
    try:
        settings = config_yaml_path()
    except Exception as e:
        logger.error(e)
        return Result(msg="配置设置失败").failure()

    return Result(data=settings).success()


def update_env_key(req: ModelKeyReq) -> Result:
    """
    更新环境密钥。
    """
    try:
        Path(ENV_PATH).parent.mkdir(parents=True, exist_ok=True)
        set_key(ENV_PATH, req.supplier.upper() + "_API_KEY", req.api_key)
        return Result().success()
    except Exception as e:
        logger.error(e)
        return Result(msg="环境密钥更新失败").failure()
