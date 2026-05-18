from dataclasses import dataclass

from pydantic import BaseModel


@dataclass
class QueryReq(BaseModel):
    """查询会话请求"""
    thread_id: str