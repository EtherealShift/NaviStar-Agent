from pydantic import BaseModel


class AgentReq(BaseModel):

    # 模型名称
    model_name: str

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