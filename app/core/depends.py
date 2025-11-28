from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer

from app.schemas import TokenUser
from common import jwt_utils

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/users/oauth2/login")


def fake_decode_token(token) -> TokenUser:
    payload = jwt_utils.parse_token(token)
    return TokenUser(user_id=int(payload['sub']))


async def get_current_user(token: str = Depends(oauth2_scheme)) -> TokenUser:
    user = fake_decode_token(token)
    return user
