from dataclasses import dataclass
from typing import Any

from langgraph.types import Checkpointer

@dataclass
class AgentModel:

    # 模型名称
    model_name: str

    # 系统提示信息
    system_prompt: str

    # 检查点
    checkpointer: Checkpointer

    # 工具
    tools: list[Any]

    # 中间件
    middleware: list[Any]

    # 思考模式, {"type": "enabled"} 或 {"type": "disabled"}
    thinking: dict[str, str] | None = None

    # 温度
    temperature: float = 0.7
