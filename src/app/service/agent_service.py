import json
from datetime import datetime

from langchain_core.messages import HumanMessage

from agent.middlewares.middleware import install_middlewares
from agent.prompys.system_prompt import SYSTEM_PROMPT
from agent.runner import create_agent_with
from agent.tools.tools import install_tools, get_network_tools
from app.models.req.agent_req import AgentReq
from loguru import logger

from common.memory.memory import get_checkpoint
from common.models.common_model import AgentModel
from common.models.result import Result


async def get_checkpointer_dep():
    return await get_checkpoint()


async def chat_stream(req: AgentReq):
    """
    根据请求生成对话流
    :param req:
    """
    tools = await install_tools()

    if req.thinking:
        logger.info("Thinking...")
        get_network_tools(tools)

    logger.info(f"tools: {[t.name for t in tools]}")

    checkpointer = await get_checkpointer_dep()
    middlewares = install_middlewares()
    # install_after_middlewares(middlewares)

    system_prompt = req.system_prompt or SYSTEM_PROMPT.format(
        today=datetime.now().strftime("%Y年%m月%d日")
    )

    agent = create_agent_with(
        AgentModel(
            model_name=req.model_name,
            system_prompt=system_prompt,
            tools=tools,
            checkpointer=checkpointer,
            middleware=middlewares,
            temperature=req.temperature,
            thinking=req.thinking
        )
    )

    state = {"messages": [HumanMessage(content=req.human_message)]}
    config = {"configurable": {"thread_id": req.thread_id}}

    async def event_generator():
        try:
            async for event in agent.astream_events(state, config, version="v2"):
                chunk = event.get("data", {}).get("chunk")
                if chunk and hasattr(chunk, "content") and chunk.content:
                    reasoning = None
                    if hasattr(chunk, "additional_kwargs"):
                        reasoning = chunk.additional_kwargs.get("reasoning_content")

                    if reasoning and isinstance(reasoning, str) and reasoning.strip():
                        payload = json.dumps(
                            {"type": "thinking", "content": reasoning},
                            ensure_ascii=False,
                        )
                        yield f"data: {payload}\n\n"
                    else:
                        payload = json.dumps(
                            {"type": "text", "content": chunk.content},
                            ensure_ascii=False,
                        )
                        yield f"data: {payload}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            logger.error("流式输出异常: {}", e)
            yield f'data: {{"error": "{e}"}}\n\n'

    return event_generator()


async def chat_delete(thread_id: str):
    """
    根据线程ID删除对话
    :param thread_id:
    """
    checkpointer = await get_checkpointer_dep()

    await checkpointer.adelete_thread(thread_id)

    return Result(msg=f"Thread {thread_id} deleted.").success()


