from typing import Any

from pydantic import BaseModel


class Result(BaseModel):
    code: int = 200
    data: Any = None
    msg: str = "success"

    def success(self) -> "Result":
        return Result(code=self.code, data=self.data, msg=self.msg if self.msg != "success" else "success")

    def failure(self) -> "Result":
        return Result(code=400, data=self.data, msg=self.msg or "failure")
