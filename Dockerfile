# 使用官方 Python 3.12 镜像
FROM python:3.12-slim

WORKDIR /app

# 安装 uv
RUN pip install --no-cache-dir uv -i https://mirrors.huaweicloud.com/repository/pypi/simple

# 设置华为云镜像（适用于 uv）
ENV UV_INDEX_URL=https://mirrors.huaweicloud.com/repository/pypi/simple \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_SYSTEM_PYTHON=1

# 复制依赖文件
COPY pyproject.toml uv.lock* ./

# 使用 uv 同步依赖（会自动读取 UV_INDEX_URL）
RUN uv sync --frozen --index-url https://mirrors.huaweicloud.com/repository/pypi/simple --no-dev

# 复制项目代码
COPY . .

EXPOSE 8000

# 启动命令
CMD ["/bin/sh", "-c", "uv run alembic upgrade head && uv run uvicorn main:app --host 0.0.0.0 --port 8000"]
