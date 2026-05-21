import os
from pathlib import Path

from dotenv import load_dotenv

from common.config.app_paths import ENV_PATH


DEFAULT_SETTINGS = {
    "DEEPSEEK_API_KEY": "",
    "TAVILY_API_KEY": "",
}


def ensure_env_file() -> Path:
    ENV_PATH.parent.mkdir(parents=True, exist_ok=True)
    if not ENV_PATH.exists():
        save_settings(DEFAULT_SETTINGS)
    return ENV_PATH


def load_runtime_settings() -> dict[str, str]:
    ensure_env_file()
    load_dotenv(ENV_PATH, override=True)
    settings = read_settings()
    apply_settings_to_env(settings)
    return settings


def read_settings() -> dict[str, str]:
    ensure_env_file()
    settings = DEFAULT_SETTINGS.copy()
    for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        key = key.strip()
        if key in settings:
            settings[key] = _decode_env_value(value.strip())
    return settings


def save_settings(values: dict[str, str]) -> dict[str, str]:
    settings = read_settings() if ENV_PATH.exists() else DEFAULT_SETTINGS.copy()
    for key in DEFAULT_SETTINGS:
        if key in values:
            settings[key] = values.get(key) or ""

    ENV_PATH.parent.mkdir(parents=True, exist_ok=True)
    ENV_PATH.write_text(
        "\n".join(f"{key}={_encode_env_value(value)}" for key, value in settings.items()) + "\n",
        encoding="utf-8",
    )

    apply_settings_to_env(settings)
    return settings


def apply_settings_to_env(settings: dict[str, str]) -> None:
    for key, value in settings.items():
        if value:
            os.environ[key] = value
        else:
            os.environ.pop(key, None)


def require_deepseek_api_key() -> str:
    settings = load_runtime_settings()
    api_key = settings.get("DEEPSEEK_API_KEY") or os.getenv("DEEPSEEK_API_KEY")
    if not api_key:
        raise ValueError("DeepSeek API Key 未配置，请先在设置中填写并保存。")
    return api_key


def public_settings(settings: dict[str, str] | None = None) -> dict:
    current = settings or read_settings()
    return {
        "env_path": str(ENV_PATH),
        "providers": {
            "DEEPSEEK": {
                "api_key": current.get("DEEPSEEK_API_KEY", ""),
                "configured": bool(current.get("DEEPSEEK_API_KEY")),
            }
        },
        "tools": {
            "TAVILY": {
                "api_key": current.get("TAVILY_API_KEY", ""),
                "configured": bool(current.get("TAVILY_API_KEY")),
            }
        },
    }


def _decode_env_value(value: str) -> str:
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
        return value[1:-1]
    return value


def _encode_env_value(value: str) -> str:
    escaped = (value or "").replace("\\", "\\\\").replace('"', '\\"')
    return f'"{escaped}"'
