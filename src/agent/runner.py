"""
Agent 执行器。

本模块是 Agent 的创建入口。根据 AgentModel 中的模型名称自动匹配 provider，
创建对应的 LLM 实例，再通过 langchain.agents.create_agent 组装成可执行的 Agent。
"""

from langchain.agents import create_agent
from langchain_core.language_models import BaseChatModel
from langchain_deepseek import ChatDeepSeek
from langchain_openai import ChatOpenAI

from common.config.app_settings import AppSettings
from common.config.constants import MIMO_BASE_URL
from common.models.common_model import AgentModel
llm: str | BaseChatModel

def create_agent_with(agent: AgentModel):
    """
    根据 AgentModel 配置组装一个可执行的 LangChain Agent。

    流程：
      1. 根据模型名称从 app_settings 匹配 provider。
      2. 创建对应 LLM
      3. 将 LLM + 工具 + 中间件 + checkpointer 组装成 Agent。
    """
    global llm

    settings = AppSettings()

    llm_kwargs = {
        "model": agent.model_name,
        "thinking": agent.thinking,
        "streaming": True,
        "temperature": agent.temperature if agent.temperature is not None else 1.0,
        "reasoning_effort": agent.reasoning_effort if agent.reasoning_effort is not None else "medium",
    }

    if agent.supplier == "deepseek":
        llm =  ChatDeepSeek(**llm_kwargs)
    if agent.supplier == "openai":
        llm = ChatOpenAI(**llm_kwargs)
    if agent.supplier == "mimo":
        llm_kwargs["api_key"] = settings.mimo_api_key
        llm_kwargs["base_url"] = MIMO_BASE_URL
        llm = ChatOpenAI(**llm_kwargs)

    return create_agent(
        model=llm,
        system_prompt=agent.system_prompt,
        tools=agent.tools or [],
        middleware=agent.middleware or [],
        checkpointer=agent.checkpointer,
    )
