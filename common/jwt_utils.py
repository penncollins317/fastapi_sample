import datetime
import os
import uuid
from typing import Literal

import jwt

from user_service.schemas import TokenDTO

JWT_SECRET = os.environ.get("JWT_SECRET", uuid.uuid4().__str__())
JWT_ISSUER = os.environ.get("JWT_ISSUER", "http://localhost:8000")
JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_IN = int(os.environ.get("JWT_EXPIRE_IN", datetime.timedelta(hours=2).total_seconds()))
JWT_REFRESH_EXPIRE_IN = int(os.environ.get("JWT_REFRESH_EXPIRE_IN", datetime.timedelta(days=7).total_seconds()))

TOKEN_TYPE = Literal['access', 'refresh']


def create_token(payload: dict, type: TOKEN_TYPE = 'access', headers: dict = None) -> str:
    current = datetime.datetime.now(datetime.UTC)
    return jwt.encode(
        payload={
            **payload,
            'iss': JWT_ISSUER,
            'exp': current + (datetime.timedelta(seconds=JWT_EXPIRE_IN) if type == 'access' else datetime.timedelta(
                seconds=JWT_REFRESH_EXPIRE_IN)),
            'iat': current,
            'jti': str(uuid.uuid4()),
            'type': type,
        },
        headers=headers,
        key=JWT_SECRET,
        algorithm=JWT_ALGORITHM
    )


def create_full_token(payload: dict, headers: dict = None) -> TokenDTO:
    current = datetime.datetime.now(datetime.UTC)
    return TokenDTO(
        access_token=create_token(payload, type='access', headers=headers),
        refresh_token=create_token(payload, type='refresh', headers=headers),
        expire_in=JWT_EXPIRE_IN,
        expire_time=current + datetime.timedelta(seconds=JWT_EXPIRE_IN),
        refresh_expire_in=JWT_REFRESH_EXPIRE_IN,
        refresh_expire_time=current + datetime.timedelta(seconds=JWT_REFRESH_EXPIRE_IN)
    )


def parse_token(token: str) -> dict:
    return jwt.decode(token, key=JWT_SECRET, algorithms=JWT_ALGORITHM)


def refresh_token(token: str) -> str:
    payload = parse_token(token)
    assert payload['type'] == 'refresh', 'token type must be refresh'
    return create_token(payload, 'access')


if __name__ == '__main__':
    access_token_str = create_token({'sub': "echo"}, 'access')
    refresh_token_str = create_token({'sub': "echo"}, 'refresh')
    print(access_token_str)
    print(refresh_token)
    result = parse_token(refresh_token_str)
    print(result)
    print(refresh_token(refresh_token_str))
    print(parse_token(refresh_token_str))
