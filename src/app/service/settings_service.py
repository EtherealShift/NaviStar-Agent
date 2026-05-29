"""
设置管理服务。
"""
import yaml
from dotenv import set_key
from loguru import logger

from app.models.req.settings_req import SettingsReq, ModelKeyReq
from common.config.constants import SUPPLIER_YAML_PATH, ENV_PATH
from common.models.result import Result
from common.utils.file_utils import supplier_yaml_path

settings = supplier_yaml_path()

async def update_settings(req: SettingsReq) -> Result:
    """
    更新模型设置。
    """
    if req.temperature is not None:
        settings.get("model")["temperature"] = req.temperature
    if req.reasoning_effort is not None:
        settings.get("model")["reasoning_effort"] = req.reasoning_effort
    try:
        with open(SUPPLIER_YAML_PATH, "w+") as f:
            yaml.dump(settings, f, default_flow_style=False)
    except Exception as e:
        logger.error(e)
        return Result(msg="配置设置失败").failure()

    return Result().success()


async def get_settings() -> Result:
    """
    获取模型设置。
    """
    try:
        with open(SUPPLIER_YAML_PATH, "r") as f:
            settings = yaml.load(f, Loader=yaml.FullLoader)
    except Exception as e:
        logger.error(e)
        return Result(msg="配置设置失败").failure()

    return Result(data=settings).success()


def update_env_key(req: ModelKeyReq) -> Result:
    """
    更新环境密钥。
    """
    try:
        set_key(ENV_PATH, req.supplier.upper() + "_API_KEY", req.api_key)
        return Result().success()
    except Exception as e:
        logger.error(e)
        return Result(msg="环境密钥更新失败").failure()