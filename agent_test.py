import os

from langgraph.checkpoint.postgres import PostgresSaver

from app.agents.bot_agent import GenericAgentBot


def query_weather(city: str) -> str:
    """
    查询天气
    @param city: 城市
    """
    return f"{city} -> 晴朗，24摄氏度"


if __name__ == '__main__':
    from app import load_config

    load_config()
    config = {
        "db_host": "home.echovoid.top",
        "db_port": 5432,
        "db_user": "postgres",
        "db_password": "postgres",
        "db_name": "bot_agent"
    }
    postgres_conn_str = (
        f"host={config.get('db_host')} "
        f"port={config.get('db_port')} "
        f"dbname={config.get('db_name')} "
        f"user={config.get('db_user')} "
        f"password={config.get('db_password')}"
    )
    system_prompt = """You are a helpful assistant. Be concise and accurate."""

    with PostgresSaver.from_conn_string(postgres_conn_str) as saver:
        saver.setup()
        agent = GenericAgentBot(
            system_prompt,
            'deepseek-chat',
            'deepseek',
            tools=[query_weather],
            checkpointer=saver)
        result = agent.invoke("详细对比两种语言性能", thread_id="4")
        print(result)
        messages = agent.get_messages("default")
        for msg in messages:
            print(msg)
