const DEEPSEEK_CHAT_COMPLETIONS_URL = 'https://api.deepseek.com/chat/completions';

export function buildDeepSeekRequest(messages) {
  return {
    model: 'deepseek-v4-flash',
    messages,
    reasoning_effort: 'high',
    thinking: { type: 'enabled' }
  };
}

export function buildDeepSeekStreamRequest(messages) {
  return {
    ...buildDeepSeekRequest(messages),
    stream: true
  };
}

export function parseDeepSeekResponse(payload) {
  const message = payload?.choices?.[0]?.message ?? {};
  const normalized = {
    reasoning: message.reasoning_content ?? '',
    answer: message.content ?? ''
  };

  if (payload?.usage) {
    normalized.usage = payload.usage;
  }

  return normalized;
}

export async function chatWithDeepSeek(messages, options = {}) {
  const {
    apiKey = process.env.DEEPSEEK_API_KEY,
    fetchImpl = globalThis.fetch
  } = options;

  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is required');
  }

  if (!fetchImpl) {
    throw new Error('fetch is required to call DeepSeek');
  }

  const response = await fetchImpl(DEEPSEEK_CHAT_COMPLETIONS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(buildDeepSeekRequest(messages))
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`DeepSeek API error (${response.status}): ${body}`);
  }

  return parseDeepSeekResponse(await response.json());
}

function parseSseEvent(rawEvent) {
  return rawEvent
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trimStart())
    .join('\n');
}

function streamEventFromPayload(payload) {
  const delta = payload?.choices?.[0]?.delta ?? {};

  if (delta.reasoning_content) {
    return { type: 'reasoning', delta: delta.reasoning_content };
  }

  if (delta.content) {
    return { type: 'answer', delta: delta.content };
  }

  return null;
}

export async function* parseDeepSeekStream(readable) {
  const reader = readable.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
    const events = buffer.split(/\r?\n\r?\n/);
    buffer = events.pop() ?? '';

    for (const rawEvent of events) {
      const data = parseSseEvent(rawEvent);
      if (!data) {
        continue;
      }

      if (data === '[DONE]') {
        return;
      }

      const event = streamEventFromPayload(JSON.parse(data));
      if (event) {
        yield event;
      }
    }

    if (done) {
      break;
    }
  }

  const finalData = parseSseEvent(buffer);
  if (finalData && finalData !== '[DONE]') {
    const event = streamEventFromPayload(JSON.parse(finalData));
    if (event) {
      yield event;
    }
  }
}

export async function streamWithDeepSeek(messages, options = {}) {
  const {
    apiKey = process.env.DEEPSEEK_API_KEY,
    fetchImpl = globalThis.fetch
  } = options;

  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is required');
  }

  if (!fetchImpl) {
    throw new Error('fetch is required to call DeepSeek');
  }

  const response = await fetchImpl(DEEPSEEK_CHAT_COMPLETIONS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(buildDeepSeekStreamRequest(messages))
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`DeepSeek API error (${response.status}): ${body}`);
  }

  return response.body;
}
