"""
会话数据库
"""
from loguru import logger
from sqlalchemy import select, func, delete

from app.models.enty.conversation_messages import MessagesGroup, Conversation, MessageContent
from app.models.messages_model import MessagesConversation
from common.config.sqlalchemy_config import db_session
from common.models.result import Result


async def save_conversation(thread_id: str, messages: list[MessagesConversation]) -> Result:
    """
    保存会话
    """
    if not messages:
        return Result(msg="No messages provided").failure()

    async with db_session() as session:
        result = await session.execute(
            select(func.max(MessagesGroup.id)).where(MessagesGroup.thread_id == thread_id))
        group_id = result.scalar() or 0
        if group_id == 0:
            session.add(Conversation(
                thread_id=thread_id,
                title=messages[0].title,
            ))
            await session.flush()

        msg_group = MessagesGroup(thread_id=thread_id)
        session.add(msg_group)
        await session.flush()
        group_id = msg_group.id
        logger.info(f"Group ID: {group_id}")

        for i, msg in enumerate(messages, start=1):
            # 保存会话
            session.add(MessageContent(
                thread_id=thread_id,
                group_id=group_id,
                role=msg.role,
                content=msg.content,
                msg_order=i,
                meta_data=msg.meta_data,
            ))
        logger.success(f"Messages saved successfully for thread ID: {thread_id}")
    return Result(msg="Conversation saved successfully").success()



async def query_conversation(thread_id: str) -> Result:
    """
    查询会话
    """
    async with db_session() as session:
        result = await session.execute(
            select(MessageContent).where(MessageContent.thread_id == thread_id).order_by(MessageContent.group_id).order_by(MessageContent.msg_order)
        )
        message_content: list[MessageContent] = result.scalars().all()



        logger.info(f"Message content: {len(message_content)}, thread_id: {thread_id}")

    return Result(data=message_content).success()


async def del_message_content(thread_id: str) -> Result:
    """
    删除会话
    """
    async with db_session() as session:

        await session.execute(delete(MessageContent).where(MessageContent.thread_id == thread_id))
        await session.execute(delete(MessagesGroup).where(MessagesGroup.thread_id == thread_id))
        await session.execute(delete(Conversation).where(Conversation.thread_id == thread_id))

        logger.info(f"Conversation deleted successfully, thread_id: {thread_id}")

    return Result(msg="Conversation deleted successfully").success()


async def get_query_content_list() -> Result:
    """
    查询会话内容列表
    """
    async with db_session() as session:
        result = await session.execute(
            select(Conversation).order_by(Conversation.created_at)
        )
        conversations: list[Conversation] = result.scalars().all()


    return Result(data=conversations).success()
