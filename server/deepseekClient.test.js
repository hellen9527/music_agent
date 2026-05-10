import { describe, expect, it, vi } from 'vitest';
import {
  buildDeepSeekStreamRequest,
  buildDeepSeekRequest,
  chatWithDeepSeek,
  parseDeepSeekStream,
  parseDeepSeekResponse
} from './deepseekClient.js';

function streamFromText(text) {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text));
      controller.close();
    }
  });
}

describe('buildDeepSeekRequest', () => {
  it('uses deepseek-v4-flash with thinking mode enabled', () => {
    const messages = [{ role: 'user', content: '解释一下快速排序' }];

    expect(buildDeepSeekRequest(messages)).toEqual({
      model: 'deepseek-v4-flash',
      messages,
      reasoning_effort: 'high',
      thinking: { type: 'enabled' }
    });
  });
});

describe('buildDeepSeekStreamRequest', () => {
  it('adds stream true to the thinking request', () => {
    const messages = [{ role: 'user', content: '流式回答' }];

    expect(buildDeepSeekStreamRequest(messages)).toEqual({
      model: 'deepseek-v4-flash',
      messages,
      reasoning_effort: 'high',
      thinking: { type: 'enabled' },
      stream: true
    });
  });
});

describe('parseDeepSeekResponse', () => {
  it('separates reasoning_content from the final answer', () => {
    const payload = {
      choices: [
        {
          message: {
            reasoning_content: '先分析问题边界。',
            content: '最终答案是这样。'
          }
        }
      ],
      usage: { total_tokens: 42 }
    };

    expect(parseDeepSeekResponse(payload)).toEqual({
      reasoning: '先分析问题边界。',
      answer: '最终答案是这样。',
      usage: { total_tokens: 42 }
    });
  });
});

describe('parseDeepSeekStream', () => {
  it('emits separate reasoning and answer deltas from DeepSeek SSE chunks', async () => {
    const stream = streamFromText(
      [
        'data: {"choices":[{"delta":{"reasoning_content":"先想"}}]}',
        '',
        'data: {"choices":[{"delta":{"content":"答案"}}]}',
        '',
        'data: [DONE]',
        ''
      ].join('\n')
    );

    const events = [];
    for await (const event of parseDeepSeekStream(stream)) {
      events.push(event);
    }

    expect(events).toEqual([
      { type: 'reasoning', delta: '先想' },
      { type: 'answer', delta: '答案' }
    ]);
  });
});

describe('chatWithDeepSeek', () => {
  it('throws a clear error when the API key is missing', async () => {
    await expect(
      chatWithDeepSeek([{ role: 'user', content: 'hi' }], {
        apiKey: '',
        fetchImpl: vi.fn()
      })
    ).rejects.toThrow('DEEPSEEK_API_KEY is required');
  });

  it('posts the thinking request to DeepSeek and returns normalized content', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              reasoning_content: '思考内容',
              content: '最后答案'
            }
          }
        ]
      })
    }));

    const result = await chatWithDeepSeek([{ role: 'user', content: '你好' }], {
      apiKey: 'test-key',
      fetchImpl
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.deepseek.com/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key',
          'Content-Type': 'application/json'
        })
      })
    );
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toMatchObject({
      model: 'deepseek-v4-flash',
      thinking: { type: 'enabled' },
      reasoning_effort: 'high'
    });
    expect(result).toEqual({
      reasoning: '思考内容',
      answer: '最后答案'
    });
  });

  it('surfaces upstream DeepSeek errors with status and body text', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 429,
      text: async () => 'rate limit'
    }));

    await expect(
      chatWithDeepSeek([{ role: 'user', content: 'hi' }], {
        apiKey: 'test-key',
        fetchImpl
      })
    ).rejects.toThrow('DeepSeek API error (429): rate limit');
  });
});
