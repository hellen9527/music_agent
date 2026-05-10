import { useId, useState } from 'react';

export function AssistantMessage({ message }) {
  const [isReasoningOpen, setIsReasoningOpen] = useState(true);
  const reasoningId = useId();
  const reasoning = message.reasoning?.trim() || '暂无思考过程。';
  const answer = message.answer?.trim() || '暂无最后答案。';

  return (
    <article className="message message-assistant">
      <section className="reasoning-section" aria-label="思考过程">
        <div className="section-header">
          <h3>思考过程</h3>
          <button
            className="ghost-button"
            type="button"
            aria-expanded={isReasoningOpen}
            aria-controls={reasoningId}
            onClick={() => setIsReasoningOpen((current) => !current)}
          >
            {isReasoningOpen ? '收起思考过程' : '展开思考过程'}
          </button>
        </div>

        {isReasoningOpen ? (
          <div id={reasoningId} className="reasoning-content">
            {reasoning}
          </div>
        ) : null}
      </section>

      <section className="answer-section" aria-label="最后答案">
        <h3>最后答案</h3>
        <div className="answer-content">{answer}</div>
      </section>
    </article>
  );
}
