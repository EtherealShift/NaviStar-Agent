from pydantic import BaseModel, Field


class Attachment(BaseModel):
    filename: str
    content_type: str
    access_url: str
    size: int


class AgentReq(BaseModel):

    # 模型名称
    model_name: str = "deepseek-v4-flash"

    # 消息
    human_message: str

    # 系统提示信息
    system_prompt: str = ""

    # 是否思考
    thinking: bool = False

    # 温度
    temperature: float = 0.7

    # 线程ID
    thread_id: str = "default"

    # 是否联网
    is_network: bool = False

    # 是否深度思考
    is_thinking: bool = False

    # 附件列表
    attachments: list[Attachment] = Field(default_factory=list)