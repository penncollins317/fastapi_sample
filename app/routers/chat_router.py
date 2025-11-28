from typing import List

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Body

from app.core.depends import get_current_user
from app.core.socket_manager import manager
from app.schemas import TokenUser
from app.services.chat_service import conversation_list, create_conversation
from schemas import UserInfo

router = APIRouter(tags=["即时通信"])


@router.get("/chat/user/online", summary='在线用户')
async def online_users(token_user: TokenUser = Depends(get_current_user)) -> list[UserInfo]:
    return [
        UserInfo(
            id=token_user.user_id,
            name=f"user - {token_user.user_id}",
            email="admin@qq.com",
            avatar_url=""
        )
    ]


@router.get("/chat/conversations", summary='会话列表')
async def list_conversation_route(token_user: TokenUser = Depends(get_current_user)) -> List[dict]:
    return await conversation_list(token_user.user_id)


@router.post("/chat/conversations", summary='创建会话')
async def create_conversation_route(token_user: TokenUser = Depends(get_current_user),
                                    with_users: List[int] = Body()) -> int:
    return await create_conversation(token_user.user_id, with_users)


@router.websocket("/websocket/chat")
async def websocket_endpoint(websocket: WebSocket, token_user: TokenUser = Depends(get_current_user)):
    await manager.connect(websocket, token_user.user_id)
    try:
        while True:
            data = await websocket.receive_text()
            # 假设客户端发来的格式: {"to": "user_b", "msg": "hello"}
            import json
            msg_data = json.loads(data)
            target_user = msg_data.get("to")
            content = msg_data.get("msg")

            # 1. 保存消息到数据库 (持久化)
            # await save_message_to_db(user_id, target_user, content)

            # 2. 发送消息
            await manager.send_personal_message(content, token_user.user_id, target_user)

    except WebSocketDisconnect:
        await manager.disconnect(token_user.user_id)
        # 可以广播用户下线状态
