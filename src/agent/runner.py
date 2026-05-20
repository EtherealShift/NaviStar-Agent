from langchain.agents import create_agent
from langchain_deepseek import ChatDeepSeek

from common.config.settings_config import require_deepseek_api_key
from common.models.common_model import AgentModel, MODEL_LIST

def create_agent_with(agent: AgentModel):
    provider = None

    # 选择服务商

    for candidate_provider, model_name in MODEL_LIST.items():
        if agent.model_name in model_name:
            provider = candidate_provider
            break

    if provider == "DEEPSEEK":
        require_deepseek_api_key()
        llm = ChatDeepSeek(
            model=agent.model_name,
            thinking=agent.thinking,
            streaming=True,
            temperature=agent.temperature,
        )
    else:
        raise ValueError(f"暂不支持的模型：{agent.model_name}")

    return create_agent(
        model=llm,
        system_prompt=agent.system_prompt,
        tools=agent.tools,
        middleware=agent.middleware,
        checkpointer=agent.checkpointer,
    )



