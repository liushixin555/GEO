/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AutoToggle } from '../../../.agents/skills/web-video-presentation/templates/src/components/AutoToggle';
import type { PlaybackMode } from '../../../.agents/skills/web-video-presentation/templates/src/hooks/useAudioPlayer';

describe('AutoToggle', () => {
  const mockOnCycle = jest.fn();
  const modes: PlaybackMode[] = ['manual', 'audio', 'auto'];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── 1. 渲染逻辑 ──────────────────────────────────────

  describe('渲染逻辑', () => {
    it('渲染容器 div.at-hover', () => {
      render(<AutoToggle mode="manual" onCycle={mockOnCycle} />);
      expect(document.querySelector('.at-hover')).toBeInTheDocument();
    });

    it('渲染内部 button 元素', () => {
      render(<AutoToggle mode="manual" onCycle={mockOnCycle} />);
      expect(document.querySelector('.at-btn')).toBeInTheDocument();
    });

    it('三种 mode 均正常渲染不报错', () => {
      modes.forEach((mode) => {
        const { unmount } = render(
          <AutoToggle mode={mode} onCycle={mockOnCycle} />,
        );
        expect(document.querySelector('.at-hover')).toBeInTheDocument();
        unmount();
      });
    });

    it('切换 mode 从 manual → audio → auto 均正确渲染', () => {
      const { rerender } = render(
        <AutoToggle mode="manual" onCycle={mockOnCycle} />,
      );
      expect(screen.getByText('MANUAL')).toBeInTheDocument();

      rerender(<AutoToggle mode="audio" onCycle={mockOnCycle} />);
      expect(screen.getByText('AUDIO')).toBeInTheDocument();

      rerender(<AutoToggle mode="auto" onCycle={mockOnCycle} />);
      expect(screen.getByText('AUTO')).toBeInTheDocument();
    });
  });

  // ─── 2. 文本内容 ──────────────────────────────────────

  describe('文本内容', () => {
    it('mode=manual 时显示 "MANUAL" 标签', () => {
      render(<AutoToggle mode="manual" onCycle={mockOnCycle} />);
      expect(screen.getByText('MANUAL')).toBeInTheDocument();
    });

    it('mode=audio 时显示 "AUDIO" 标签', () => {
      render(<AutoToggle mode="audio" onCycle={mockOnCycle} />);
      expect(screen.getByText('AUDIO')).toBeInTheDocument();
    });

    it('mode=auto 时显示 "AUTO" 标签', () => {
      render(<AutoToggle mode="auto" onCycle={mockOnCycle} />);
      expect(screen.getByText('AUTO')).toBeInTheDocument();
    });

    it('按钮 title 属性为 "切换播放模式（M）"', () => {
      render(<AutoToggle mode="manual" onCycle={mockOnCycle} />);
      const btn = document.querySelector('.at-btn') as HTMLElement;
      expect(btn).toHaveAttribute('title', '切换播放模式（M）');
    });
  });

  // ─── 3. 事件处理 ──────────────────────────────────────

  describe('事件处理', () => {
    it('点击按钮调用 onCycle', () => {
      render(<AutoToggle mode="manual" onCycle={mockOnCycle} />);
      fireEvent.click(document.querySelector('.at-btn')!);
      expect(mockOnCycle).toHaveBeenCalledTimes(1);
    });

    it('多次点击多次调用 onCycle', () => {
      render(<AutoToggle mode="manual" onCycle={mockOnCycle} />);
      const btn = document.querySelector('.at-btn')!;
      fireEvent.click(btn);
      fireEvent.click(btn);
      fireEvent.click(btn);
      expect(mockOnCycle).toHaveBeenCalledTimes(3);
    });

    it('点击按钮调用 stopPropagation', () => {
      render(<AutoToggle mode="manual" onCycle={mockOnCycle} />);
      const btn = document.querySelector('.at-btn')!;
      const stopSpy = jest.spyOn(Event.prototype, 'stopPropagation');
      fireEvent.click(btn);
      expect(stopSpy).toHaveBeenCalled();
      stopSpy.mockRestore();
    });

    it('不同 mode 下点击均触发 onCycle', () => {
      modes.forEach((mode) => {
        const { unmount } = render(
          <AutoToggle mode={mode} onCycle={mockOnCycle} />,
        );
        fireEvent.click(document.querySelector('.at-btn')!);
        unmount();
      });
      expect(mockOnCycle).toHaveBeenCalledTimes(3);
    });
  });

  // ─── 4. A11y 属性 ──────────────────────────────────────

  describe('A11y 属性', () => {
    it('容器 div 具有 data-no-advance 属性', () => {
      render(<AutoToggle mode="manual" onCycle={mockOnCycle} />);
      const hover = document.querySelector('.at-hover');
      expect(hover).toHaveAttribute('data-no-advance');
    });

    it('data-no-advance 属性值为 "true"', () => {
      render(<AutoToggle mode="manual" onCycle={mockOnCycle} />);
      const hover = document.querySelector('.at-hover');
      expect(hover?.getAttribute('data-no-advance')).toBe('true');
    });

    it('按钮具有 title 提示', () => {
      render(<AutoToggle mode="manual" onCycle={mockOnCycle} />);
      const btn = document.querySelector('.at-btn');
      expect(btn?.getAttribute('title')).toBe('切换播放模式（M）');
    });
  });

  // ─── 5. CSS 类名 ──────────────────────────────────────

  describe('CSS 类名', () => {
    it('容器具有 at-hover 类', () => {
      render(<AutoToggle mode="manual" onCycle={mockOnCycle} />);
      expect(document.querySelector('.at-hover')).toBeInTheDocument();
    });

    it('按钮具有 at-btn 类', () => {
      render(<AutoToggle mode="manual" onCycle={mockOnCycle} />);
      expect(document.querySelector('.at-btn')).toBeInTheDocument();
    });

    it('按钮具有 at-manual 类（mode=manual）', () => {
      render(<AutoToggle mode="manual" onCycle={mockOnCycle} />);
      expect(document.querySelector('.at-btn')).toHaveClass('at-manual');
    });

    it('按钮具有 at-audio 类（mode=audio）', () => {
      render(<AutoToggle mode="audio" onCycle={mockOnCycle} />);
      expect(document.querySelector('.at-btn')).toHaveClass('at-audio');
    });

    it('按钮具有 at-auto 类（mode=auto）', () => {
      render(<AutoToggle mode="auto" onCycle={mockOnCycle} />);
      expect(document.querySelector('.at-btn')).toHaveClass('at-auto');
    });

    it('圆点具有 at-dot 类', () => {
      render(<AutoToggle mode="manual" onCycle={mockOnCycle} />);
      expect(document.querySelector('.at-dot')).toBeInTheDocument();
    });

    it('标签具有 at-label 类', () => {
      render(<AutoToggle mode="manual" onCycle={mockOnCycle} />);
      expect(document.querySelector('.at-label')).toBeInTheDocument();
    });
  });

  // ─── 6. DOM 结构 ──────────────────────────────────────

  describe('DOM 结构', () => {
    it('at-hover > at-btn 嵌套关系', () => {
      render(<AutoToggle mode="manual" onCycle={mockOnCycle} />);
      const hover = document.querySelector('.at-hover')!;
      const btn = document.querySelector('.at-btn')!;
      expect(hover.contains(btn)).toBe(true);
    });

    it('at-btn > at-dot + at-label 子元素', () => {
      render(<AutoToggle mode="manual" onCycle={mockOnCycle} />);
      const btn = document.querySelector('.at-btn')!;
      const children = btn.children;
      expect(children.length).toBe(2);
      expect(children[0]).toHaveClass('at-dot');
      expect(children[1]).toHaveClass('at-label');
    });

    it('at-dot 为 span 元素', () => {
      render(<AutoToggle mode="manual" onCycle={mockOnCycle} />);
      const dot = document.querySelector('.at-dot');
      expect(dot?.tagName).toBe('SPAN');
    });

    it('at-label 为 span 元素', () => {
      render(<AutoToggle mode="manual" onCycle={mockOnCycle} />);
      const label = document.querySelector('.at-label');
      expect(label?.tagName).toBe('SPAN');
    });

    it('at-btn 为 button 元素', () => {
      render(<AutoToggle mode="manual" onCycle={mockOnCycle} />);
      const btn = document.querySelector('.at-btn');
      expect(btn?.tagName).toBe('BUTTON');
    });
  });

  // ─── 7. 模式切换 ──────────────────────────────────────

  describe('模式切换', () => {
    it('从 manual 切换到 audio 时类名更新', () => {
      const { rerender } = render(
        <AutoToggle mode="manual" onCycle={mockOnCycle} />,
      );
      expect(document.querySelector('.at-btn')).toHaveClass('at-manual');

      rerender(<AutoToggle mode="audio" onCycle={mockOnCycle} />);
      expect(document.querySelector('.at-btn')).toHaveClass('at-audio');
      expect(document.querySelector('.at-btn')).not.toHaveClass('at-manual');
    });

    it('从 audio 切换到 auto 时标签更新', () => {
      const { rerender } = render(
        <AutoToggle mode="audio" onCycle={mockOnCycle} />,
      );
      expect(screen.getByText('AUDIO')).toBeInTheDocument();

      rerender(<AutoToggle mode="auto" onCycle={mockOnCycle} />);
      expect(screen.getByText('AUTO')).toBeInTheDocument();
      expect(screen.queryByText('AUDIO')).not.toBeInTheDocument();
    });

    it('快速切换 mode 10 次不报错', () => {
      const { rerender } = render(
        <AutoToggle mode="manual" onCycle={mockOnCycle} />,
      );
      for (let i = 0; i < 10; i++) {
        const mode = modes[i % 3];
        expect(() =>
          rerender(<AutoToggle mode={mode} onCycle={mockOnCycle} />),
        ).not.toThrow();
      }
    });
  });

  // ─── 8. 快照测试 ──────────────────────────────────────

  describe('快照测试', () => {
    it('mode=manual 匹配快照', () => {
      const { asFragment } = render(
        <AutoToggle mode="manual" onCycle={mockOnCycle} />,
      );
      expect(asFragment()).toMatchSnapshot();
    });

    it('mode=audio 匹配快照', () => {
      const { asFragment } = render(
        <AutoToggle mode="audio" onCycle={mockOnCycle} />,
      );
      expect(asFragment()).toMatchSnapshot();
    });

    it('mode=auto 匹配快照', () => {
      const { asFragment } = render(
        <AutoToggle mode="auto" onCycle={mockOnCycle} />,
      );
      expect(asFragment()).toMatchSnapshot();
    });
  });

  // ─── 9. Props 验证 ──────────────────────────────────────

  describe('Props 验证', () => {
    it('onCycle 回调被正确引用（不会覆盖）', () => {
      const handlerA = jest.fn();
      const handlerB = jest.fn();
      const { rerender } = render(
        <AutoToggle mode="manual" onCycle={handlerA} />,
      );
      fireEvent.click(document.querySelector('.at-btn')!);
      expect(handlerA).toHaveBeenCalledTimes(1);

      rerender(<AutoToggle mode="manual" onCycle={handlerB} />);
      fireEvent.click(document.querySelector('.at-btn')!);
      expect(handlerB).toHaveBeenCalledTimes(1);
      expect(handlerA).toHaveBeenCalledTimes(1);
    });

    it('所有 PlaybackMode 值均为合法 mode', () => {
      modes.forEach((mode) => {
        const { unmount } = render(
          <AutoToggle mode={mode} onCycle={mockOnCycle} />,
        );
        expect(document.querySelector('.at-hover')).toBeInTheDocument();
        unmount();
      });
    });
  });

  // ─── 10. unmount 与 rerender 稳定性 ──────────────────

  describe('unmount 与 rerender 稳定性', () => {
    it('unmount 不抛出错误', () => {
      const { unmount } = render(
        <AutoToggle mode="manual" onCycle={mockOnCycle} />,
      );
      expect(() => unmount()).not.toThrow();
    });

    it('不同 mode 下 unmount 均不报错', () => {
      modes.forEach((mode) => {
        const { unmount } = render(
          <AutoToggle mode={mode} onCycle={mockOnCycle} />,
        );
        expect(() => unmount()).not.toThrow();
      });
    });

    it('重复 rerender 同样的 props 不抛出错误', () => {
      const { rerender } = render(
        <AutoToggle mode="manual" onCycle={mockOnCycle} />,
      );
      for (let i = 0; i < 5; i++) {
        expect(() =>
          rerender(<AutoToggle mode="manual" onCycle={mockOnCycle} />),
        ).not.toThrow();
      }
    });

    it('快速切换 mode 后点击按钮仍然正常', () => {
      const { rerender } = render(
        <AutoToggle mode="manual" onCycle={mockOnCycle} />,
      );
      for (let i = 0; i < 6; i++) {
        rerender(
          <AutoToggle mode={modes[i % 3]} onCycle={mockOnCycle} />,
        );
      }
      fireEvent.click(document.querySelector('.at-btn')!);
      expect(mockOnCycle).toHaveBeenCalledTimes(1);
    });
  });
});
