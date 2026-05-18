from datetime import datetime

from sqlalchemy import Text, Integer, func, Uuid, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.models.enty.base import Base


"""
会话存储数据表
"""

class Conversation(Base):
    """会话"""
    __tablename__ = "conversation"

    thread_id: Mapped[str] = mapped_column(Text, primary_key=True)

    title: Mapped[str] = mapped_column(Text, comment="会话标题")

    created_at: Mapped[datetime] = mapped_column(DateTime, insert_default=func.now(), comment="创建时间")

    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now(), comment="更新时间")



class MessagesGroup(Base):
    """会话分组"""
    __tablename__ = "messages_group"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    thread_id: Mapped[str] = mapped_column(Text, comment="会话ID")


class MessageContent(Base):
    """会话消息"""
    __tablename__ = "message_content"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    thread_id: Mapped[str] = mapped_column(Text, comment="会话ID")

    group_id: Mapped[int] = mapped_column(Integer, comment="分组ID")

    content: Mapped[str] = mapped_column(Text, comment="消息内容")

    role: Mapped[str] = mapped_column(Text, comment="消息角色")

    created_at: Mapped[datetime] = mapped_column(DateTime, insert_default=func.now(), comment="创建时间")

    msg_order: Mapped[int] = mapped_column(Integer, comment="消息顺序")

    meta_data: Mapped[dict] = mapped_column(Text, comment="元数据")

    # parent_msg_id: Mapped[int] = mapped_column(Integer, comment="父消息ID")

# 分支消息表
