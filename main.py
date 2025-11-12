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


@app.get("/")
async def get_id(request: Request) -> str:
    return request.client.host


if __name__ == '__main__':
    import uvicorn

    uvicorn.run(app, host='0.0.0.0', port=8000)
