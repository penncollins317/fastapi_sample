import datetime
from typing import Optional

from pydantic import BaseModel, Field, EmailStr


class TokenUser(BaseModel):
    user_id: int


class UserInfo(BaseModel):
    id: int
    name: str
    email: EmailStr
    avatar_url: Optional[str]


class UserLogin(BaseModel):
    username: str = Field(..., min_length=2)
    password: str = Field(..., min_length=4)


class TokenDTO(BaseModel):
    access_token: str
    expire_in: int
    expire_time: datetime.datetime

    refresh_token: str
    refresh_expire_time: datetime.datetime
    refresh_expire_in: int


class UserRegisterParams(BaseModel):
    name: str = Field(..., min_length=2, max_length=10, description="用户名 2~10 字符")
    email: EmailStr = Field(..., description="邮箱地址")
    password: str = Field(..., min_length=4, max_length=16, description="密码 4~16 位")
