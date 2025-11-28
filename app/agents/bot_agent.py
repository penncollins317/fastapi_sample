from datetime import datetime, timezone
from typing import Sequence, Optional, List, Dict, Literal

from langchain.agents import create_agent
from langchain.agents.structured_output import ToolStrategy
from langchain.chat_models import init_chat_model
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, ToolMessage
from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph.state import CompiledStateGraph

from app.schemas.agent_schema import ModelOutput, ModelContext, ToolType, ChatMessage, ReasoningStep, ToolCall


class GenericAgentBot:
    def __init__(
            self,
            system_prompt: str,
            model_name: str,  # 改名以明确这是字符串
            model_provider: Literal['deepseek', 'ollama'] = "ollama",  # 新增 provider
            tools: Optional[Sequence[ToolType]] = None,
            checkpointer: Optional[BaseCheckpointSaver] = None,  # 使用基类类型注解
    ):
        self.tools: List[ToolType] = list(tools) if tools is not None else []
        self.checkpointer = checkpointer or InMemorySaver()

        # 1. 修正：在此处初始化模型对象
        self.llm = init_chat_model(model_name, model_provider=model_provider)

        # 2. 修正：create_agent 返回的本质是 Runnable (CompiledGraph)
        # 注意：这里假设 create_agent 是你封装好或者是 langgraph.prebuilt 的功能
        self.graph: CompiledStateGraph = create_agent(
            model=self.llm,
            system_prompt=system_prompt,
            tools=self.tools,
            context_schema=ModelContext,
            response_format=ToolStrategy(ModelOutput),
            checkpointer=self.checkpointer,
        )

    def invoke(
            self,
            message: str,
            context: Optional[ModelContext] = None,
            thread_id: str = "default",
    ) -> ModelOutput:
        config = {"configurable": {"thread_id": thread_id}}
        if context is None:
            context = ModelContext(user_id=0)

        from datetime import datetime, timezone
        from langchain_core.messages import HumanMessage, AIMessage

        current_ts = datetime.now(timezone.utc).isoformat()
        human_msg = HumanMessage(
            content=message,
            additional_kwargs={"timestamp": current_ts}
        )

        try:
            # 2. 执行 Graph
            response = self.graph.invoke(
                {"messages": [human_msg]},
                config=config,
                context=context,
            )
            messages = response.get("messages", [])
            last_ai_msg = next((m for m in reversed(messages) if isinstance(m, AIMessage)), None)

            if not last_ai_msg:
                return ModelOutput(text="未收到回复", sections=[])
            if last_ai_msg.tool_calls:
                for tc in last_ai_msg.tool_calls:
                    if tc["name"] == "ModelOutput":
                        try:
                            return ModelOutput(**tc["args"])
                        except Exception as e:
                            print(f"结构化输出解析失败: {e}")
                            pass
            content = last_ai_msg.content if last_ai_msg.content else ""
            if not content and last_ai_msg.tool_calls:
                tool_names = ", ".join([tc["name"] for tc in last_ai_msg.tool_calls])
                content = f"[正在调用工具: {tool_names}]"

            return ModelOutput(text=str(content), sections=[])

        except Exception as e:
            import traceback
            traceback.print_exc()
            return ModelOutput(text=f"系统错误: {str(e)}", sections=[])

    def get_messages(self, thread_id: str = "default") -> List[ChatMessage]:
        """
        获取聚合了思考过程的消息列表
        """
        config = {"configurable": {"thread_id": thread_id}}
        state_snapshot = self.graph.get_state(config)

        if not state_snapshot.values:
            return []

        raw_msgs = state_snapshot.values.get("messages", [])

        final_messages: List[ChatMessage] = []

        # 临时缓冲区：用于存放当前这一轮对话中产生的思考步骤
        # 结构：{ tool_call_id: ReasoningStep }
        temp_steps_buffer: Dict[str, ReasoningStep] = {}
        # 保持顺序的列表
        temp_steps_order: List[str] = []

        for msg in raw_msgs:
            timestamp = msg.additional_kwargs.get("timestamp", None)

            # -----------------------
            # Case 1: 用户消息
            # -----------------------
            if isinstance(msg, HumanMessage):
                # 遇到用户消息，说明上一轮对话彻底结束了，清空缓冲区（理论上此时缓冲区应该是空的）
                temp_steps_buffer.clear()
                temp_steps_order.clear()

                final_messages.append(ChatMessage(
                    id=msg.id or "",
                    role="user",
                    content=msg.content,
                    timestamp=timestamp
                ))

            # -----------------------
            # Case 2: AI 消息 (可能是思考，也可能是最终结果)
            # -----------------------
            elif isinstance(msg, AIMessage):
                # A. 检查是否有工具调用
                if msg.tool_calls:
                    is_final_response = False
                    final_text = ""

                    # 遍历所有工具调用
                    for tc in msg.tool_calls:
                        tc_id = tc['id']
                        tc_name = tc['name']
                        tc_args = str(tc['args'])

                        # 特殊处理：如果是结构化输出工具 (ModelOutput)，这是最终回复，不是思考步骤
                        if tc_name == 'ModelOutput':
                            is_final_response = True
                            final_text = tc['args'].get('text', '')
                            # 如果有 sections，也可以在这里提取
                        else:
                            # 普通业务工具 -> 记录为思考步骤
                            step = ReasoningStep(
                                step_id=tc_id,
                                tool=tc_name,
                                tool_input=tc_args,
                                timestamp=timestamp,
                                status="pending"  # 等待 ToolMessage 更新结果
                            )
                            temp_steps_buffer[tc_id] = step
                            temp_steps_order.append(tc_id)

                    # B. 如果这次 AI 消息包含了 ModelOutput，说明是最终回复
                    if is_final_response:
                        # 收集缓冲区里的步骤
                        steps_list = [temp_steps_buffer[tid] for tid in temp_steps_order if tid in temp_steps_buffer]

                        final_messages.append(ChatMessage(
                            id=msg.id or "",
                            role="assistant",
                            content=final_text,
                            reasoning_steps=steps_list,  # <--- 挂载思考过程
                            timestamp=timestamp
                        ))
                        # 消费完，清空缓冲区
                        temp_steps_buffer.clear()
                        temp_steps_order.clear()

                # C. 如果没有工具调用，且有内容 -> 纯文本闲聊回复
                elif msg.content:
                    # 理论上闲聊不应该有之前的残留思考步骤，如果有，也可以挂载上去
                    steps_list = [temp_steps_buffer[tid] for tid in temp_steps_order if tid in temp_steps_buffer]

                    final_messages.append(ChatMessage(
                        id=msg.id or "",
                        role="assistant",
                        content=msg.content,
                        reasoning_steps=steps_list,
                        timestamp=timestamp
                    ))
                    temp_steps_buffer.clear()
                    temp_steps_order.clear()

            # -----------------------
            # Case 3: 工具执行结果 (ToolMessage)
            # -----------------------
            elif isinstance(msg, ToolMessage):
                # 根据 tool_call_id 找到对应的步骤，更新 output
                tc_id = msg.tool_call_id
                if tc_id in temp_steps_buffer:
                    temp_steps_buffer[tc_id].tool_output = msg.content
                    temp_steps_buffer[tc_id].status = "completed"

        return final_messages

    def get_full_messages(self, thread_id: str = "default") -> List[ChatMessage]:
        """
        获取历史消息 - 使用 graph.get_state() 标准方法
        """
        config = {"configurable": {"thread_id": thread_id}}

        # 5. 修正：使用 get_state 获取当前状态快照
        state_snapshot = self.graph.get_state(config)

        # 如果没有历史记录（新会话），values 通常为空
        if not state_snapshot.values:
            return []

        raw_msgs: List[BaseMessage] = state_snapshot.values.get("messages", [])

        messages: List[ChatMessage] = []
        for msg in raw_msgs:
            # 6. 逻辑：角色映射 (LangChain -> Frontend)
            role = "unknown"
            if isinstance(msg, HumanMessage):
                role = "user"
            elif isinstance(msg, AIMessage):
                role = "assistant"
            elif isinstance(msg, ToolMessage):
                role = "tool"

            # 处理 Tool Calls
            tool_calls = []
            if hasattr(msg, "tool_calls") and msg.tool_calls:
                for tc in msg.tool_calls:
                    tool_calls.append(ToolCall(
                        name=tc.get("name"),
                        args=tc.get("args", {}),
                        id=tc.get("id"),
                        type="tool_call"
                    ))

            # 尝试从 metadata 获取时间，如果没有则无法恢复真实时间（只能用当前时间）
            # 建议：在 invoke 时，可以在 metadata 里塞入 timestamp
            timestamp = msg.additional_kwargs.get("timestamp") or datetime.now(timezone.utc).isoformat()

            messages.append(ChatMessage(
                id=str(msg.id) if msg.id else None,
                role=role,
                content=str(msg.content),
                tool_calls=tool_calls,
                metadata=msg.additional_kwargs,
                timestamp=timestamp
            ))

        return messages
