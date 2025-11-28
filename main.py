import logging

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.requests import Request
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

from common.encoder import CustomJSONResponse
from common.logging_config import init_logging

load_dotenv()
init_logging()

_logger = logging.getLogger(__name__)

app = FastAPI(default_response_class=CustomJSONResponse)
from app.routers.chat_router import router as chat_router
from app.routers.user_router import router as user_router

app.include_router(chat_router)
app.include_router(user_router)
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def get_id(request: Request) -> str:
    return request.client.host


if __name__ == '__main__':
    import uvicorn

    uvicorn.run("main:app", host='0.0.0.0', port=8000, reload=True)
