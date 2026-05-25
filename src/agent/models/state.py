from typing import Annotated, TypedDict, Optional
from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage


class MultiAgentState(TypedDict):
    """
    所有子 Agent 共享的全局状态。
    ┌─────────────┬──────────────────────────────────────┐
    │ 字段         │ 说明                                  │
    ├─────────────┼──────────────────────────────────────┤
    │ messages     │ 对话历史，add_messages 合并器自动追加 │
    │ next_agent  │ 路由标记，告诉 Router 下一步跳哪个节点 │
    │ task_context │ 可选：任务上下文，各 Agent 可写入结构化 │
    │              │ 数据供下游 Agent 读取                 │
    └─────────────┴──────────────────────────────────────┘
    """
    messages: Annotated[list[BaseMessage], add_messages]

    next_agent: str

    task_context: Optional[str]