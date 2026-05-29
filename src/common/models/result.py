"""
统一 API 响应模型。

所有 API 路由通过 Result 类返回一致的 JSON 结构（code + data + msg），
避免不同接口返回格式不一致的问题。
"""

from typing import Any

from pydantic import BaseModel


class Result(BaseModel):
    """标准 API 响应体。

    code: HTTP 语义的状态码（200 = 成功，400 = 失败）
    data: 响应数据，任意类型
    msg:  描述信息
    """
    code: int = 200
    data: Any = None
    msg: str = "success"

    def success(self) -> "Result":
        """标记为成功（code=200）。"""
        return Result(code=200, data=self.data, msg=self.msg or "success")

    def failure(self) -> "Result":
        """标记为失败（code=400）。"""
        return Result(code=400, data=self.data, msg=self.msg or "failure")
