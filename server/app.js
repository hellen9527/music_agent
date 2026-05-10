import express from 'express';
import {
  chatWithHermesAgent,
  streamHermesAgent
} from './hermesAgentClient.js';

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

function writeSseEvent(response, event) {
  response.write(`data: ${JSON.stringify(event)}\n\n`);
}

export function createApp({
  chatClient = chatWithHermesAgent,
  streamClient = streamHermesAgent
} = {}) {
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
        error: error.message || 'Hermes agent request failed'
      });
    }
  });

  app.post('/api/chat/stream', async (request, response) => {
    const { messages } = request.body ?? {};

    if (!hasValidMessages(messages)) {
      response.status(400).json({
        error: 'messages must contain at least one valid message'
      });
      return;
    }

    response.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive'
    });

    try {
      for await (const event of streamClient(messages)) {
        writeSseEvent(response, event);
      }
      writeSseEvent(response, { type: 'done' });
      response.end();
    } catch (error) {
      writeSseEvent(response, {
        type: 'error',
        error: error.message || 'Hermes agent request failed'
      });
      response.end();
    }
  });

  return app;
}
