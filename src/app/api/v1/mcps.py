from typing import Any

from fastapi import APIRouter

from app.mcp.service import mcp_runtime, mcp_service
from app.models.req.mcp_req import McpEnabledReq, McpServerReq
from common.models.result import Result

mcpsRouter = APIRouter()


def _payload(req: McpServerReq) -> dict[str, Any]:
    return req.to_payload()


def _status_fallback(state: str, message: str) -> dict[str, Any]:
    return {"state": state, "message": message, "tool_count": 0, "tools": []}


async def _servers_with_status() -> Result:
    result = mcp_service.get_mcp_servers()
    if result.code != 200:
        return result

    fallback_status = _status_fallback("unknown", "not checked")
    try:
        status = await mcp_runtime.get_mcp_status()
    except Exception as exc:
        status = {}
        fallback_status = _status_fallback("error", str(exc))

    servers = result.data.get("mcpServers", {})
    enriched = {
        name: {
            "name": name,
            **server,
            "status": status.get(name, fallback_status),
        }
        for name, server in servers.items()
    }
    return Result(data={"mcpServers": enriched}).success()


@mcpsRouter.get("/servers")
async def get_mcp_servers() -> Result:
    return await _servers_with_status()


@mcpsRouter.post("/servers")
async def create_mcp_server(req: McpServerReq) -> Result:
    return mcp_service.add_mcp_server(_payload(req))


@mcpsRouter.put("/servers/{name}")
async def update_mcp_server(name: str, req: McpServerReq) -> Result:
    return mcp_service.update_mcp_server(name, _payload(req))


@mcpsRouter.delete("/servers/{name}")
async def delete_mcp_server(name: str) -> Result:
    return mcp_service.delete_mcp_server(name)


@mcpsRouter.put("/servers/{name}/enabled")
async def set_mcp_server_enabled(name: str, req: McpEnabledReq) -> Result:
    return mcp_service.set_mcp_server_enabled(name, req.enabled)


@mcpsRouter.post("/servers/import")
async def import_mcp_servers(payload: dict[str, Any]) -> Result:
    return mcp_service.import_mcp_servers(payload)


@mcpsRouter.get("/servers/status")
async def get_mcp_server_status() -> Result:
    return Result(data=await mcp_runtime.get_mcp_status()).success()
