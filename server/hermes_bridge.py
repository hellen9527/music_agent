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


def run(payload: dict[str, Any]) -> None:
    from run_agent import AIAgent

    user_message, history, system_message = split_conversation(payload.get("messages") or [])
    api_key = os.environ.get("DEEPSEEK_API_KEY") or os.environ.get("HERMES_API_KEY")
    if not api_key:
        raise ValueError("DEEPSEEK_API_KEY is required")

    answer_parts: list[str] = []

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
