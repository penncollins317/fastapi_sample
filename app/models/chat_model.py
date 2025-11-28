from sqlalchemy import Column, String, BigInteger, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB

from app.core.db import Base


class ChatConversation(Base):
    __tablename__ = 'chat_conversation'

    name = Column(String)
    user_id = Column(BigInteger, ForeignKey("t_user.id"))


class ChatConversationMember(Base):
    __tablename__ = 'chat_conversation_member'
    conversation_id = Column(BigInteger, ForeignKey("chat_conversation.id"))
    user_id = Column(BigInteger, ForeignKey("t_user.id"))
    features = Column(JSONB)


class ChatMessage(Base):
    __tablename__ = 'chat_message'

    conversation_id = Column(BigInteger, ForeignKey("chat_conversation.id"))
    user_id = Column(BigInteger, ForeignKey("t_user.id"))
    content = Column(String, nullable=False)
    msg_id = Column(String, nullable=False)
