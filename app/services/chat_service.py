from typing import List

from sqlalchemy import select

from app.core.db import async_session
from app.models import ChatConversation, ChatConversationMember
from app.services.user_service import get_user
from common.exceptions import ServiceException


async def conversation_list(user_id: int) -> List[dict]:
    """
    会话列表
    :param user_id: 用户ID
    :return: 会话列表
    """
    async with async_session() as session:
        query = await session.execute(select(ChatConversation).where(ChatConversation.user_id == user_id))
        return [
            {
                "id": c.id,
                "name": c.name,
                "created_at": c.created_at,
                "updated_at": c.updated_at,
            } for c in query.scalars().all()
        ]


async def create_conversation(user_id: int, with_users: List[int]) -> int:
    """
    创建会话
    :param user_id: 当前用户ID
    :param with_users: 会话中其他用户ID列表
    :return: 会话ID
    """
    assert user_id not in with_users, '附加用户不允许存在当前用户'
    async with async_session() as session:
        # 1. 创建会话对象并加入 session
        conversation = ChatConversation(user_id=user_id)
        session.add(conversation)

        # 2. 刷新以获得 conversation.id
        await session.flush()

        # 3. 添加当前用户为成员
        ccm = ChatConversationMember(
            user_id=user_id,
            conversation_id=conversation.id,
            features={}
        )
        session.add(ccm)

        # 4. 添加其他用户
        for with_user_id in with_users:
            userinfo = await get_user(with_user_id)
            if not userinfo:
                raise ServiceException(f"user id {with_user_id} not found")

            wccm = ChatConversationMember(
                user_id=with_user_id,
                conversation_id=conversation.id,
                features={}
            )
            session.add(wccm)

        # 5. 提交事务
        await session.commit()

        return conversation.id
