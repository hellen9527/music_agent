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

## Music Router Mode

By default the Hermes bridge runs with `HERMES_AGENT_MODE=music_router`. In this mode, Hermes still owns the model turn, but the system prompt makes it act as a music-domain intent router rather than a general chat bot.

For non-chat user queries, the final answer must be valid JSON only. It identifies the intent and the skill to call:

- `精准搜索` -> `music_search`
- `推荐` -> `music_recommend`
- `随机推荐` -> `random_recommend`
- `AI搜索` -> `ai_search`
- `操控` -> `app_control`
- `资产查询` -> `asset_query`
- `榜单` -> `chart_query`
- `任务编排` -> `task_plan`

闲聊 queries are answered directly in natural language. Complex queries with multiple intents return a `task_plan` JSON object with ordered steps.

`music_recommend` is intentionally narrow: it handles subjective recommendation constraints such as scene, mood, language, style, era, or activity, but it has no search capability. Queries that require external knowledge, entity expansion, or freshness should route to `ai_search`, `chart_query`, or `task_plan`.

Chart routing is semantic, not just literal. The user does not need to name a supported chart exactly. If the query can be solved by one of the available charts, the agent should infer the chart. For example, “最近有什么好听的歌” should first query relevant charts such as `新歌榜` and `抖音热搜榜`, then optionally fetch concrete song information from the returned results.

Entity expansion is still different from general trend queries. For example, “想找点台湾歌手的新歌来听” should not become a plain recommendation, because the system first needs to understand which artists count as Taiwanese singers and then find their recent songs. That should be a plan such as `ai_search` for candidate artists/recent releases followed by `music_search` for the returned artist and song names.

Negative feedback on a previous recommendation is context-dependent. If the previous assistant answer called `music_recommend` and the user says something like “这些不好听” or “换一批”, the agent should keep the previous recommendation conditions and call `music_recommend` again with the same keywords plus feedback indicating that the last batch was rejected. It should not switch to `random_recommend` or change style, scene, language, or era unless the user explicitly asks to change those conditions.

The UI continues showing reasoning deltas as soon as Hermes emits them. Answer deltas also stream into the final answer area while generation is in progress. When the backend emits `done`, the frontend parses the completed answer; if it is valid JSON, it replaces the raw streamed text once with formatted structured JSON. This avoids showing half-complete JSON as the final stable state while still giving the user visible progress during generation.

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
