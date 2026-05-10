import express from 'express';
import { chatWithDeepSeek } from './deepseekClient.js';

function isValidMessage(message) {
  return (
    message &&
    ['system', 'user', 'assistant'].includes(message.role) &&
    typeof message.content === 'string' &&
    message.content.trim().length > 0
  );
}

function hasValidMessages(messages) {
  return Array.isArray(messages) && messages.length > 0 && messages.every(isValidMessage);
}

export function createApp({ chatClient = chatWithDeepSeek } = {}) {
  const app = express();

  app.use(express.json({ limit: '1mb' }));

  app.post('/api/chat', async (request, response) => {
    const { messages } = request.body ?? {};

    if (!hasValidMessages(messages)) {
      response.status(400).json({
        error: 'messages must contain at least one valid message'
      });
      return;
    }

    try {
      response.json(await chatClient(messages));
    } catch (error) {
      response.status(502).json({
        error: error.message || 'DeepSeek request failed'
      });
    }
  });

  return app;
}
