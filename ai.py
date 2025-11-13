import sys

from pydantic import BaseModel, Field

from common.config import settings  # noqa


class ModelOutput(BaseModel):
    text: str = Field(..., description='文字消息')
    sections: list[str] = Field(list(), description='选项列表')


from langchain.chat_models import init_chat_model

args = sys.argv
if len(args) == 1:
    print("缺少输入内容")
    sys.exit(1)
content = args[1]

model = init_chat_model(model='deepseek-chat', model_provider='deepseek')

result = model.stream(content)
for chuck in result:
    print(chuck.content, end='')
