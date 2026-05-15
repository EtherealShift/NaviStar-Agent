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

    # 是否思考
    thinking: bool = False

    # 温度
    temperature: float = 0.7





# 模型列表字典
MODEL_LIST = {
    "DEEPSEEK": [
        "deepseek-v4-pro",
        "deepseek-v4-flash"
    ]
}

