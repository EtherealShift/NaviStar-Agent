from datetime import datetime
from pydantic import BaseModel, Field


class QueryResp(BaseModel):
    """
    查询会话响应
    """
    code: int
    msg: str
    data: list["ConversationList"] = Field(default_factory=list)


class ConversationList(BaseModel):
    """
    会话列表
    """
    thread_id: str

    title: str

    created_at: datetime

    updated_at: datetime
