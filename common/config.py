import os

from dotenv import load_dotenv

APP_ENV = os.getenv("APP_ENV", "development")

if APP_ENV:
    env_file = f".env.{APP_ENV}"
    if os.path.exists(env_file):
        print(f"Loading environment from {env_file}")
        load_dotenv(env_file)
    else:
        print(f"Env file {env_file} not found, fallback to system env")


class Settings:
    APP_ENV = APP_ENV
    APP_LOG_LEVEL = os.getenv("APP_LOG_LEVEL", "INFO")

    DATABASE_URL = os.getenv("DATABASE_URL")

    # 安全参数只从环境变量读取
    DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret")


settings = Settings()
