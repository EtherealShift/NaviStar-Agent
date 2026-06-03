import asyncio
import json
from pathlib import Path
from datetime import datetime

import yaml
from langchain_core.messages import HumanMessage
from langchain_core.runnables import RunnableConfig
from loguru import logger
from openai import OpenAI
from agent.memory.memory import get_checkpoint
from agent.prompys.system_prompt import SYSTEM_PROMPT
from agent.runner import create_agent_with
from agent.tools.tools import install_tools
from app.database.conversatuon_db import del_message_content, query_conversation, get_query_content_list
from app.mcp.service.mcp_runtime import get_mcp_client
from app.models.enty.conversation_messages import Conversation
from app.models.req.agent_req import AgentReq
from app.models.resp.query_resp import ConversationList
from common.config.app_settings import AppSettings
from common.config.constants import DEEPSEEK_BASE_URL,  CONFIG_YAML_PATH
from common.models.common_model import AgentModel
from common.models.file_model import MimeModel
from common.models.result import Result
import base64

from common.utils.file_utils import config_yaml_path


def _require_api_key(value: str, env_name: str) -> str:
    if value and value.strip():
        return value
    raise ValueError(f"{env_name} must be set in src/resources/.env or saved from Settings.")


async def get_checkpointer_dep():
    return await get_checkpoint()


def _stream_payload(payload: dict) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


def _thinking_config(enabled: bool) -> dict[str, str]:
    """
    构建思考模式配置
    """
    logger.info("Thinking mode: {}", "enabled" if enabled else "disabled")
    return {"type": "enabled" if enabled else "disabled"}


def _build_human_message(req: AgentReq) -> HumanMessage:
    """
    构建用户消息
    """
    file_paths = req.attachments or []
    display_content = req.human_message or ""

    if not file_paths:
        return HumanMessage(
            content=display_content,
            additional_kwargs={"display_content": display_content},
        )

    content_blocks: list[dict] = []
    if display_content:
        content_blocks.append({"type": "text", "text": display_content})

    for file_path in file_paths:
        mime = MimeModel(file_path)
        raw = Path(mime.file_path).read_bytes()
        encoded = base64.b64encode(raw).decode("utf-8")

        if mime.file_type == "image":
            content_blocks.append({
                "type": "image",
                "source_type": "base64",
                "mime_type": mime.mime_type,
                "data": encoded,
            })
        else:
            content_blocks.append({
                "type": "file",
                "mime_type": mime.mime_type,
                "filename": Path(mime.file_path).name,
                "data": encoded,
            })

    return HumanMessage(
        content=content_blocks,
        additional_kwargs={
            "display_content": display_content,
            "attachments": file_paths,
        },
    )




async def chat_stream(req: AgentReq):
    """
    根据请求生成对话流
    :param req:
    """
    async def event_generator():
        try:
            # 思考模式
            thinking_config = _thinking_config(req.thinking)

            checkpointer = await get_checkpointer_dep()

            settings = config_yaml_path()

            if req.supplier and req.supplier != settings.get("model").get("supplier"):
                settings.get("model")["supplier"] = req.supplier
            if req.reasoning_effort and req.reasoning_effort != settings.get("model").get("reasoning_effort"):
                settings.get("model")["reasoning_effort"] = req.reasoning_effort
            if req.model_name and req.model_name != settings.get("model").get("model_name"):
                settings.get("model")["model_name"] = req.model_name
            try:
                with open(CONFIG_YAML_PATH, "w+") as f:
                    yaml.dump(settings, f, default_flow_style=False)
            except Exception as e:
                logger.error(e)

            # 装载工具
            tools = await install_tools()
            # 装载mcp服务
            tools.extend(await get_mcp_client())

            # 创建代理
            agent = create_agent_with(
                AgentModel(
                    supplier=req.supplier,
                    model_name=req.model_name,
                    system_prompt=SYSTEM_PROMPT.format(
                        today=datetime.now().strftime("%Y年%m月%d日"),
                    ),
                    thinking=thinking_config,
                    checkpointer=checkpointer,
                    tools=tools,
                )
            )


            state = {"messages": [_build_human_message(req)]}
            # 状态
            config: RunnableConfig = {"configurable": {"thread_id": req.thread_id}, "recursion_limit": 100}

            async for event in agent.astream_events(state, config, version="v2"):
                chunk = event.get("data", {}).get("chunk")
                if chunk and hasattr(chunk, "content") and chunk.content:
                    yield _stream_payload({"type": "AI", "content": chunk.content})
                if chunk and hasattr(chunk, "additional_kwargs") and chunk.additional_kwargs.get("reasoning_content"):
                        yield _stream_payload({"type": "AI_Thinking", "content": chunk.additional_kwargs.get("reasoning_content")})
            yield "data: [DONE]\n\n"
        except Exception as e:
            ex_msg = str(e)
            if hasattr(e, 'exceptions'):
                ex_msg = str(e.exceptions)
            logger.error("流式输出异常: {}", ex_msg)
            yield _stream_payload({"error": ex_msg})

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
    model_list = {}

    deepseek_models = OpenAI(
        api_key=_require_api_key(settings.deepseek_api_key, "DEEPSEEK_API_KEY"),
        base_url=DEEPSEEK_BASE_URL,
    ).models.list()

    model_list["deepseek"] = [model.id for model in deepseek_models]

    # 添加其他模型列表
    model_list["mimo"] = ["mimo-v2.5-pro", "mimo-v2.5"]

    logger.info("Model list: {}", model_list)

    return Result(data=model_list).success()

if __name__ == "__main__":
    asyncio.run(chat_model_list())
