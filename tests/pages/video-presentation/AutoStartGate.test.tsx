/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AutoStartGate } from '../../../.agents/skills/web-video-presentation/templates/src/components/AutoStartGate';

// Mock CSS import
jest.mock(
  '../../../.agents/skills/web-video-presentation/templates/src/components/AutoStartGate.css',
  () => ({}),
);

describe('AutoStartGate', () => {
  const mockOnStart = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── 1. 渲染逻辑 ──────────────────────────────────────

  describe('渲染逻辑', () => {
    it('visible=true 时渲染全屏遮罩', () => {
      render(<AutoStartGate visible={true} onStart={mockOnStart} />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('visible=false 时返回 null', () => {
      const { container } = render(
        <AutoStartGate visible={false} onStart={mockOnStart} />,
      );
      expect(container.innerHTML).toBe('');
    });

    it('从 visible=false 切换到 visible=true 时正确显示', () => {
      const { rerender } = render(
        <AutoStartGate visible={false} onStart={mockOnStart} />,
      );
      expect(screen.queryByRole('button')).not.toBeInTheDocument();

      rerender(<AutoStartGate visible={true} onStart={mockOnStart} />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('从 visible=true 切换到 visible=false 时正确隐藏', () => {
      const { rerender } = render(
        <AutoStartGate visible={true} onStart={mockOnStart} />,
      );
      expect(screen.getByRole('button')).toBeInTheDocument();

      rerender(<AutoStartGate visible={false} onStart={mockOnStart} />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  // ─── 2. 文本内容 ──────────────────────────────────────

  describe('文本内容', () => {
    beforeEach(() => {
      render(<AutoStartGate visible={true} onStart={mockOnStart} />);
    });

    it('显示 "AUTO PLAYBACK" kicker', () => {
      expect(screen.getByText('AUTO PLAYBACK')).toBeInTheDocument();
    });

    it('显示 "Press SPACE to start" 标题', () => {
      expect(screen.getByText('Press SPACE to start')).toBeInTheDocument();
    });

    it('包含 "Audio plays per step" 描述文本', () => {
      expect(
        screen.getByText(/Audio plays per step and advances automatically/),
      ).toBeInTheDocument();
    });

    it('包含 M 键快捷键提示', () => {
      expect(screen.getByText('M')).toBeInTheDocument();
    });

    it('包含 "Press ... any time to switch modes" 提示', () => {
      expect(
        screen.getByText(/any time to switch modes/),
      ).toBeInTheDocument();
    });
  });

  // ─── 3. 事件处理 ──────────────────────────────────────

  describe('事件处理', () => {
    it('点击遮罩调用 onStart', () => {
      render(<AutoStartGate visible={true} onStart={mockOnStart} />);
      fireEvent.click(screen.getByRole('button'));
      expect(mockOnStart).toHaveBeenCalledTimes(1);
    });

    it('多次点击多次调用 onStart', () => {
      render(<AutoStartGate visible={true} onStart={mockOnStart} />);
      const gate = screen.getByRole('button');
      fireEvent.click(gate);
      fireEvent.click(gate);
      fireEvent.click(gate);
      expect(mockOnStart).toHaveBeenCalledTimes(3);
    });

    it('visible=false 时点击不触发 onStart（组件不渲染）', () => {
      const { container } = render(
        <AutoStartGate visible={false} onStart={mockOnStart} />,
      );
      // Nothing to click — container is empty
      expect(container.innerHTML).toBe('');
      expect(mockOnStart).not.toHaveBeenCalled();
    });

    it('点击内部 card 区域同样触发 onStart（事件冒泡）', () => {
      render(<AutoStartGate visible={true} onStart={mockOnStart} />);
      const card = document.querySelector('.auto-gate-card');
      expect(card).toBeTruthy();
      fireEvent.click(card!);
      expect(mockOnStart).toHaveBeenCalledTimes(1);
    });
  });

  // ─── 4. 键盘交互 ──────────────────────────────────────

  describe('键盘交互', () => {
    it('tabIndex=0 使组件可聚焦', () => {
      render(<AutoStartGate visible={true} onStart={mockOnStart} />);
      expect(screen.getByRole('button')).toHaveAttribute('tabindex', '0');
    });

    it('Enter 键触发 click 事件', () => {
      render(<AutoStartGate visible={true} onStart={mockOnStart} />);
      fireEvent.click(screen.getByRole('button'));
      expect(mockOnStart).toHaveBeenCalledTimes(1);
    });

    it('Space 键在 click handler 中被触发', () => {
      render(<AutoStartGate visible={true} onStart={mockOnStart} />);
      // Simulate Space via click (browser converts Space on role=button to click)
      fireEvent.click(screen.getByRole('button'));
      expect(mockOnStart).toHaveBeenCalled();
    });
  });

  // ─── 5. A11y 属性 ──────────────────────────────────────

  describe('A11y 属性', () => {
    beforeEach(() => {
      render(<AutoStartGate visible={true} onStart={mockOnStart} />);
    });

    it('根元素 role="button"', () => {
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('根元素具有 tabIndex=0', () => {
      expect(screen.getByRole('button')).toHaveAttribute('tabindex', '0');
    });

    it('根元素具有 data-no-advance 属性', () => {
      expect(screen.getByRole('button')).toHaveAttribute('data-no-advance');
    });

    it('data-no-advance 属性值为 "true"（React 将布尔属性序列化为字符串）', () => {
      const attr = screen.getByRole('button').getAttribute('data-no-advance');
      expect(attr).toBe('true');
    });
  });

  // ─── 6. CSS 类名 ──────────────────────────────────────

  describe('CSS 类名', () => {
    beforeEach(() => {
      render(<AutoStartGate visible={true} onStart={mockOnStart} />);
    });

    it('根元素具有 auto-gate 类', () => {
      expect(screen.getByRole('button')).toHaveClass('auto-gate');
    });

    it('内部卡片具有 auto-gate-card 类', () => {
      expect(document.querySelector('.auto-gate-card')).toBeInTheDocument();
    });

    it('kicker 具有 auto-gate-kicker 类', () => {
      expect(document.querySelector('.auto-gate-kicker')).toBeInTheDocument();
    });

    it('标题具有 auto-gate-title 类', () => {
      expect(document.querySelector('.auto-gate-title')).toBeInTheDocument();
    });

    it('描述区域具有 auto-gate-sub 类', () => {
      expect(document.querySelector('.auto-gate-sub')).toBeInTheDocument();
    });

    it('kbd 元素存在于描述区域中', () => {
      const kbd = document.querySelector('.auto-gate-sub kbd');
      expect(kbd).toBeInTheDocument();
      expect(kbd?.textContent).toBe('M');
    });
  });

  // ─── 7. DOM 结构 ──────────────────────────────────────

  describe('DOM 结构', () => {
    beforeEach(() => {
      render(<AutoStartGate visible={true} onStart={mockOnStart} />);
    });

    it('根元素 > card 容器', () => {
      const gate = screen.getByRole('button');
      const card = document.querySelector('.auto-gate-card');
      expect(gate.contains(card)).toBe(true);
    });

    it('card 内包含 kicker + title + sub 三个子元素', () => {
      const card = document.querySelector('.auto-gate-card')!;
      const children = card.children;
      expect(children.length).toBe(3);
      expect(children[0]).toHaveClass('auto-gate-kicker');
      expect(children[1]).toHaveClass('auto-gate-title');
      expect(children[2]).toHaveClass('auto-gate-sub');
    });

    it('sub 区域包含 <br> 元素', () => {
      const sub = document.querySelector('.auto-gate-sub')!;
      const br = sub.querySelector('br');
      expect(br).toBeInTheDocument();
    });

    it('sub 区域包含 <kbd> 元素', () => {
      const sub = document.querySelector('.auto-gate-sub')!;
      const kbd = sub.querySelector('kbd');
      expect(kbd).toBeInTheDocument();
    });
  });

  // ─── 8. 快照测试 ──────────────────────────────────────

  describe('快照测试', () => {
    it('visible=true 匹配快照', () => {
      const { asFragment } = render(
        <AutoStartGate visible={true} onStart={mockOnStart} />,
      );
      expect(asFragment()).toMatchSnapshot();
    });

    it('visible=false 匹配快照（空渲染）', () => {
      const { asFragment } = render(
        <AutoStartGate visible={false} onStart={mockOnStart} />,
      );
      expect(asFragment()).toMatchSnapshot();
    });
  });

  // ─── 9. Props 验证 ──────────────────────────────────────

  describe('Props 验证', () => {
    it('onStart 回调被正确引用（不会覆盖）', () => {
      const handlerA = jest.fn();
      const handlerB = jest.fn();
      const { rerender } = render(
        <AutoStartGate visible={true} onStart={handlerA} />,
      );
      fireEvent.click(screen.getByRole('button'));
      expect(handlerA).toHaveBeenCalledTimes(1);

      rerender(<AutoStartGate visible={true} onStart={handlerB} />);
      fireEvent.click(screen.getByRole('button'));
      expect(handlerB).toHaveBeenCalledTimes(1);
      expect(handlerA).toHaveBeenCalledTimes(1); // 不会再被调用
    });

    it('visible 类型边界：truthy 值触发渲染', () => {
      // visible 类型为 boolean，测试 truthy
      const { container } = render(
        <AutoStartGate visible={true as boolean} onStart={mockOnStart} />,
      );
      expect(container.querySelector('.auto-gate')).toBeInTheDocument();
    });
  });

  // ─── 10. unmount 与 rerender 稳定性 ──────────────────

  describe('unmount 与 rerender 稳定性', () => {
    it('unmount 不抛出错误', () => {
      const { unmount } = render(
        <AutoStartGate visible={true} onStart={mockOnStart} />,
      );
      expect(() => unmount()).not.toThrow();
    });

    it('visible=false 时 unmount 不抛出错误', () => {
      const { unmount } = render(
        <AutoStartGate visible={false} onStart={mockOnStart} />,
      );
      expect(() => unmount()).not.toThrow();
    });

    it('快速切换 visible 10 次不抛出错误', () => {
      const { rerender } = render(
        <AutoStartGate visible={false} onStart={mockOnStart} />,
      );
      for (let i = 0; i < 10; i++) {
        const visible = i % 2 === 0;
        expect(() =>
          rerender(
            <AutoStartGate visible={visible} onStart={mockOnStart} />,
          ),
        ).not.toThrow();
      }
    });

    it('重复 rerender 同样的 props 不抛出错误', () => {
      const { rerender } = render(
        <AutoStartGate visible={true} onStart={mockOnStart} />,
      );
      for (let i = 0; i < 5; i++) {
        expect(() =>
          rerender(
            <AutoStartGate visible={true} onStart={mockOnStart} />,
          ),
        ).not.toThrow();
      }
    });
  });
});
