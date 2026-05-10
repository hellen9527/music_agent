# DeepSeek Chat App Design

## Goal

Build a local web chat app that calls the official DeepSeek OpenAI-compatible API and displays each assistant response in two distinct parts:

- Reasoning: the `reasoning_content` returned by DeepSeek thinking mode.
- Final answer: the `content` returned by the model.

The reasoning section must be collapsible so the user can hide or show it for each assistant message.

## External API

The app will use DeepSeek's official API base URL:

```text
https://api.deepseek.com
```

The model is fixed to:

```text
deepseek-v4-flash
```

The request enables thinking mode with high effort using OpenAI-compatible fields:

```json
{
  "model": "deepseek-v4-flash",
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
- Express backend for `/api/chat`.
- The backend reads `DEEPSEEK_API_KEY` from local environment variables and never exposes it to the browser.

The frontend sends the visible conversation to the backend. The backend calls DeepSeek, extracts `reasoning_content` and `content`, and returns a normalized JSON response:

```json
{
  "reasoning": "string",
  "answer": "string"
}
```

## UI

The first screen is the app itself, not a marketing page.

The UI contains:

- A scrollable conversation transcript.
- A composer with a send button.
- Assistant messages with a collapsed-by-user reasoning panel and a separate final answer panel.
- Loading and error states.

The reasoning panel starts expanded for new assistant messages so the user can see that the app satisfies the requirement, then can be collapsed per message.

## Security

The API key is stored only in `.env.local`, which is ignored by Git. The repository may include `.env.example` with a placeholder variable name, but not the real key.

## Testing

Behavioral tests should cover:

- Server request construction uses `deepseek-v4-flash` and thinking mode.
- Server response parsing separates `reasoning_content` from `content`.
- Frontend assistant message rendering includes a collapsible reasoning section and a final answer section.
- Missing API key and DeepSeek API errors produce clear user-facing errors.

## References

- DeepSeek API: https://api-docs.deepseek.com/api/deepseek-api
- Create Chat Completion: https://api-docs.deepseek.com/api/create-chat-completion
- Thinking Mode: https://api-docs.deepseek.com/guides/thinking_mode
- Models and Pricing: https://api-docs.deepseek.com/quick_start/pricing
