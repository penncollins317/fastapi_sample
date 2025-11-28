from typing import Any, Callable, Optional, Union, List, Dict

from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field


class ModelContext(BaseModel):
    user_id: int = Field(..., description="用户ID")


class ModelOutput(BaseModel):
    text: str = Field(
        ...,
        description=(
            "需要返回给用户的自然语言文本内容。"
            "用于展示模型的回复、提示信息、说明性的文字等。"
            "内容不可包含结构化信息或 JSON。"
        )
    )

    sections: List[str] = Field(
        ...,
        description=(
            "推荐的可操作项列表，用于前端展示按钮、快捷操作或候选操作。"
            "内容可以是任何推荐操作，例如：下一步提示、查询选项、候选项目、工具调用动作等。"
            "如果没有可供用户选择的操作，则返回空列表。"
        )
    )

    class Config:
        json_schema_extra = {
            "example": {
                "text": "西安今天天气晴朗，气温24摄氏度，适合外出。",
                "sections": [
                    "查询未来三天天气",
                    "查看西安空气质量",
                    "查询其他城市天气"
                ]
            }
        }


ToolType = Union[BaseTool, Callable, dict[str, Any]]


class ToolCall(BaseModel):
    name: str
    args: Dict[str, Any]
    id: str
    type: str = "tool_call"


class ReasoningStep(BaseModel):
    step_id: str
    tool: str  # 工具名称，例如 "query_weather"
    tool_input: str  # 工具入参，例如 '{"city": "成都"}'
    tool_output: Optional[str] = None  # 工具出参，例如 "24度，晴"
    status: str = "completed"  # pending / completed / failed
    timestamp: Optional[str] = Field(None)


class ChatMessage(BaseModel):
    id: str
    role: str  # user / assistant
    content: str  # 最终展示的文本内容
    reasoning_steps: List[ReasoningStep] = Field(default_factory=list)
    timestamp: Optional[str] = Field(None)
