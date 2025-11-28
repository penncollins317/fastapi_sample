from sqlalchemy import Column, String, BigInteger, ForeignKey, func, DateTime

from app.core.db import Base


class User(Base):
    __tablename__ = "t_user"

    name = Column(String(20))
    email = Column(String(120), unique=True)
    phone = Column(String(11), unique=True)
    password = Column(String(255))
    avatar_url = Column(String(255))


class UserAccount(Base):
    __tablename__ = "user_account"
    user_id = Column(BigInteger, ForeignKey("t_user.id"))
    email = Column(String(120), unique=True)


class UserLoginLog(Base):
    __tablename__ = "user_login_log"

    user_id = Column(BigInteger, ForeignKey("t_user.id"))
    ip_addr = Column(String(39))
    login_time = Column(DateTime, server_default=func.now())
