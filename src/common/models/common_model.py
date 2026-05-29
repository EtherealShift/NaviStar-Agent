"""
通用数据模型。

定义跨模块使用的核心数据结构
"""

from dataclasses import dataclass, field
from typing import Any

from langgraph.types import Checkpointer


@dataclass
class AgentModel:
    """
    组装 Agent 所需的所有配置参数。
    """
    # 模型供应商
    supplier: str
    # 模型名称
    model_name: str

    # 系统提示信息
    system_prompt: str

    # 检查点
    checkpointer: Checkpointer | None = None

    # 工具
    tools: list[Any] | None = None

    # 中间件
    middleware: list[Any] | None = None

    # 思考模式, {"type": "enabled"} 或 {"type": "disabled"}
    thinking: dict[str, str]  = field(default_factory={"type": "disabled"})
