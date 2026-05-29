from pydantic import BaseModel, Field


class AgentReq(BaseModel):

    # 模型名称
    model_name: str = ""

    # 消息
    human_message: str

    # 是否思考
    thinking: bool = False

    # 线程ID
    thread_id: str = "default"

    # 供应商
    supplier: str = "deepseek"

    # 附件列表
    attachments: list[str] = Field(default_factory=list)
