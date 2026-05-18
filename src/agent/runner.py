from langchain.agents import create_agent
from langchain_deepseek import ChatDeepSeek

from common.models.common_model import AgentModel, MODEL_LIST

global _MODEL, _llm

def create_agent_with(agent: AgentModel):

    # 选择服务商

    global _MODEL, _llm
    for provider, model_name in MODEL_LIST.items():
        if agent.model_name in model_name:
            _MODEL = provider

    if _MODEL == "DEEPSEEK":
        _llm = ChatDeepSeek(
            model=agent.model_name,
            thinking=agent.thinking,
            streaming=True,
            temperature=agent.temperature,
        )



    return create_agent(
        model=_llm,
        system_prompt=agent.system_prompt,
        tools=agent.tools,
        middleware=agent.middleware,
        checkpointer=agent.checkpointer,
    )



