from typing import Any

from langchain_core.tools import BaseTool
from langchain_mcp_adapters.client import MultiServerMCPClient
from loguru import logger

from app.mcp.service.mcp_service import (
    build_adapter_server_config,
    get_normalized_mcp_servers,
)


def _tool_names(tools: list[BaseTool]) -> list[str]:
    return [str(getattr(tool, "name", tool)) for tool in tools]


async def _load_server_tools(name: str, server: dict[str, Any]) -> tuple[list[BaseTool], dict[str, Any]]:
    if not server.get("enabled", True):
        return [], {
            "state": "disabled",
            "message": "MCP server is disabled",
            "tool_count": 0,
            "tools": [],
        }

    try:
        adapter_config = build_adapter_server_config(server)
        client = MultiServerMCPClient({name: adapter_config})
        tools = await client.get_tools()
        names = _tool_names(tools)
        return tools, {
            "state": "connected",
            "message": "connected",
            "tool_count": len(tools),
            "tools": names,
        }
    except Exception as exc:
        logger.warning("MCP server '{}' failed to load: {}", name, exc)
        return [], {
            "state": "error",
            "message": str(exc),
            "tool_count": 0,
            "tools": [],
        }


async def get_mcp_status() -> dict[str, dict[str, Any]]:
    servers = get_normalized_mcp_servers()
    status: dict[str, dict[str, Any]] = {}
    for name, server in servers.items():
        _, server_status = await _load_server_tools(name, server)
        status[name] = server_status
    return status


async def get_mcp_client() -> list[BaseTool]:
    servers = get_normalized_mcp_servers()
    tools: list[BaseTool] = []
    for name, server in servers.items():
        server_tools, server_status = await _load_server_tools(name, server)
        if server_status["state"] == "connected":
            tools.extend(server_tools)
    return tools
