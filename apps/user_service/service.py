from typing import Optional

from sqlalchemy.future import select

from common.db import async_session
from common.exceptions import ServiceException
from common.jwt_utils import create_full_token
from user_service.model import User
from user_service.schemas import TokenDTO, UserRegisterParams, UserInfo


class UserService:
    @staticmethod
    async def register(params: UserRegisterParams) -> int:
        async with async_session() as session:
            result = await session.execute(select(User).where(User.email == params.email))
            existing_user = result.scalar_one_or_none()
            if existing_user:
                raise ServiceException("该邮箱已注册，请直接登录。")
            user = User(name=params.name, email=params.email, password=params.password)
            session.add(user)
            await session.commit()
            await session.refresh(user)
            return user.id

    @staticmethod
    async def login(username: str, password: str) -> TokenDTO:
        async with async_session() as session:
            user = (await session.execute(select(User).where(User.email == username))).scalar_one_or_none()
            if not user or user.password != password:
                raise ServiceException("账号或密码错误")
            token = create_full_token({
                'sub': str(user.id),
                'email': user.email
            })
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
