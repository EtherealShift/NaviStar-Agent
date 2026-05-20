from langchain.agents import AgentState
from langchain.agents.middleware import after_agent
from langchain_core.messages import HumanMessage, AIMessage, ToolMessage
from langgraph.runtime import Runtime
from loguru import logger

from app.database.conversatuon_db import save_conversation
from app.models.messages_model import MessagesModel, MessagesConversation


def _build_conversation_title(content: str) -> str:
    title = " ".join(content.strip().split())
    if not title:
        return "新对话"

    title = title.strip("「」『』“”\"'`，。！？、,.!?;；:：")
    return title[:24] or "新对话"


async def _save_conversation(state: AgentState, runtime: Runtime):
    messages = state.get("messages")
    thread_id = runtime.execution_info.thread_id or ""

    if not messages:
        logger.info("[中间件] 无消息，跳过持久化")
        return

    last_human_idx = None
    for i in range(len(messages) - 1, -1, -1):
        if isinstance(messages[i], HumanMessage):
            last_human_idx = i
            break

    if last_human_idx is None:
        logger.info("[中间件] 没有找到 HumanMessage，跳过持久化")
        return

    recent_messages = messages[last_human_idx:]
    human_content = messages[last_human_idx].content
    if not isinstance(human_content, str):
        human_content = str(human_content)
    conversation_title = _build_conversation_title(human_content)

    records: list[MessagesModel] = []

    for msg in recent_messages:

        # AI 消息
        if isinstance(msg, AIMessage):
            # 思考内容
            reasoning = msg.additional_kwargs.get("reasoning_content")
            if reasoning and isinstance(reasoning, str) and reasoning.strip():
                thinking_model = MessagesModel(msg)
                thinking_model.role = "AI_Thinking"
                thinking_model.content = reasoning
                records.append(thinking_model)

            # 输出内容
            output_content = msg.content if isinstance(msg.content, str) else str(msg.content)
            if output_content.strip():
                output_model = MessagesModel(msg)
                output_model.role = "AI"
                output_model.content = output_content
                records.append(output_model)
        # 用户消息
        elif isinstance(msg, HumanMessage):
            records.append(MessagesModel(msg))

        # 工具消息
        elif isinstance(msg, ToolMessage):
            records.append(MessagesModel(msg))

    messages_conversation: list[MessagesConversation] = []

    for record in records:
        messages_conversation.append(
            MessagesConversation(
                role=record.role,
                content=record.content,
                thread_id=thread_id,
                title=conversation_title,
            )
        )

    await save_conversation(thread_id=thread_id, messages=messages_conversation)

    pass

@after_agent
async def save_conversation_middleware(state: AgentState, runtime: Runtime, *_args, **_kw):
    await _save_conversation(state, runtime)



def install_after_middlewares(middlewares):

    middlewares.append(save_conversation_middleware)
