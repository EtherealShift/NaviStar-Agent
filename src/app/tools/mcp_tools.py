"""
MCP 工具构建（薄封装）。

将 MCPClientService 的 load_tools() 封装为一个便捷函数，
供需要加载 MCP 工具的外部模块调用。
"""

# from app.service.mcp_client_service import MCPClientService


# async def mcp_build_tools():
#     """从所有已配置的 MCP 服务加载工具列表。"""
#     tools, _ = await MCPClientService().load_tools()
#     return tools
