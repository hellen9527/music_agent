import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from './app.js';

describe('POST /api/chat', () => {
  it('returns normalized reasoning and answer from the chat client', async () => {
    const messages = [{ role: 'user', content: '你好' }];
    const chatClient = vi.fn(async () => ({
      reasoning: '先理解用户问题。',
      answer: '你好，我可以帮你。'
    }));
    const app = createApp({ chatClient });

    const response = await request(app)
      .post('/api/chat')
      .send({ messages })
      .expect(200);

    expect(chatClient).toHaveBeenCalledWith(messages);
    expect(response.body).toEqual({
      reasoning: '先理解用户问题。',
      answer: '你好，我可以帮你。'
    });
  });

  it('rejects empty messages with a 400 response', async () => {
    const app = createApp({ chatClient: vi.fn() });

    const response = await request(app)
      .post('/api/chat')
      .send({ messages: [] })
      .expect(400);

    expect(response.body).toEqual({
      error: 'messages must contain at least one valid message'
    });
  });

  it('returns a JSON error when the chat client fails', async () => {
    const app = createApp({
      chatClient: vi.fn(async () => {
        throw new Error('DeepSeek API error (429): rate limit');
      })
    });

    const response = await request(app)
      .post('/api/chat')
      .send({ messages: [{ role: 'user', content: 'hi' }] })
      .expect(502);

    expect(response.body).toEqual({
      error: 'DeepSeek API error (429): rate limit'
    });
  });
});
