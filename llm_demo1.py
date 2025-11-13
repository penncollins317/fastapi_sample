from typing import List, Optional

from fastapi import FastAPI
from langchain.chat_models import init_chat_model
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field

from common.config import settings  # noqa

app = FastAPI()


class ModelOutput(BaseModel):
    text: str = Field(..., description="大模型返回的中文消息")
    sections: Optional[List[str]] = Field(None, description="用户可选择的选项列表（无选项则为 null）")


# 初始化 deepseek 模型
model = init_chat_model(model="deepseek-chat", model_provider="deepseek")

# 提示模板：强制模型输出 JSON
prompt = ChatPromptTemplate.from_messages([
    ("system", """
你是一个只能用 JSON 格式回答的中文智能客服助手。
你的回答必须严格符合以下 JSON 模式：

{{
  "text": "中文回答内容",
  "sections": ["选项1", "选项2"] // 如果没有选项请输出 null
}}

注意事项：
1. 不要输出任何除 JSON 以外的文字。
2. 不要输出解释说明或前缀。
3. 所有字段名必须和上面的 JSON 一致。
4. 所有内容都必须是中文。
"""),
    ("user", "{input}")
])


parser = JsonOutputParser(pydantic_object=ModelOutput)
chain = prompt | model | parser

if __name__ == "__main__":
    result = chain.invoke({
        "input": "你好，我想咨询一下我的订单问题"
    })
    print(result)
