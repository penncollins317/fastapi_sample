import logging
import os
import sys

from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "apps"))

from common.logging_config import setup_logging

setup_logging()
from fastapi import FastAPI
from starlette.requests import Request

from common.encoder import CustomJSONResponse

_logger = logging.getLogger(__name__)
app = FastAPI(default_response_class=CustomJSONResponse)

from user_service import get_router

app.include_router(get_router())


@app.middleware("http")
async def real_ip_middleware(request: Request, call_next):
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        real_ip = forwarded_for.split(",")[0].strip()
        scope = request.scope
        scope["client"] = (real_ip, scope["client"][1])
    response = await call_next(request)
    return response


@app.get("/")
async def get_id(request: Request) -> str:
    return f"<h2>{request.client.host}</h2>"


if __name__ == '__main__':
    import uvicorn

    uvicorn.run(app, host='0.0.0.0', port=8000)
