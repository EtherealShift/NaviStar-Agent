"""
会话消息模型。

MessagesModel 将 LangChain 的原生消息（HumanMessage/AIMessage/ToolMessage）
转换为与数据库存储对齐的内部表示。MessageContentModel 是查询会话时的返回模型。
"""

import json

from langchain_core.messages import HumanMessage, ToolMessage, AIMessage
from pydantic import BaseModel, Field


def _stringify_human_content(content) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for block in content:
            if isinstance(block, dict):
                text = block.get("text") or block.get("content")
                if isinstance(text, str):
                    parts.append(text)
            elif isinstance(block, str):
                parts.append(block)
        return "\n".join(parts) if parts else ""
    return str(content)


class MessagesConversation(BaseModel):
    """一次持久化操作的会话消息载体。

    role:       Human / AI / AI_Thinking / Tool
    thread_id:  所属对话线程 ID
    content:    消息文本
    title:      对话标题（用于列表展示）
    meta_data:  附加元数据（附件、生成文件等）
    """
    role: str = "Human"
    thread_id: str = "default"
    content: str = ""
    title: str = Field(default_factory=str)
    meta_data: dict = Field(default_factory=dict)




class MessagesModel:

    role: str
    content: str
    meta_data: dict

    def __init__(self, msg=None):
        self.meta_data = {}
        if isinstance(msg, HumanMessage):
            self.role = "Human"
            display_content = msg.additional_kwargs.get("display_content")
            self.content = display_content if isinstance(display_content, str) else _stringify_human_content(msg.content)
            attachments = msg.additional_kwargs.get("attachments")
            if attachments:
                self.meta_data["files"] = attachments
        elif isinstance(msg, ToolMessage):
            self.role = "Tool"
            self.content = msg.content if isinstance(msg.content, str) else str(msg.content)
        elif isinstance(msg, AIMessage):
            self.role = "AI"
            reasoning = msg.additional_kwargs.get("reasoning_content")
            if reasoning and isinstance(reasoning, str) and reasoning.strip():
                self.role = "AI_Thinking"
                self.content = reasoning
            else:
                self.content = msg.content if isinstance(msg.content, str) else str(msg.content)
        else:
            self.role = ""
            self.content = ""

    def __str__(self):
        return str(self.__dict__)

    def __repr__(self):
        return str(self.__dict__)

    def to_dict(self):
        return {
            "role": self.role,
            "content": self.content
        }

    def to_json(self):
        return json.dumps(self.to_dict())


class MessageContentModel(BaseModel):
    thread_id: str # 线程id
    group_id: int  # 分组id
    role: str # 角色
    content: str # 内容
    msg_order: int # 消息顺序
    created_at: str | None # 创建时间
    meta_data: dict = Field(default_factory=dict) # 元数据，不展示


    def __str__(self):
        return str(self.__dict__)

    def __repr__(self):
        return str(self.__dict__)
