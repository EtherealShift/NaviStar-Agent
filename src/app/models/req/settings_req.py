from pydantic import BaseModel, Field


class ProviderSettings(BaseModel):
    api_key: str = Field(default="")


class ToolSettings(BaseModel):
    api_key: str = Field(default="")


class SettingsReq(BaseModel):
    providers: dict[str, ProviderSettings] = Field(default_factory=dict)
    tools: dict[str, ToolSettings] = Field(default_factory=dict)
    mcp: dict = Field(default_factory=dict)
