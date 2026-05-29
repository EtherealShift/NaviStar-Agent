import asyncio
import json
from datetime import datetime

from langchain.agents import create_agent
from langchain_core.messages import HumanMessage, ImageContentBlock, PlainTextContentBlock
from langchain_core.runnables import RunnableConfig
from langchain_deepseek import ChatDeepSeek
from langchain_openai import ChatOpenAI
from loguru import logger
from openai import OpenAI

from agent.memory.memory import get_checkpoint
from agent.middlewares.middleware import install_summarization_middleware
from agent.prompys.system_prompt import SYSTEM_PROMPT
from app.database.conversatuon_db import del_message_content, query_conversation, get_query_content_list
from app.middlewares.middleware import install_after_middlewares
from app.models.enty.conversation_messages import Conversation
from app.models.req.agent_req import AgentReq
from app.models.resp.query_resp import ConversationList
from common.config.app_settings import AppSettings
from common.config.constants import DEEPSEEK_BASE_URL, MIMO_BASE_URL
from common.models.file_model import MimeModel
from common.models.result import Result
import base64

from common.utils.file_utils import supplier_yaml_path

_thinking: dict[str, str] = {"type": "disabled"}


async def get_checkpointer_dep():
    return await get_checkpoint()


def _stream_payload(payload: dict) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


def _build_human_message(req: AgentReq) -> HumanMessage:
    """
    构建用户消息
    """
    file_paths = req.attachments

    content_blocks = []

    mime_list =[]
    for file_path in file_paths:
        mime_list.append(MimeModel(file_path))


    for mime in mime_list:
        base64_image = base64.b64encode(open(mime.file_path, "rb").read()).decode('utf-8')
        if mime.file_type == "image":
            content_blocks.append(
                ImageContentBlock(
                    type="image",
                    mime_type=mime.mime_type,
                    base64=base64_image
                )
            )
        if mime.file_path == "plaintext":
            content_blocks.append(
                PlainTextContentBlock(
                    type="text-plain",
                    mime_type=mime.mime_type,
                    base64=base64_image
                )
            )

    return HumanMessage(
        content=req.human_message,
        content_blocks=content_blocks
    )




async def chat_stream(req: AgentReq):
    """
    根据请求生成对话流
    :param req:
    """
    async def event_generator():
        global _thinking, llm
        try:
            # 开启思考模式
            if req.thinking:
                logger.info("Thinking...")
                _thinking = {"type": "enabled"}

            # 启用网络工具 已默认装载 联网模块
            # if req.is_network:
            #     logger.info("Network tools enabled.")
            # logger.info("Skill report: {}", skill_report)


            checkpointer = await get_checkpointer_dep()

            # 获取配置
            settings = AppSettings()

            # 获取模型配置
            supplier_yaml = supplier_yaml_path().get("model", {})

            llm_kwargs = {
                "model": req.model_name,
                "thinking": req.thinking,
                "streaming": True,
                "temperature": supplier_yaml.get("temperature", 1.0) ,
                "reasoning_effort": supplier_yaml.get("reasoning_effort", "medium") ,
            }

            if req.supplier == "deepseek":
                llm = ChatDeepSeek(**llm_kwargs)
            if req.supplier == "openai":
                llm = ChatOpenAI(**llm_kwargs)
            if req.supplier == "xiaomi":
                llm_kwargs["api_key"] = settings.mimo_api_key
                llm_kwargs["base_url"] = MIMO_BASE_URL
                llm = ChatOpenAI(**llm_kwargs)

            # 安装中间件
            middlewares = install_summarization_middleware(llm)
            # 安装附加中间件
            install_after_middlewares(middlewares)


            agent = create_agent(
                model=llm,
                checkpointer=checkpointer,
                middleware=middlewares,
                system_prompt=SYSTEM_PROMPT.format(
                    today=datetime.now().strftime("%Y年%m月%d日")
                ),
                tools=[],
            )

            state = {"messages": [_build_human_message(req)]}
            # 状态
            config: RunnableConfig = {"configurable": {"thread_id": req.thread_id}, "recursion_limit": 100}

            async for event in agent.astream_events(state, config, version="v2"):
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
    settings = AppSettings()

    # 获取当前模型列表
    model_list = []

    deepseek_models = OpenAI(
        api_key=settings.deepseek_api_key,
        base_url=DEEPSEEK_BASE_URL,
    ).models.list()

    for model in deepseek_models:
        model_list.append(model.id)

    # 添加其他模型列表
    model_list.append("xiaomi-v2.5-pro")
    model_list.append("xiaomi-v2.5")

    logger.info("Model list: {}", model_list)

    return Result(data="").success()

if __name__ == "__main__":
    asyncio.run(chat_model_list())
