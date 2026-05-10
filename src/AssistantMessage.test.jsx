import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AssistantMessage } from './AssistantMessage.jsx';

describe('AssistantMessage', () => {
  it('renders collapsible reasoning separately from the final answer', () => {
    render(
      <AssistantMessage
        message={{
          reasoning: '这是模型的思考过程。',
          answer: '这是模型的最后答案。'
        }}
      />
    );

    expect(screen.getByText('思考过程')).toBeInTheDocument();
    expect(screen.getByText('这是模型的思考过程。')).toBeInTheDocument();
    expect(screen.getByText('最后答案')).toBeInTheDocument();
    expect(screen.getByText('这是模型的最后答案。')).toBeInTheDocument();

    const toggle = screen.getByRole('button', { name: '收起思考过程' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(toggle);

    expect(screen.getByRole('button', { name: '展开思考过程' })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    expect(screen.queryByText('这是模型的思考过程。')).not.toBeInTheDocument();
    expect(screen.getByText('这是模型的最后答案。')).toBeInTheDocument();
  });
});
