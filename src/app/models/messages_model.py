import json
from dataclasses import dataclass

from langchain_core.messages import HumanMessage, ToolMessage, AIMessage
from pydantic import BaseModel, Field



class MessagesConversation(BaseModel):

    role: str = "Human"
    thread_id: str = "default"
    content: str = ""
    title: str = Field(default_factory=str)
    meta_data: dict = Field(default_factory=dict)




class MessagesModel:

    role: str
    content: str

    def __init__(self, msg=None):
        if isinstance(msg, HumanMessage):
            self.role = "Human"
            self.content = msg.content if isinstance(msg.content, str) else str(msg.content)
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