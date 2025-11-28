import logging

from fastapi import HTTPException, Body, UploadFile, status, File, Depends, Request, APIRouter
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel

from app.core.depends import get_current_user
from app.schemas import UserRegisterParams, UserInfo, TokenDTO, TokenUser
from app.services.user_service import UserService

_logger = logging.getLogger(__name__)
router = APIRouter(prefix="/users", tags=["用户服务"])


class RegisterUserResult(BaseModel):
    id: int


@router.post("/register", summary="用户注册")
async def user_register_endpoint(params: UserRegisterParams = Body()) -> RegisterUserResult:
    result = await UserService.register(params)
    return RegisterUserResult(id=result)


ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}


# 支持的图片类型
@router.post("/avatar/upload", summary="头像上传")
async def upload_avatar_endpoint(file: UploadFile = File(...),
                                 current_user: TokenUser = Depends(get_current_user)) -> bool:
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"不支持的文件类型: {file.content_type}，请上传图片（jpg/png/gif/webp）"
        )

    _logger.info("上传头像: %s (%s)", file.filename, file.content_type)

    return True


@router.get("/me")
async def read_users_me_endpoint(current_user: TokenUser = Depends(get_current_user)) -> UserInfo:
    return await UserService.get_user(user_id=current_user.user_id)


@router.post("/oauth2/login")
async def oauth2_login_endpoint(request: Request, form_data: OAuth2PasswordRequestForm = Depends()) -> TokenDTO:
    token = await UserService.login(form_data.username, form_data.password, request)
    return token


class UserLoginParams(BaseModel):
    username: str
    password: str


@router.post("/login")
async def login_endpoint(request: Request, data: UserLoginParams = Body()) -> TokenDTO:
    token = await UserService.login(data.username, data.password, request)
    return token
