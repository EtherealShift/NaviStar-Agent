
"""
Agent 中间件配置

为什么需要这个模块？
  中间件在 Agent 处理消息的前后插入额外逻辑（如自动摘要），
  防止上下文窗口被长对话撑爆。

当前中间件：
  - SummarizationMiddleware → 对话超过 3000 token 时自动摘要，保留最近 20 条
"""


from loguru import logger
from langchain.agents.middleware import SummarizationMiddleware, after_agent
from langchain_deepseek import ChatDeepSeek



def install_builtin_middlewares():
    """
    官方内置中间件：自动摘要对话上下文
    使用独立的 summarization 模型，并设置触发/保留策略。
    """
    summarizer = SummarizationMiddleware(
        model=ChatDeepSeek(model="deepseek-v4-flash", temperature=0.7),
        max_tokens_before_summary=3000,
        messages_to_keep=20,
    )
    logger.info("中间件就绪：SummarizationMiddleware")
    return [summarizer]


def install_middlewares() -> list:
    """安装所有中间件，返回列表供 Agent 使用。"""
    logger.info("[中间件] 开始安装默认中间件栈")
    middlewares = []

    middlewares.extend(install_builtin_middlewares())
    logger.info("[中间件] 官方内置中间件添加完成")
    return middlewares