
from pydantic_settings import BaseSettings, SettingsConfigDict
from common.config.constants import ENV_PATH


class AppSettings(BaseSettings):
    """应用运行时配置。"""
    model_config = SettingsConfigDict(
        env_file=ENV_PATH,
        env_file_encoding='utf-8',
        extra='ignore'
    )

    mimo_api_key: str = ""

    deepseek_api_key: str = ""

    one_api_key: str = ""

