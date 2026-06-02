from pathlib import Path
from typing import Any

import yaml

from common.config.constants import CONFIG_YAML_PATH as DEFAULT_CONFIG_YAML_PATH
from common.models.result import Result

CONFIG_YAML_PATH = DEFAULT_CONFIG_YAML_PATH
MCP_SERVERS_KEY = "mcpServers"
VALID_TRANSPORTS = {"stdio", "http", "sse"}
REMOTE_TRANSPORTS = {"http", "sse"}


class MCPConfigError(ValueError):
    """Raised when an MCP server config cannot be normalized."""


def _read_config() -> dict[str, Any]:
    path = Path(CONFIG_YAML_PATH)
    if not path.exists():
        return {MCP_SERVERS_KEY: {}}

    with path.open("r", encoding="utf-8") as file:
        data = yaml.safe_load(file) or {}

    if not isinstance(data, dict):
        data = {}
    if MCP_SERVERS_KEY not in data:
        data[MCP_SERVERS_KEY] = {}
    return data


def _server_map(config: dict[str, Any]) -> dict[str, Any]:
    servers = config.setdefault(MCP_SERVERS_KEY, {})
    if not isinstance(servers, dict):
        raise MCPConfigError("mcpServers must be an object")
    return servers


def _write_config(config: dict[str, Any]) -> None:
    path = Path(CONFIG_YAML_PATH)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as file:
        yaml.safe_dump(config, file, allow_unicode=True, sort_keys=False)


def _as_mapping(value: Any, field_name: str) -> dict[str, Any]:
    if value in (None, ""):
        return {}
    if isinstance(value, dict):
        return dict(value)
    raise MCPConfigError(f"{field_name} must be an object")


def _as_args(value: Any) -> list[str]:
    if value in (None, ""):
        return []
    if isinstance(value, list):
        return [str(item) for item in value]
    raise MCPConfigError("args must be an array")


def _clean_name(value: Any) -> str:
    name = str(value or "").strip()
    if not name:
        raise MCPConfigError("MCP server name is required")
    return name


def _normalize_transport(server: dict[str, Any]) -> str:
    raw_transport = server.get("transport") or server.get("type")
    if not raw_transport:
        if server.get("command"):
            raw_transport = "stdio"
        elif server.get("url"):
            raw_transport = "http"

    transport = str(raw_transport or "").strip().lower().replace("-", "_")
    if transport == "streamable_http":
        transport = "http"
    if transport not in VALID_TRANSPORTS:
        raise MCPConfigError(f"unsupported MCP transport: {raw_transport}")
    return transport


def normalize_mcp_server(name: str, server: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(server, dict):
        raise MCPConfigError("MCP server config must be an object")

    transport = _normalize_transport(server)
    normalized: dict[str, Any] = {
        "enabled": bool(server.get("enabled", True)),
        "transport": transport,
    }

    description = str(server.get("description") or "").strip()
    if description:
        normalized["description"] = description

    if transport == "stdio":
        command = str(server.get("command") or "").strip()
        if not command:
            raise MCPConfigError(f"{name}: stdio transport requires command")
        normalized["command"] = command
        normalized["args"] = _as_args(server.get("args"))
        normalized["env"] = _as_mapping(server.get("env"), "env")
        return normalized

    url = str(server.get("url") or "").strip()
    if not url:
        raise MCPConfigError(f"{name}: {transport} transport requires url")
    normalized["url"] = url
    normalized["headers"] = _as_mapping(server.get("headers"), "headers")
    return normalized


def normalize_mcp_server_config(servers: dict[str, Any]) -> dict[str, dict[str, Any]]:
    if not isinstance(servers, dict):
        raise MCPConfigError("mcpServers must be an object")

    normalized: dict[str, dict[str, Any]] = {}
    for raw_name, server in servers.items():
        name = _clean_name(raw_name)
        if name in normalized:
            raise MCPConfigError(f"duplicate MCP server name: {name}")
        normalized[name] = normalize_mcp_server(name, server)
    return normalized


def _payload_name(payload: dict[str, Any], fallback: str | None = None) -> str:
    return _clean_name(payload.get("name") or payload.get("id") or payload.get("key") or fallback)


def _result_failure(exc: Exception) -> Result:
    return Result(msg=str(exc)).failure()


def get_normalized_mcp_servers() -> dict[str, dict[str, Any]]:
    config = _read_config()
    return normalize_mcp_server_config(_server_map(config))


def get_mcp_servers() -> Result:
    try:
        return Result(data={MCP_SERVERS_KEY: get_normalized_mcp_servers()}).success()
    except Exception as exc:
        return _result_failure(exc)


def add_mcp_server(payload: dict[str, Any]) -> Result:
    try:
        name = _payload_name(payload)
        config = _read_config()
        servers = _server_map(config)
        if name in servers:
            raise MCPConfigError(f"MCP server already exists: {name}")
        servers[name] = normalize_mcp_server(name, payload)
        _write_config(config)
        return Result(data={MCP_SERVERS_KEY: servers}).success()
    except Exception as exc:
        return _result_failure(exc)


def update_mcp_server(name: str, payload: dict[str, Any]) -> Result:
    try:
        current_name = _clean_name(name)
        next_name = _payload_name(payload, current_name)
        config = _read_config()
        servers = _server_map(config)
        if current_name not in servers:
            raise MCPConfigError(f"MCP server not found: {current_name}")
        if next_name != current_name and next_name in servers:
            raise MCPConfigError(f"MCP server already exists: {next_name}")

        servers[next_name] = normalize_mcp_server(next_name, payload)
        if next_name != current_name:
            del servers[current_name]
        _write_config(config)
        return Result(data={MCP_SERVERS_KEY: servers}).success()
    except Exception as exc:
        return _result_failure(exc)


def delete_mcp_server(name: str) -> Result:
    try:
        server_name = _clean_name(name)
        config = _read_config()
        servers = _server_map(config)
        if server_name not in servers:
            raise MCPConfigError(f"MCP server not found: {server_name}")
        del servers[server_name]
        _write_config(config)
        return Result(data={MCP_SERVERS_KEY: servers}).success()
    except Exception as exc:
        return _result_failure(exc)


def set_mcp_server_enabled(name: str, enabled: bool) -> Result:
    try:
        server_name = _clean_name(name)
        config = _read_config()
        servers = _server_map(config)
        if server_name not in servers:
            raise MCPConfigError(f"MCP server not found: {server_name}")
        servers[server_name]["enabled"] = bool(enabled)
        _write_config(config)
        return Result(data={MCP_SERVERS_KEY: servers}).success()
    except Exception as exc:
        return _result_failure(exc)


def import_mcp_servers(payload: dict[str, Any]) -> Result:
    try:
        raw_servers = payload.get(MCP_SERVERS_KEY, payload)
        normalized = normalize_mcp_server_config(raw_servers)
        config = _read_config()
        servers = _server_map(config)
        servers.update(normalized)
        _write_config(config)
        return Result(data={MCP_SERVERS_KEY: servers}).success()
    except Exception as exc:
        return _result_failure(exc)


def build_adapter_server_config(server: dict[str, Any]) -> dict[str, Any]:
    transport = server.get("transport")
    if transport == "stdio":
        return {
            "transport": "stdio",
            "command": server["command"],
            "args": server.get("args", []),
            "env": server.get("env", {}),
        }
    if transport in REMOTE_TRANSPORTS:
        return {
            "transport": transport,
            "url": server["url"],
            "headers": server.get("headers", {}),
        }
    raise MCPConfigError(f"unsupported MCP transport: {transport}")
