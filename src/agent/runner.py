"""
Agent 执行器。

本模块是 Agent 的创建入口。根据 AgentModel 中的模型名称自动匹配 provider，
创建对应的 LLM 实例，再通过 langchain.agents.create_agent 组装成可执行的 Agent。
"""

from langchain.agents import create_agent
from langchain_core.language_models import BaseChatModel
from langchain_deepseek import ChatDeepSeek
from langchain_openai import ChatOpenAI

from agent.middlewares.middleware import install_summarization_middleware
from app.middlewares.middleware import install_after_middlewares
from common.config.app_settings import AppSettings
from common.config.constants import ENV_PATH, MIMO_BASE_URL
from common.models.common_model import AgentModel
from common.utils.file_utils import config_yaml_path

llm: str | BaseChatModel


def _require_api_key(value: str, env_name: str) -> str:
    if value and value.strip():
        return value
    raise ValueError(f"{env_name} must be set in {ENV_PATH}.")


def create_agent_with(agent: AgentModel):
    """
    根据 AgentModel 配置组装一个可执行的 LangChain Agent。

    流程：
      1. 根据模型名称从 app_settings 匹配 provider。
      2. 创建对应 LLM
      3. 将 LLM + 工具 + 中间件 + checkpointer 组装成 Agent。
    """
    global llm

    # 获取配置
    settings = AppSettings()

    # 获取模型配置
    supplier_yaml = config_yaml_path().get("model", {})

    llm_kwargs = {
        "model": agent.model_name,
        "streaming": True,
        "thinking": agent.thinking,
        "temperature": supplier_yaml.get("temperature", 1.0),
        "reasoning_effort": supplier_yaml.get("reasoning_effort", "medium"),
    }

    if agent.supplier == "deepseek":
        llm_kwargs["api_key"] = _require_api_key(settings.deepseek_api_key, "DEEPSEEK_API_KEY")
        llm = ChatDeepSeek(**llm_kwargs)
    if agent.supplier == "mimo":
        llm_kwargs["api_key"] = _require_api_key(settings.mimo_api_key, "MIMO_API_KEY")
        llm_kwargs["base_url"] = MIMO_BASE_URL
        llm = ChatOpenAI(**llm_kwargs)


    # 安装中间件
    middlewares = install_summarization_middleware(llm)
    # 安装附加中间件
    install_after_middlewares(middlewares)

    return create_agent(
        model=llm,
        system_prompt=agent.system_prompt,
        tools=agent.tools or [],
        middleware=middlewares or [],
        checkpointer=agent.checkpointer,
    )
