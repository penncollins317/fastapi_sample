# 使用官方 Python 3.12 镜像
FROM python:3.12-slim

# 设置工作目录
WORKDIR /app

# 安装 uv（比 pip 快很多）
RUN pip install --no-cache-dir uv -i https://mirrors.huaweicloud.com/repository/pypi/simple

# 复制依赖文件（假设有 pyproject.toml 和 uv.lock）
COPY pyproject.toml uv.lock* ./

# 安装依赖（使用 uv）
RUN uv sync --frozen --no-dev --index-url https://mirrors.huaweicloud.com/repository/pypi/simple

# 复制项目代码
COPY . .

# 暴露端口（FastAPI 默认 8000）
EXPOSE 8000

# 设置环境变量（防止 pycache、强制 UTF-8）
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_SYSTEM_PYTHON=1

CMD ["/bin/sh", "-c", "uv run alembic upgrade head && uv run uvicorn main:app --host 0.0.0.0 --port 8000"]
