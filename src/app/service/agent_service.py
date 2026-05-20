import json
from datetime import datetime

from langchain_core.messages import HumanMessage

from agent.middlewares.middleware import install_middlewares
from agent.prompys.system_prompt import SYSTEM_PROMPT
from agent.runner import create_agent_with
from agent.tools.tools import install_tools, get_network_tools
from app.database.conversatuon_db import del_message_content, query_conversation, get_query_content_list
from app.middlewares.middleware import install_after_middlewares
from app.models.enty.conversation_messages import Conversation
from app.models.req.agent_req import AgentReq
from loguru import logger

from app.models.resp.query_resp import ConversationList
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

    thinking: dict[str, str] = {"type": "disabled"}

    if req.thinking:
        logger.info("Thinking...")
        thinking = {"type": "enabled"}

    if req.is_network:
        logger.info("Network tools enabled.")
        get_network_tools(tools)

    logger.info(f"tools: {[t.name for t in tools]}")

    checkpointer = await get_checkpointer_dep()
    middlewares = install_middlewares()

    install_after_middlewares(middlewares)

    system_prompt = req.system_prompt or SYSTEM_PROMPT.format(
        today=datetime.now().strftime("%Y年%m月%d日")
    )

    model_name = req.model_name or "deepseek-v4-flash"

    agent = create_agent_with(
        AgentModel(
            model_name=model_name,
            system_prompt=system_prompt,
            tools=tools,
            checkpointer=checkpointer,
            middleware=middlewares,
            temperature=req.temperature,
            thinking=thinking
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

    # 删除信息
    result = await del_message_content(thread_id)

    if result.code != 200:
        return Result(msg=f"Thread {thread_id} delete failed.").failure()

    return Result(msg=f"Thread {thread_id} deleted.").success()



async def chat_query(thread_id: str) -> Result:
    """
    根据线程ID查询对话
    :param thread_id:
    """
    result = await query_conversation(thread_id)

    if result.code != 200:
        return Result(msg=f"Thread {thread_id} query failed.").failure()


    return result




async def chat_conversation_list() -> Result:
    """
    获取会话列表
    """
    result = await get_query_content_list()

    if result.code != 200:
        return Result(msg="Failed to get conversation list").failure()

    conversation: list[Conversation] = result.data

    conversation_list: list[ConversationList] = []

    for item in conversation:
        conversation_list.append(ConversationList(
            thread_id=item.thread_id,
            title=item.title,
            created_at=item.created_at,
            updated_at=item.updated_at,
            is_network=False,
            is_thinking=False,
        ))



    return Result(data=conversation_list).success()




