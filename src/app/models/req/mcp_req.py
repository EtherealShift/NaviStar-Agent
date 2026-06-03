from typing import Any

from pydantic import BaseModel, ConfigDict


class McpServerReq(BaseModel):
    model_config = ConfigDict(extra="allow")

    name: str | None = None
    id: str | None = None
    key: str | None = None
    enabled: bool | None = None
    transport: str | None = None
    type: str | None = None
    url: str | None = None
    headers: dict[str, Any] | None = None
    command: str | None = None
    args: list[str] | None = None
    env: dict[str, Any] | None = None
    description: str | None = None

    def to_payload(self) -> dict[str, Any]:
        return self.model_dump(exclude_none=True)


class McpEnabledReq(BaseModel):
    enabled: bool
