# DeepSeek Chat App Design

## Goal

Build a local web chat app that calls the official DeepSeek OpenAI-compatible API and displays each assistant response in two distinct parts:

- Reasoning: the `reasoning_content` returned by DeepSeek thinking mode.
- Final answer: the `content` returned by the model.

The reasoning section must be collapsible so the user can hide or show it for each assistant message.
Responses must stream incrementally. The user should see reasoning tokens appear in the reasoning section and final answer tokens appear in the answer section as the model produces them.

## External API

The app will use DeepSeek's official API base URL:

```text
https://api.deepseek.com
```

The model is fixed to:

```text
deepseek-v4-flash
```

The backend will call the REST API directly. The request enables thinking mode with high effort using OpenAI-compatible fields:

```json
{
  "model": "deepseek-v4-flash",
  "stream": true,
  "reasoning_effort": "high",
  "thinking": {
    "type": "enabled"
  }
}
```

For multi-turn conversations without tool calls, the client stores prior user messages and prior assistant final answers. It does not rely on previous reasoning text as normal conversational context.

## Architecture

Use a small full-stack JavaScript app:

- Vite + React frontend for the chat UI.
- Express backend for `/api/chat/stream`.
- The backend reads `DEEPSEEK_API_KEY` from local environment variables and never exposes it to the browser.

The frontend sends the visible conversation to the backend. The backend calls DeepSeek with `stream: true`, reads DeepSeek's server-sent event stream, and forwards normalized server-sent events to the browser:

```json
{ "type": "reasoning", "delta": "string" }
{ "type": "answer", "delta": "string" }
{ "type": "done" }
```

DeepSeek chunks with `delta.reasoning_content` become `reasoning` events. Chunks with `delta.content` become `answer` events. `data: [DONE]` ends the stream.

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

- Server request construction uses `deepseek-v4-flash` and thinking mode.
- Server response parsing separates `reasoning_content` from `content`.
- Server stream parsing emits separate reasoning and answer deltas.
- API route streams normalized events to the browser.
- Frontend assistant message rendering includes a collapsible reasoning section and a final answer section.
- Frontend streaming reads incremental events and updates the current assistant message as chunks arrive.
- Missing API key and DeepSeek API errors produce clear user-facing errors.

## References

- DeepSeek API: https://api-docs.deepseek.com/api/deepseek-api
- Create Chat Completion: https://api-docs.deepseek.com/api/create-chat-completion
- Thinking Mode: https://api-docs.deepseek.com/guides/thinking_mode
- Models and Pricing: https://api-docs.deepseek.com/quick_start/pricing
