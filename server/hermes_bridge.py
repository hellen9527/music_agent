#!/usr/bin/env python3
"""Bridge Hermes Agent into the Node SSE server.

The Node process sends visible chat messages on stdin. This script runs one
Hermes AIAgent turn and emits JSON Lines events on stdout:
{"type":"reasoning","delta":"..."}
{"type":"answer","delta":"..."}
{"type":"done"}
"""

from __future__ import annotations

import json
import os
import sys
from typing import Any


MUSIC_ROUTER_SYSTEM_PROMPT = """
你是音乐领域意图路由 Agent，负责把用户在音乐 App 内的 query 路由到最合适的意图和 skill。

工作方式：
- 你可以在思考过程中分析用户意图，但最终答案必须保持极简。
- 如果用户是闲聊，直接自然回复即可。
- 如果不是闲聊，最终答案必须只输出 JSON，不要输出 Markdown 代码块、解释、寒暄或多余文本。
- JSON 字段名固定使用英文，字段值中的意图名称和中文关键词保持中文。

非闲聊 JSON 输出格式：
1. 单个 skill 调用：
{
  "type": "skill_call",
  "intent": "意图名称",
  "skill": "skill_name",
  "args": {}
}

2. 多意图或复杂任务编排：
{
  "type": "task_plan",
  "intent": "任务编排",
  "steps": [
    {
      "intent": "意图名称",
      "skill": "skill_name",
      "args": {}
    }
  ]
}

意图与 skill 规则：
- 精准搜索：用户直接找某个歌手、歌曲、专辑、IP，或询问某歌手的经典歌曲、最新歌曲等可由音乐搜索引擎精准命中的内容。skill 使用 music_search，args 为 {"keywords": ["搜索关键词"]}。
- 推荐：用户按场景、心情、语言、风格、人群、年代、活动等限定条件要歌单或歌曲推荐。skill 使用 music_recommend，args 为 {"keywords": ["推荐关键词"]}。
- 随机推荐：用户没有任何限定，只是泛泛想听点歌、随便来点歌，且随便推荐都不算错误。skill 使用 random_recommend，args 为 {}。
- AI搜索：用户问题涉及事实、语义、文化背景、地域知识、音乐知识或需要访问搜索引擎才知道答案的内容，例如“推荐几首好听的江南民歌”。skill 使用 ai_search，args 为 {"keywords": ["搜索关键词"]}。
- 操控：用户想操作音乐 App，例如播放、暂停、切歌、上一首、加入播放队列、收藏、下载、调音量。skill 使用 app_control，args 为 {"command": "操控命令词"}。
- 资产查询：用户查询自己的收藏、歌单、会员、历史、下载、本地音乐等个人资产。skill 使用 asset_query，args 为 {"purpose": "查询目的"}。
- 榜单：用户明确查询榜单内容。skill 使用 chart_query，args 为 {"chart": "榜单名"}。可识别榜单包括抖音热搜榜、top500榜、百万收藏榜、新歌榜等。
- 任务编排：query 包含多个意图，或需要先查榜单/搜索再做后续动作。例如“找一些最近最火的歌”“最近的新歌里挑几首适合跑步的”，应先 chart_query，再按需要 music_search 或 music_recommend。
- 闲聊：用户只是问候、聊天、表达情绪、询问你是谁等不需要调用音乐 skill 的内容，直接回答即可。
""".strip()


def emit(event: dict[str, Any]) -> None:
    print(json.dumps(event, ensure_ascii=False), flush=True)


def split_conversation(messages: list[dict[str, Any]]) -> tuple[str, list[dict[str, str]], str | None]:
    last_user_index = None
    for index, message in enumerate(messages):
        if message.get("role") == "user" and str(message.get("content") or "").strip():
            last_user_index = index

    if last_user_index is None:
        raise ValueError("messages must contain a user message")

    system_parts: list[str] = []
    history: list[dict[str, str]] = []
    for message in messages[:last_user_index]:
        role = message.get("role")
        content = str(message.get("content") or "").strip()
        if not content:
            continue
        if role == "system":
            system_parts.append(content)
        elif role in {"user", "assistant"}:
            history.append({"role": role, "content": content})

    user_message = str(messages[last_user_index].get("content") or "").strip()
    system_message = "\n\n".join(system_parts) if system_parts else None
    return user_message, history, system_message


def csv_env(name: str, default: str = "") -> list[str] | None:
    raw = os.environ.get(name, default).strip()
    values = [item.strip() for item in raw.split(",") if item.strip()]
    return values or None


def build_system_message(existing_system: str | None, mode: str | None = None) -> str | None:
    selected_mode = mode or os.environ.get("HERMES_AGENT_MODE", "music_router")
    parts: list[str] = []
    if existing_system:
        parts.append(existing_system)
    if selected_mode == "music_router":
        parts.append(MUSIC_ROUTER_SYSTEM_PROMPT)
    return "\n\n".join(parts) if parts else None


def run(payload: dict[str, Any]) -> None:
    from run_agent import AIAgent

    user_message, history, system_message = split_conversation(payload.get("messages") or [])
    agent_mode = os.environ.get("HERMES_AGENT_MODE", "music_router")
    system_message = build_system_message(system_message, mode=agent_mode)
    api_key = os.environ.get("DEEPSEEK_API_KEY") or os.environ.get("HERMES_API_KEY")
    if not api_key:
        raise ValueError("DEEPSEEK_API_KEY is required")

    answer_parts: list[str] = []
    enabled_toolsets = csv_env("HERMES_ENABLED_TOOLSETS")
    if agent_mode == "music_router" and enabled_toolsets is None:
        enabled_toolsets = []

    def on_reasoning(delta: str | None) -> None:
        if delta:
            emit({"type": "reasoning", "delta": delta})

    def on_answer(delta: str | None) -> None:
        if delta:
            answer_parts.append(delta)
            emit({"type": "answer", "delta": delta})

    agent = AIAgent(
        provider=os.environ.get("HERMES_PROVIDER", "deepseek"),
        model=os.environ.get("HERMES_MODEL", "deepseek-v4-flash"),
        base_url=os.environ.get("HERMES_BASE_URL", "https://api.deepseek.com/v1"),
        api_key=api_key,
        quiet_mode=True,
        skip_context_files=True,
        skip_memory=True,
        max_iterations=int(os.environ.get("HERMES_MAX_ITERATIONS", "10")),
        enabled_toolsets=enabled_toolsets,
        disabled_toolsets=csv_env("HERMES_DISABLED_TOOLSETS", "terminal,browser"),
        reasoning_callback=on_reasoning,
        reasoning_config={"enabled": True, "effort": os.environ.get("HERMES_REASONING_EFFORT", "high")},
        request_overrides={
            "reasoning_effort": os.environ.get("HERMES_REASONING_EFFORT", "high"),
            "extra_body": {"thinking": {"type": "enabled"}},
        },
    )

    result = agent.run_conversation(
        user_message=user_message,
        system_message=system_message,
        conversation_history=history,
        stream_callback=on_answer,
    )
    final_response = str(result.get("final_response") or "")
    streamed_answer = "".join(answer_parts)
    if final_response and final_response != streamed_answer:
        suffix = final_response[len(streamed_answer):] if final_response.startswith(streamed_answer) else final_response
        if suffix:
            emit({"type": "answer", "delta": suffix})

    emit({"type": "done"})


def main() -> int:
    try:
        payload = json.load(sys.stdin)
        run(payload)
        return 0
    except Exception as exc:  # pragma: no cover - exercised through Node integration
        emit({"type": "error", "error": str(exc)})
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
