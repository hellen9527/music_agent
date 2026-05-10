import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.jsx';

describe('App', () => {
  beforeEach(() => {
    const encoder = new TextEncoder();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(
              encoder.encode('data: {"type":"reasoning","delta":"先拆解"}\n\n')
            );
            controller.enqueue(
              encoder.encode('data: {"type":"reasoning","delta":"用户问题。"}\n\n')
            );
            controller.enqueue(
              encoder.encode('data: {"type":"answer","delta":"这是"}\n\n')
            );
            controller.enqueue(
              encoder.encode('data: {"type":"answer","delta":"最终回答。"}\n\n')
            );
            controller.enqueue(encoder.encode('data: {"type":"done"}\n\n'));
            controller.close();
          }
        })
      }))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('streams the user prompt and renders reasoning separately from the final answer', async () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText('输入消息'), {
      target: { value: '你好 DeepSeek' }
    });
    fireEvent.click(screen.getByRole('button', { name: '发送' }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/chat/stream',
        expect.objectContaining({ method: 'POST' })
      );
    });

    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
      messages: [{ role: 'user', content: '你好 DeepSeek' }]
    });
    expect(await screen.findByText('先拆解用户问题。')).toBeInTheDocument();
    expect(screen.getByText('这是最终回答。')).toBeInTheDocument();
  });
});
