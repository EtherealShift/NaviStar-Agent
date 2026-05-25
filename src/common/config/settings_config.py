import os
from pathlib import Path

from common.config.app_settings import get_app_settings, reload_app_settings
from common.config.app_paths import ENV_PATH
from common.config.constants import (
    DEFAULT_ONE_API_URL,
    ENV_DEEPSEEK_API_KEY,
    ENV_ONE_API_KEY,
    ENV_ONE_API_URL,
    ENV_TAVILY_API_KEY,
)


DEFAULT_SETTINGS: dict[str, str] = {
    ENV_DEEPSEEK_API_KEY: "",
    ENV_TAVILY_API_KEY: "",
    ENV_ONE_API_KEY: "",
    ENV_ONE_API_URL: DEFAULT_ONE_API_URL,
}


def ensure_env_file() -> Path:
    ENV_PATH.parent.mkdir(parents=True, exist_ok=True)
    if not ENV_PATH.exists():
        save_settings(DEFAULT_SETTINGS)
    return ENV_PATH


def load_runtime_settings() -> dict[str, str]:
    ensure_env_file()
    runtime = reload_app_settings()
    settings = {
        ENV_DEEPSEEK_API_KEY: runtime.deepseek_api_key,
        ENV_TAVILY_API_KEY: runtime.tavily_api_key,
        ENV_ONE_API_KEY: runtime.one_api_key,
        ENV_ONE_API_URL: runtime.one_api_url,
    }
    apply_settings_to_env(settings)
    return settings


def read_settings() -> dict[str, str]:
    ensure_env_file()
    runtime = reload_app_settings()
    return {
        ENV_DEEPSEEK_API_KEY: runtime.deepseek_api_key,
        ENV_TAVILY_API_KEY: runtime.tavily_api_key,
        ENV_ONE_API_KEY: runtime.one_api_key,
        ENV_ONE_API_URL: runtime.one_api_url,
    }


def save_settings(values: dict[str, str]) -> dict[str, str]:
    settings = _read_env_file(ENV_PATH)
    for key, default_value in DEFAULT_SETTINGS.items():
        settings.setdefault(key, default_value)

    for key in DEFAULT_SETTINGS:
        if key in values:
            settings[key] = values.get(key) or ""

    ENV_PATH.parent.mkdir(parents=True, exist_ok=True)
    ENV_PATH.write_text(
        "\n".join(f"{key}={_encode_env_value(value)}" for key, value in settings.items()) + "\n",
        encoding="utf-8",
    )

    reload_app_settings()
    apply_settings_to_env(settings)
    return {key: settings.get(key, default_value) for key, default_value in DEFAULT_SETTINGS.items()}


def apply_settings_to_env(settings: dict[str, str]) -> None:
    for key, value in settings.items():
        if value:
            os.environ[key] = value
        else:
            os.environ.pop(key, None)


def require_deepseek_api_key() -> str:
    settings = load_runtime_settings()
    api_key = settings.get(ENV_DEEPSEEK_API_KEY) or os.getenv(ENV_DEEPSEEK_API_KEY)
    if not api_key:
        raise ValueError("DeepSeek API Key 未配置，请先在设置中填写并保存。")
    return api_key


def public_settings(settings: dict[str, str] | None = None) -> dict:
    current = settings or read_settings()
    app_settings = get_app_settings()
    return {
        "env_path": str(ENV_PATH),
        "environment": app_settings.environment.value,
        "is_production": app_settings.is_production,
        "providers": {
            "DEEPSEEK": {
                "api_key": current.get(ENV_DEEPSEEK_API_KEY, ""),
                "configured": bool(current.get(ENV_DEEPSEEK_API_KEY)),
            }
        },
        "tools": {
            "TAVILY": {
                "api_key": current.get(ENV_TAVILY_API_KEY, ""),
                "configured": bool(current.get(ENV_TAVILY_API_KEY)),
            }
        },
    }


def _read_env_file(path: Path) -> dict[str, str]:
    if not path.exists():
        return DEFAULT_SETTINGS.copy()

    settings: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        settings[key.strip()] = _decode_env_value(value.strip())
    return settings


def _decode_env_value(value: str) -> str:
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
        value = value[1:-1]
    return value.replace('\\"', '"').replace("\\\\", "\\")


def _encode_env_value(value: str) -> str:
    escaped = (value or "").replace("\\", "\\\\").replace('"', '\\"')
    return f'"{escaped}"'
