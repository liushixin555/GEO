/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ArticleReviewActions from '../../../pages/article/components/ArticleReviewActions';

jest.mock('antd', () => ({
  Alert: ({ message, type, showIcon, action }: { message: string; type: string; showIcon: boolean; action: React.ReactNode }) => (
    <div data-testid="review-alert" data-type={type} data-show-icon={String(showIcon)}>
      <span>{message}</span>
      <div data-testid="alert-action">{action}</div>
    </div>
  ),
  Button: ({ children, loading, disabled, type, danger, icon }: { children: React.ReactNode; loading?: boolean; disabled?: boolean; type?: string; danger?: boolean; icon?: React.ReactNode }) => (
    <button data-testid={`btn-${type || 'default'}${danger ? '-danger' : ''}`} data-loading={String(loading)} disabled={disabled}>
      {icon}{children}
    </button>
  ),
  Popconfirm: ({ title, onConfirm, children }: { title: string; onConfirm: () => void; children: React.ReactNode }) => (
    <div data-testid={`popconfirm-${title}`}>
      <button data-testid={`popconfirm-trigger-${title}`} onClick={onConfirm}>trigger</button>
      {children}
    </div>
  ),
  Space: ({ children, size }: { children: React.ReactNode; size?: number }) => (
    <div data-testid="review-space" data-size={String(size)}>{children}</div>
  ),
}));

describe('ArticleReviewActions', () => {
  const mockOnReview = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('visible=false 时返回 null，不渲染任何内容', () => {
    const { container } = render(<ArticleReviewActions visible={false} onReview={mockOnReview} />);
    expect(container.innerHTML).toBe('');
  });

  it('visible=true 时渲染 Alert 和两个按钮', () => {
    render(<ArticleReviewActions visible={true} onReview={mockOnReview} />);
    expect(screen.getByTestId('review-alert')).toBeTruthy();
    expect(screen.getByText('该文章待审核')).toBeTruthy();
    expect(screen.getByText('审核通过')).toBeTruthy();
    expect(screen.getByText('审核不通过')).toBeTruthy();
  });

  it('Alert 类型为 warning 且 showIcon=true', () => {
    render(<ArticleReviewActions visible={true} onReview={mockOnReview} />);
    const alert = screen.getByTestId('review-alert');
    expect(alert.dataset.type).toBe('warning');
    expect(alert.dataset.showIcon).toBe('true');
  });

  it('使用 antd Space 组件包裹按钮，size=8', () => {
    render(<ArticleReviewActions visible={true} onReview={mockOnReview} />);
    const space = screen.getByTestId('review-space');
    expect(space.dataset.size).toBe('8');
  });

  it('点击审核通过的 Popconfirm 确认触发 onReview(true)', async () => {
    mockOnReview.mockResolvedValue(undefined);
    render(<ArticleReviewActions visible={true} onReview={mockOnReview} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('popconfirm-trigger-确认审核通过？'));
    });

    expect(mockOnReview).toHaveBeenCalledWith(true);
    expect(mockOnReview).toHaveBeenCalledTimes(1);
  });

  it('点击审核不通过的 Popconfirm 确认触发 onReview(false)', async () => {
    mockOnReview.mockResolvedValue(undefined);
    render(<ArticleReviewActions visible={true} onReview={mockOnReview} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('popconfirm-trigger-确认审核不通过？'));
    });

    expect(mockOnReview).toHaveBeenCalledWith(false);
    expect(mockOnReview).toHaveBeenCalledTimes(1);
  });

  it('审核中按钮显示 loading 且 disabled', async () => {
    let resolveReview!: () => void;
    mockOnReview.mockReturnValue(new Promise<void>((resolve) => { resolveReview = resolve; }));

    render(<ArticleReviewActions visible={true} onReview={mockOnReview} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('popconfirm-trigger-确认审核通过？'));
    });

    const approveBtn = screen.getByText('审核通过').closest('button')!;
    const rejectBtn = screen.getByText('审核不通过').closest('button')!;
    expect(approveBtn.dataset.loading).toBe('true');
    expect(approveBtn.disabled).toBe(true);
    expect(rejectBtn.dataset.loading).toBe('true');
    expect(rejectBtn.disabled).toBe(true);

    await act(async () => {
      resolveReview();
    });
  });

  it('审核完成后 loading 消失', async () => {
    mockOnReview.mockResolvedValue(undefined);
    render(<ArticleReviewActions visible={true} onReview={mockOnReview} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('popconfirm-trigger-确认审核通过？'));
    });

    const approveBtn = screen.getByText('审核通过').closest('button')!;
    expect(approveBtn.dataset.loading).toBe('false');
    expect(approveBtn.disabled).toBe(false);
  });

  it('onReview 抛出异常时 loading 仍然清除', async () => {
    mockOnReview.mockRejectedValue(new Error('API error'));
    render(<ArticleReviewActions visible={true} onReview={mockOnReview} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('popconfirm-trigger-确认审核不通过？'));
    });

    const approveBtn = screen.getByText('审核通过').closest('button')!;
    expect(approveBtn.dataset.loading).toBe('false');
    expect(approveBtn.disabled).toBe(false);
  });

  it('React.memo 优化 — props 不变时不重渲染', () => {
    const { rerender } = render(<ArticleReviewActions visible={true} onReview={mockOnReview} />);
    const alertBefore = screen.getByTestId('review-alert');

    rerender(<ArticleReviewActions visible={true} onReview={mockOnReview} />);
    const alertAfter = screen.getByTestId('review-alert');

    expect(alertBefore).toBe(alertAfter);
  });

  it('有 displayName', () => {
    const inner = (ArticleReviewActions as any).type ?? ArticleReviewActions;
    expect(inner.displayName).toBe('ArticleReviewActions');
  });
});
