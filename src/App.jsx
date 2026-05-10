import { Send } from 'lucide-react';
import { useState } from 'react';
import { AssistantMessage } from './AssistantMessage.jsx';
import './styles.css';

function createMessageId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toApiMessages(history, nextUserContent) {
  const messages = history.flatMap((message) => {
    if (message.role === 'user') {
      return [{ role: 'user', content: message.content }];
    }

    return [{ role: 'assistant', content: message.answer }];
  });

  messages.push({ role: 'user', content: nextUserContent });
  return messages;
}

export default function App() {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();

    const content = draft.trim();
    if (!content || isSending) {
      return;
    }

    const userMessage = {
      id: createMessageId(),
      role: 'user',
      content
    };
    const requestMessages = toApiMessages(messages, content);

    setMessages((current) => [...current, userMessage]);
    setDraft('');
    setError('');
    setIsSending(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ messages: requestMessages })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || '请求 DeepSeek 失败');
      }

      setMessages((current) => [
        ...current,
        {
          id: createMessageId(),
          role: 'assistant',
          reasoning: payload.reasoning,
          answer: payload.answer
        }
      ]);
    } catch (requestError) {
      setError(requestError.message || '请求 DeepSeek 失败');
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">DeepSeek</p>
          <h1>Thinking Chat</h1>
        </div>
        <span className="model-pill">deepseek-v4-flash</span>
      </header>

      <section className="conversation" aria-live="polite">
        {messages.length === 0 ? (
          <div className="empty-state">
            <strong>开始一轮对话</strong>
            <span>模型的思考和回答会分开显示。</span>
          </div>
        ) : null}

        {messages.map((message) =>
          message.role === 'assistant' ? (
            <AssistantMessage key={message.id} message={message} />
          ) : (
            <article key={message.id} className="message message-user">
              {message.content}
            </article>
          )
        )}

        {isSending ? (
          <div className="status-line" role="status">
            正在思考...
          </div>
        ) : null}
      </section>

      {error ? (
        <div className="error-banner" role="alert">
          {error}
        </div>
      ) : null}

      <form className="composer" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="chat-input">
          输入消息
        </label>
        <textarea
          id="chat-input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="输入消息"
          rows={2}
        />
        <button type="submit" disabled={isSending || draft.trim().length === 0}>
          <Send size={18} aria-hidden="true" />
          发送
        </button>
      </form>
    </main>
  );
}
