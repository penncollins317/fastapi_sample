import os

import dotenv
from sqlalchemy import Column, BigInteger, DateTime, func

dotenv.load_dotenv()
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base, declared_attr

DATABASE_URL = os.getenv("DATABASE_URL", 'postgresql+asyncpg://postgres:postgres@localhost:5432/testdb')
engine = create_async_engine(
    DATABASE_URL,
    echo=True,
    future=True
)

async_session = async_sessionmaker(
    bind=engine,
    expire_on_commit=False,
    autoflush=False
)


class BaseModel:
    __abstract__ = True

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_onupdate=func.now())

    # 自动推导表名（小写类名）
    @declared_attr
    def __tablename__(cls):
        return cls.__name__.lower()


# 生成全局 Base
Base = declarative_base(cls=BaseModel)
