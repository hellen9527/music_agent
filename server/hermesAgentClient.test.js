import { PassThrough } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import {
  buildHermesPayload,
  chatWithHermesAgent,
  streamHermesAgent
} from './hermesAgentClient.js';

function createFakeSpawn(lines, { code = 0, stderr = '' } = {}) {
  return vi.fn(() => {
    const child = {
      stdin: new PassThrough(),
      stdout: new PassThrough(),
      stderr: new PassThrough(),
      on: vi.fn((event, callback) => {
        if (event === 'close') {
          child._close = callback;
        }
        if (event === 'error') {
          child._error = callback;
        }
        return child;
      })
    };

    queueMicrotask(() => {
      if (stderr) {
        child.stderr.write(stderr);
      }
      child.stderr.end();
      for (const line of lines) {
        child.stdout.write(`${JSON.stringify(line)}\n`);
      }
      child.stdout.end();
      child._close?.(code);
    });

    return child;
  });
}

describe('buildHermesPayload', () => {
  it('passes visible conversation messages to the Hermes bridge', () => {
    const messages = [
      { role: 'user', content: '你好' },
      { role: 'assistant', content: '你好，我是 Hermes。' },
      { role: 'user', content: '继续' }
    ];

    expect(buildHermesPayload(messages)).toEqual({ messages });
  });
});

describe('streamHermesAgent', () => {
  it('spawns the Python Hermes bridge and yields JSONL events', async () => {
    const spawnImpl = createFakeSpawn([
      { type: 'reasoning', delta: '先规划' },
      { type: 'answer', delta: '最终回答' }
    ]);

    const events = [];
    for await (const event of streamHermesAgent([{ role: 'user', content: 'hi' }], {
      spawnImpl,
      pythonPath: '/tmp/python',
      bridgePath: '/tmp/hermes_bridge.py',
      env: { DEEPSEEK_API_KEY: 'test-key' }
    })) {
      events.push(event);
    }

    expect(spawnImpl).toHaveBeenCalledWith(
      '/tmp/python',
      ['/tmp/hermes_bridge.py'],
      expect.objectContaining({
        stdio: ['pipe', 'pipe', 'pipe']
      })
    );
    expect(events).toEqual([
      { type: 'reasoning', delta: '先规划' },
      { type: 'answer', delta: '最终回答' }
    ]);
  });
});

describe('chatWithHermesAgent', () => {
  it('aggregates streamed Hermes answer events into a JSON response', async () => {
    const streamClient = async function* () {
      yield { type: 'reasoning', delta: '想一下' };
      yield { type: 'answer', delta: '第一段' };
      yield { type: 'answer', delta: '第二段' };
    };

    await expect(
      chatWithHermesAgent([{ role: 'user', content: 'hi' }], { streamClient })
    ).resolves.toEqual({
      reasoning: '想一下',
      answer: '第一段第二段'
    });
  });
});
