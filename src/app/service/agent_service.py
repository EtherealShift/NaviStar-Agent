import json
from datetime import datetime
from pathlib import Path

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
from app.service.generated_file_service import extract_generated_files, get_registered_file
from app.tools.mcp_tools import mcp_build_tools
from common.config.constants import DEFAULT_MODEL_NAME, MODEL_LIST
from common.config.settings_config import require_deepseek_api_key
from common.memory.memory import get_checkpoint
from common.models.common_model import AgentModel
from common.models.result import Result


async def get_checkpointer_dep():
    return await get_checkpoint()


def _stream_payload(payload: dict) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


def _build_attachment_prompt(req: AgentReq) -> str:
    if not req.attachments:
        return req.human_message

    display_message = req.human_message.strip() or "请处理这些附件。"
    lines = [
        display_message,
        "",
        "用户已上传以下附件，可按需读取和分析：",
    ]
    for index, attachment in enumerate(req.attachments, start=1):
        file_info = get_registered_file(attachment.file_id)
        file_path = file_info.get("path") if file_info else ""
        name = attachment.name or attachment.filename or (file_info or {}).get("name") or "未命名文件"
        content_type = attachment.content_type or (file_info or {}).get("content_type") or "application/octet-stream"
        size = attachment.size or int((file_info or {}).get("size") or 0)
        extension = attachment.extension or Path(name).suffix

        lines.append(
            f"{index}. {name} | 类型: {content_type} | 大小: {size} bytes"
            f" | 扩展名: {extension or '未知'} | file_id: {attachment.file_id}"
        )
        if file_path:
            lines.append(f"   本地路径: {file_path}")

    lines.append("如需处理 Excel，请优先调用 excel_agent，并把上述本地路径一并交给它。")
    return "\n".join(lines)


def _build_human_message(req: AgentReq) -> HumanMessage:
    content = _build_attachment_prompt(req)
    additional_kwargs = {"display_content": req.human_message.strip() or "请处理这些附件。"}
    if req.attachments:
        additional_kwargs["attachments"] = [
            attachment.model_dump(exclude_none=True) for attachment in req.attachments
        ]
    return HumanMessage(content=content, additional_kwargs=additional_kwargs)


async def chat_stream(req: AgentReq):
    """
    根据请求生成对话流
    :param req:
    """
    async def event_generator():
        try:
            require_deepseek_api_key()
            tools = await install_tools()

            thinking: dict[str, str] = {"type": "disabled"}

            if req.thinking:
                logger.info("Thinking...")
                thinking = {"type": "enabled"}

            if req.is_network:
                logger.info("Network tools enabled.")
                get_network_tools(tools)

            logger.info(f"tools: {[t.name for t in tools]}")
            tools.extend(await mcp_build_tools())
            checkpointer = await get_checkpointer_dep()
            middlewares = install_middlewares()

            install_after_middlewares(middlewares)
            logger.info(f"tools: {[t.name for t in tools]}")
            system_prompt = req.system_prompt or SYSTEM_PROMPT.format(
                today=datetime.now().strftime("%Y年%m月%d日")
            )

            model_name = req.model_name or DEFAULT_MODEL_NAME

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

            state = {"messages": [_build_human_message(req)]}
            config = {"configurable": {"thread_id": req.thread_id}, "recursion_limit": 100}
            streamed_file_ids = set()

            async for event in agent.astream_events(state, config, version="v2"):
                for file_info in extract_generated_files(event.get("data")):
                    file_id = file_info.get("file_id")
                    if file_id in streamed_file_ids:
                        continue
                    streamed_file_ids.add(file_id)
                    yield _stream_payload({"type": "file", "content": file_info})

                chunk = event.get("data", {}).get("chunk")
                if chunk and hasattr(chunk, "content") and chunk.content:
                    yield _stream_payload({"type": "text", "content": chunk.content})
                if chunk and hasattr(chunk, "additional_kwargs") and chunk.additional_kwargs:
                    yield _stream_payload({"type": "thinking", "content": chunk.additional_kwargs})
            yield "data: [DONE]\n\n"
        except Exception as e:
            ex_msg = str(e)
            if hasattr(e, 'exceptions'):
                ex_msg = str(e.exceptions)
            logger.error("流式输出异常: {}", ex_msg)
            yield f'data: {{"error": "{ex_msg}"}}\n\n'

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
        ))



    return Result(data=conversation_list).success()


async def chat_model_list() -> Result:
    """
    获取模型列表
    """
    return Result(data=MODEL_LIST).success()


