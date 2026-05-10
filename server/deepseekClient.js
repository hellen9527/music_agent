const DEEPSEEK_CHAT_COMPLETIONS_URL = 'https://api.deepseek.com/chat/completions';

export function buildDeepSeekRequest(messages) {
  return {
    model: 'deepseek-v4-flash',
    messages,
    reasoning_effort: 'high',
    thinking: { type: 'enabled' }
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
