from fastapi import Depends

from common import jwt_utils
from common.scheme import TokenUser, oauth2_scheme


def fake_decode_token(token) -> TokenUser:
    payload = jwt_utils.parse_token(token)
    return TokenUser(user_id=int(payload['sub']))


async def get_current_user(token: str = Depends(oauth2_scheme)) -> TokenUser:
    user = fake_decode_token(token)
    return user
