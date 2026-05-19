from langchain.agents import AgentState
from langchain.agents.middleware import after_agent, before_agent, ModelRequest
from langchain_core.messages import HumanMessage, AIMessage, ToolMessage, SystemMessage
from langchain_deepseek import ChatDeepSeek
from langgraph.runtime import Runtime
from loguru import logger

from app.database.conversatuon_db import save_conversation
from app.models.messages_model import MessagesModel, MessagesConversation


# def _get_title(state: AgentState):
    # 生成标题

    # messages = state.get("messages")
    # if len(messages) == 1:
    #     llm = ChatDeepSeek(model="deepseek-v4-flash", temperature=0.7)
    #     logger.info(f"[中间件] messages: {messages}")
    #     system_message = SystemMessage(content=f"生成标题,将用户需求变成一个标题，不超过10个字{messages[0]}")
    #     title = llm.invoke([system_message]).content
    #     # state.fromkeys("title", title)
    #     logger.info(f"[中间件] title: {title}")
    # return None

# @before_agent
# def get_title(state: AgentState, runtime: Runtime, *_args, **_kwargs):
#     _get_title(state)

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
            MessagesConversation(role=record.role, content=record.content, thread_id=thread_id)
        )

    await save_conversation(thread_id=thread_id, messages=messages_conversation)

    pass

@after_agent
async def save_conversation_middleware(state: AgentState, runtime: Runtime, *_args, **_kw):
    await _save_conversation(state, runtime)



def install_after_middlewares(middlewares):

    # middlewares.append(get_title)
    middlewares.append(save_conversation_middleware)
