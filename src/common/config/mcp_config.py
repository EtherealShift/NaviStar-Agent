import json
from copy import deepcopy
from typing import Any

from common.config.app_paths import MCP_TOOLS_PATH


DEFAULT_MCP_CONFIG = {
    "mcpServers": {},
}


def ensure_mcp_config_file() -> None:
    MCP_TOOLS_PATH.parent.mkdir(parents=True, exist_ok=True)
    if not MCP_TOOLS_PATH.exists():
        save_mcp_config(DEFAULT_MCP_CONFIG)


def read_mcp_config() -> dict[str, Any]:
    ensure_mcp_config_file()
    try:
        config = json.loads(MCP_TOOLS_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return deepcopy(DEFAULT_MCP_CONFIG)

    if not isinstance(config, dict):
        return deepcopy(DEFAULT_MCP_CONFIG)
    if not isinstance(config.get("mcpServers"), dict):
        config["mcpServers"] = {}
    return config


def save_mcp_config(config: dict[str, Any] | None) -> dict[str, Any]:
    next_config = config if isinstance(config, dict) else deepcopy(DEFAULT_MCP_CONFIG)
    if not isinstance(next_config.get("mcpServers"), dict):
        next_config["mcpServers"] = {}

    MCP_TOOLS_PATH.parent.mkdir(parents=True, exist_ok=True)
    MCP_TOOLS_PATH.write_text(
        json.dumps(next_config, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return next_config


def public_mcp_config(config: dict[str, Any] | None = None) -> dict[str, Any]:
    current = config or read_mcp_config()
    servers = current.get("mcpServers", {})
    return {
        "path": str(MCP_TOOLS_PATH),
        "config": current,
        "server_count": len(servers) if isinstance(servers, dict) else 0,
    }
