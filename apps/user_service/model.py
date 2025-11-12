from sqlalchemy import Column, String, BigInteger, ForeignKey

from common.db import Base


class User(Base):
    __tablename__ = "t_user"

    name = Column(String(20))
    email = Column(String(120), unique=True)
    phone = Column(String(11), unique=True)
    password = Column(String(255))
    avatar_url = Column(String(255))


class UserAccount(Base):
    __tablename__ = "t_user_account"
    user_id = Column(BigInteger, ForeignKey("t_user.id"))
    email = Column(String(120), unique=True)
