from pydantic import BaseModel, Field

from common.config.constants import DEFAULT_MODEL_NAME


class Attachment(BaseModel):
    file_id: str = ""
    name: str = ""
    filename: str = ""
    content_type: str = ""
    download_url: str = ""
    access_url: str = ""
    extension: str = ""
    size: int = 0


class AgentReq(BaseModel):

    # 模型名称
    model_name: str = DEFAULT_MODEL_NAME

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

    # 附件列表
    attachments: list[Attachment] = Field(default_factory=list)
