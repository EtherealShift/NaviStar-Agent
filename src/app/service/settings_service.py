from app.models.req.settings_req import SettingsReq
from common.config.mcp_config import public_mcp_config, read_mcp_config, save_mcp_config
from common.config.settings_config import public_settings, read_settings, save_settings
from common.models.result import Result


async def get_settings() -> Result:
    data = public_settings(read_settings())
    data["mcp"] = public_mcp_config(read_mcp_config())
    return Result(data=data).success()


async def update_settings(req: SettingsReq) -> Result:
    values = {}
    deepseek = req.providers.get("DEEPSEEK") or req.providers.get("deepseek")
    tavily = req.tools.get("TAVILY") or req.tools.get("tavily")

    if deepseek is not None:
        values["DEEPSEEK_API_KEY"] = deepseek.api_key
    if tavily is not None:
        values["TAVILY_API_KEY"] = tavily.api_key

    settings = save_settings(values)
    mcp_config = read_mcp_config()
    if req.mcp:
        next_mcp_config = req.mcp.get("config") if isinstance(req.mcp.get("config"), dict) else req.mcp
        mcp_config = save_mcp_config(next_mcp_config)

    data = public_settings(settings)
    data["mcp"] = public_mcp_config(mcp_config)
    return Result(data=data, msg="Settings saved.").success()
