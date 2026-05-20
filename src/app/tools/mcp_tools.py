from langchain_mcp_adapters.client import MultiServerMCPClient

from common.config.mcp_config import read_mcp_config


async def mcp_build_tools():
    mcp_tools = read_mcp_config()
    mcp_servers = mcp_tools.get("mcpServers")
    mcp = {}
    if not mcp_servers:
        return []

    for mcp_server_name, mcp_server_info in mcp_servers.items():
        mcp[mcp_server_name] = {}
        for key, value in mcp_server_info.items():
            if key == "type" and value == "streamable_http":
                mcp[mcp_server_name]["transport"] = "http"
            else:
                mcp[mcp_server_name][key] = value

    client = MultiServerMCPClient(mcp)
    return await client.get_tools()
