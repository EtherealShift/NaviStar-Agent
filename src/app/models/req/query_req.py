from pydantic import BaseModel


class QueryReq(BaseModel):
    """查询会话请求"""
    thread_id: str