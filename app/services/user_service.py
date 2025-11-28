from datetime import datetime
from typing import Optional

from fastapi import Request
from sqlalchemy.future import select

from app.core.db import async_session
from app.models.user_model import User, UserLoginLog
from app.schemas.user_schema import TokenDTO, UserRegisterParams, UserInfo
from common.exceptions import ServiceException
from common.jwt_utils import create_full_token
from common.passwd import password_helper


class UserService:
    @staticmethod
    async def register(params: UserRegisterParams) -> int:
        async with async_session() as session:
            result = await session.execute(select(User).where(User.email == params.email))
            existing_user = result.scalar_one_or_none()
            if existing_user:
                raise ServiceException("该邮箱已注册，请直接登录。")
            user = User(name=params.name, email=params.email, password=password_helper.hash_password(params.password))
            session.add(user)
            await session.commit()
            await session.refresh(user)
            return user.id

    @staticmethod
    async def login(username: str, password: str, request: Request) -> TokenDTO:
        async with async_session() as session:
            user = (await session.execute(select(User).where(User.email == username))).scalar_one_or_none()
            if not user or not password_helper.verify_password(password, user.password):
                raise ServiceException("账号或密码错误")
            token = create_full_token({
                'sub': str(user.id),
                'email': user.email
            })
            login_log = UserLoginLog(user_id=user.id, login_time=datetime.now(), ip_addr=request.client.host)
            session.add(login_log)
            await session.commit()
            return token

    @staticmethod
    async def create_user(name: str, email: str, password: Optional[str] = None):
        async with async_session() as session:
            user = User(name=name, email=email, password=password)
            session.add(user)
            await session.commit()
            await session.refresh(user)
            return user

    @staticmethod
    async def get_user(user_id: int) -> Optional[UserInfo]:
        async with async_session() as session:
            result = await session.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()
            if not user:
                return None
            return UserInfo(
                id=user.id,
                name=user.name,
                email=user.email,
                avatar_url=user.avatar_url
            )

    @staticmethod
    async def list_users():
        async with async_session() as session:
            result = await session.execute(select(User))
            return result.scalars().all()

register = UserService.register
login = UserService.login
list_users = UserService.list_users
get_user = UserService.get_user
create_user = UserService.create_user