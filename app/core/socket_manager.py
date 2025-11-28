import asyncio
import json
from typing import Dict

import redis.asyncio as redis
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self, redis_url: str="redis://:helloredis@192.168.2.28:6379/0"):
        # 存放激活的连接: key=user_id, value=WebSocket
        self.active_connections: Dict[str, WebSocket] = {}
        # Redis 用于跨进程通信
        self.redis = redis.from_url(redis_url, encoding="utf-8", decode_responses=True)
        self.pubsub = self.redis.pubsub()

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        # 每个人上线时，订阅自己的频道 (user:{user_id})
        await self.subscribe_to_channel(user_id)

    async def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
            # 实际项目中可能需要取消订阅，或者保留订阅以处理离线推送

    async def subscribe_to_channel(self, user_id: str):
        """
        订阅 Redis 频道，监听发给该用户的消息
        """
        await self.pubsub.subscribe(f"user:{user_id}")
        # 启动后台任务监听 Redis 消息
        asyncio.create_task(self.redis_listener(user_id))

    async def redis_listener(self, user_id: str):
        """
        监听 Redis 消息并推送到 WebSocket
        """
        async for message in self.pubsub.listen():
            if message["type"] == "message":
                data = json.loads(message["data"])
                # 如果用户当前连接在本进程，通过 WebSocket 发送
                if user_id in self.active_connections:
                    ws = self.active_connections[user_id]
                    await ws.send_text(json.dumps(data))

    async def send_personal_message(self, message: str, sender_id: str, receiver_id: str):
        """
        发送私聊消息：将消息 Publish 到 Redis，而不是直接发给 Socket
        """
        payload = {
            "sender": sender_id,
            "content": message,
            "type": "private"
        }
        # 发布到接收者的频道
        await self.redis.publish(f"user:{receiver_id}", json.dumps(payload))

        # 可选：同时也推给自己（多端同步）
        # await self.redis.publish(f"user:{sender_id}", json.dumps(payload))


manager = ConnectionManager()