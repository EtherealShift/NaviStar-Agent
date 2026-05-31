import json

from langchain_mcp_adapters.client import MultiServerMCPClient
from loguru import logger

from common.config.constants import MCP_SERVER_PATH

TRANSPORT_ALIASES = {
    "command": "stdio",
    "local": "stdio",
    "stdio": "stdio",
    "http": "http",
    "streamable_http": "http",
    "streamablehttp": "http",
    "sse": "sse",
    "server_sent_events": "sse",
    "websocket": "websocket",
    "ws": "websocket",
}


def normalize_mcp_server_config(mcp_servers: dict) -> dict:
    """
    兼容 Claude/Codex/ModelScope 常见 MCP 配置。
    langchain-mcp-adapters 要求 transport 字段。
    """
    normalized = {}
    for name, config in mcp_servers.items():
        if not isinstance(config, dict):
            raise ValueError(f"MCP server config must be object: {name}")
        if config.get("enabled") is False:
            continue

        next_config = dict(config)
        kind = next_config.get("transport") or next_config.get("type")
        if not kind and "command" in next_config:
            kind = "stdio"

        transport = TRANSPORT_ALIASES.get(str(kind or "").strip().lower().replace("-", "_"))
        if not transport:
            raise ValueError(f"Unsupported MCP transport for {name}: {kind}")

        for field in ("type", "sourceType", "enabled", "status", "tools", "origin", "description", "id", "name"):
            next_config.pop(field, None)
        next_config["transport"] = transport
        normalized[name] = next_config

    return normalized


async def get_mcp_client():
    """
    mcp服务
    """

    with open(MCP_SERVER_PATH, "r", encoding="utf-8") as f:
        json_data = json.load(f)

    # 读取mcp服务器配置
    mcp_server = normalize_mcp_server_config(json_data["mcpServers"])

    logger.info(f"mcp server: {mcp_server}")

    # 创建mcp客户端
    client = MultiServerMCPClient(
        mcp_server,
    )

    return await client.get_tools()
