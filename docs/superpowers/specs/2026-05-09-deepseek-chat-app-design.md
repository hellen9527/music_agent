# Hermes Agent Chat App Design

## Goal

Build a local web chat app that calls Hermes Agent. Hermes is configured to use DeepSeek's OpenAI-compatible API with `deepseek-v4-flash`, but the application talks to the agent layer rather than directly to DeepSeek.

Each assistant response is displayed in two distinct parts:

- Reasoning: reasoning deltas emitted by Hermes from the model's native thinking stream.
- Final answer: answer deltas emitted by Hermes through its stream callback.

The reasoning section must be collapsible so the user can hide or show it for each assistant message.
Responses must stream incrementally. The user should see reasoning tokens appear in the reasoning section and final answer tokens appear in the answer section as the model produces them.

## External Runtime

Hermes is installed as a Python dependency from the official Nous Research repository:

```text
hermes-agent @ git+https://github.com/NousResearch/hermes-agent.git
```

The backend runs a Python bridge that imports Hermes:

```python
from run_agent import AIAgent
```

Hermes is configured with:

```text
provider=deepseek
model=deepseek-v4-flash
base_url=https://api.deepseek.com/v1
```

The bridge passes the local `DEEPSEEK_API_KEY` to Hermes and enables DeepSeek thinking mode through request overrides:

```json
{
  "reasoning_effort": "high",
  "extra_body": {
    "thinking": {
      "type": "enabled"
    }
  }
}
```

For multi-turn conversations without tool calls, the client stores prior user messages and prior assistant final answers. It does not rely on previous reasoning text as normal conversational context.

## Architecture

Use a small full-stack JavaScript app:

- Vite + React frontend for the chat UI.
- Express backend for `/api/chat/stream`.
- Node Hermes client that spawns `server/hermes_bridge.py`.
- Python bridge that creates one Hermes `AIAgent` per request.
- The backend reads `DEEPSEEK_API_KEY` from local environment variables and never exposes it to the browser.

The frontend sends the visible conversation to the backend. The backend forwards it to Hermes, reads JSON Lines events from the Python bridge, and forwards normalized server-sent events to the browser:

```json
{ "type": "reasoning", "delta": "string" }
{ "type": "answer", "delta": "string" }
{ "type": "done" }
```

Hermes `reasoning_callback` output becomes `reasoning` events. Hermes `stream_callback` output becomes `answer` events. The bridge emits a final `done` event.

## UI

The first screen is the app itself, not a marketing page.

The UI contains:

- A scrollable conversation transcript.
- A composer with a send button.
- Assistant messages with a collapsed-by-user reasoning panel and a separate final answer panel.
- Loading, streaming, and error states.

The reasoning panel starts expanded for new assistant messages so the user can see that the app satisfies the requirement, then can be collapsed per message.
If a reasoning panel is collapsed while streaming, incoming reasoning text continues to accumulate and is visible when reopened.

## Security

The API key is stored only in `.env.local`, which is ignored by Git. The repository may include `.env.example` with a placeholder variable name, but not the real key.

## Testing

Behavioral tests should cover:

- Hermes bridge client spawns the Python bridge and parses JSON Lines events.
- Hermes bridge config uses `deepseek-v4-flash`, DeepSeek provider settings, and thinking overrides.
- API route streams normalized events to the browser.
- Frontend assistant message rendering includes a collapsible reasoning section and a final answer section.
- Frontend streaming reads incremental events and updates the current assistant message as chunks arrive.
- Missing API key and Hermes errors produce clear user-facing errors.

## References

- Hermes Python Library: https://hermes-agent.nousresearch.com/docs/guides/python-library
- Hermes GitHub: https://github.com/NousResearch/hermes-agent
- DeepSeek API: https://api-docs.deepseek.com/api/deepseek-api
- Create Chat Completion: https://api-docs.deepseek.com/api/create-chat-completion
- Thinking Mode: https://api-docs.deepseek.com/guides/thinking_mode
- Models and Pricing: https://api-docs.deepseek.com/quick_start/pricing
