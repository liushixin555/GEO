/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MaskReveal } from '../../../.agents/skills/web-video-presentation/templates/src/components/MaskReveal';

describe('MaskReveal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── 1. 渲染逻辑 ──────────────────────────────────────

  describe('渲染逻辑', () => {
    it('show=true 时渲染 span 元素', () => {
      render(<MaskReveal show={true}>Hello</MaskReveal>);
      expect(screen.getByText('Hello')).toBeInTheDocument();
    });

    it('show=false 时渲染 span 元素（不隐藏 DOM）', () => {
      render(<MaskReveal show={false}>Hello</MaskReveal>);
      expect(screen.getByText('Hello')).toBeInTheDocument();
    });

    it('根元素为 span 标签', () => {
      render(<MaskReveal show={true}>text</MaskReveal>);
      const el = screen.getByText('text');
      expect(el.tagName).toBe('SPAN');
    });

    it('从 show=false 切换到 show=true 时正确更新', () => {
      const { rerender } = render(
        <MaskReveal show={false}>content</MaskReveal>,
      );
      const el = screen.getByText('content');
      expect(el).not.toHaveClass('in');

      rerender(<MaskReveal show={true}>content</MaskReveal>);
      expect(el).toHaveClass('in');
    });

    it('从 show=true 切换到 show=false 时正确更新', () => {
      const { rerender } = render(
        <MaskReveal show={true}>content</MaskReveal>,
      );
      const el = screen.getByText('content');
      expect(el).toHaveClass('in');

      rerender(<MaskReveal show={false}>content</MaskReveal>);
      expect(el).not.toHaveClass('in');
    });
  });

  // ─── 2. CSS 类名 ──────────────────────────────────────

  describe('CSS 类名', () => {
    it('始终包含 mask-reveal 基础类', () => {
      render(<MaskReveal show={true}>text</MaskReveal>);
      expect(screen.getByText('text')).toHaveClass('mask-reveal');
    });

    it('show=false 时也包含 mask-reveal 基础类', () => {
      render(<MaskReveal show={false}>text</MaskReveal>);
      expect(screen.getByText('text')).toHaveClass('mask-reveal');
    });

    it('show=true 时添加 in 类', () => {
      render(<MaskReveal show={true}>text</MaskReveal>);
      expect(screen.getByText('text')).toHaveClass('in');
    });

    it('show=false 时不包含 in 类', () => {
      render(<MaskReveal show={false}>text</MaskReveal>);
      expect(screen.getByText('text')).not.toHaveClass('in');
    });

    it('传入 className 时正确附加', () => {
      render(
        <MaskReveal show={true} className="custom-class">
          text
        </MaskReveal>,
      );
      expect(screen.getByText('text')).toHaveClass('custom-class');
    });

    it('show=true + className 同时包含三个类', () => {
      render(
        <MaskReveal show={true} className="my-class">
          text
        </MaskReveal>,
      );
      const el = screen.getByText('text');
      expect(el).toHaveClass('mask-reveal');
      expect(el).toHaveClass('in');
      expect(el).toHaveClass('my-class');
    });

    it('show=false + className 包含 mask-reveal 和自定义类', () => {
      render(
        <MaskReveal show={false} className="extra">
          text
        </MaskReveal>,
      );
      const el = screen.getByText('text');
      expect(el).toHaveClass('mask-reveal');
      expect(el).toHaveClass('extra');
      expect(el).not.toHaveClass('in');
    });

    it('不传 className 时不出现多余空格', () => {
      render(<MaskReveal show={true}>text</MaskReveal>);
      const el = screen.getByText('text');
      const classes = el.className.split(' ').filter(Boolean);
      expect(classes).toEqual(['mask-reveal', 'in']);
    });

    it('show=false 不传 className 时仅有一个类', () => {
      render(<MaskReveal show={false}>text</MaskReveal>);
      const el = screen.getByText('text');
      expect(el.className).toBe('mask-reveal');
    });

    it('多个 className 用空格连接', () => {
      render(
        <MaskReveal show={true} className="a b c">
          text
        </MaskReveal>,
      );
      const el = screen.getByText('text');
      expect(el).toHaveClass('a');
      expect(el).toHaveClass('b');
      expect(el).toHaveClass('c');
    });
  });

  // ─── 3. 内联样式 ──────────────────────────────────────

  describe('内联样式', () => {
    it('始终设置 display: inline-block', () => {
      render(<MaskReveal show={true}>text</MaskReveal>);
      expect(screen.getByText('text')).toHaveStyle({
        display: 'inline-block',
      });
    });

    it('show=false 时也设置 display: inline-block', () => {
      render(<MaskReveal show={false}>text</MaskReveal>);
      expect(screen.getByText('text')).toHaveStyle({
        display: 'inline-block',
      });
    });

    it('show=true 时 transitionDelay 为 delay 毫秒', () => {
      render(
        <MaskReveal show={true} delay={300}>
          text
        </MaskReveal>,
      );
      expect(screen.getByText('text')).toHaveStyle({
        transitionDelay: '300ms',
      });
    });

    it('show=false 时 transitionDelay 始终为 0ms', () => {
      render(
        <MaskReveal show={false} delay={300}>
          text
        </MaskReveal>,
      );
      expect(screen.getByText('text')).toHaveStyle({
        transitionDelay: '0ms',
      });
    });

    it('delay=0 且 show=true 时 transitionDelay 为 0ms', () => {
      render(
        <MaskReveal show={true} delay={0}>
          text
        </MaskReveal>,
      );
      expect(screen.getByText('text')).toHaveStyle({
        transitionDelay: '0ms',
      });
    });

    it('默认 delay=0 时 show=true 的 transitionDelay 为 0ms', () => {
      render(<MaskReveal show={true}>text</MaskReveal>);
      expect(screen.getByText('text')).toHaveStyle({
        transitionDelay: '0ms',
      });
    });

    it('传入 duration 时设置 transitionDuration', () => {
      render(
        <MaskReveal show={true} duration={500}>
          text
        </MaskReveal>,
      );
      expect(screen.getByText('text')).toHaveStyle({
        transitionDuration: '500ms',
      });
    });

    it('不传 duration 时不设置 transitionDuration', () => {
      const { container } = render(<MaskReveal show={true}>text</MaskReveal>);
      const span = container.querySelector('span')!;
      expect(span.style.transitionDuration).toBe('');
    });

    it('duration=0 为 falsy 值，不设置 transitionDuration', () => {
      const { container } = render(
        <MaskReveal show={true} duration={0}>
          text
        </MaskReveal>,
      );
      expect(container.querySelector('span')!.style.transitionDuration).toBe(
        '',
      );
    });

    it('show=false 不影响 duration 设置', () => {
      render(
        <MaskReveal show={false} duration={400}>
          text
        </MaskReveal>,
      );
      expect(screen.getByText('text')).toHaveStyle({
        transitionDuration: '400ms',
      });
    });
  });

  // ─── 4. Children 渲染 ──────────────────────────────────

  describe('Children 渲染', () => {
    it('渲染文本 children', () => {
      render(<MaskReveal show={true}>Hello World</MaskReveal>);
      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    it('渲染 React 元素 children', () => {
      render(
        <MaskReveal show={true}>
          <strong>Bold</strong>
        </MaskReveal>,
      );
      expect(screen.getByText('Bold')).toBeInTheDocument();
      expect(screen.getByText('Bold').tagName).toBe('STRONG');
    });

    it('渲染嵌套元素 children', () => {
      render(
        <MaskReveal show={true}>
          <span>
            <em>Italic</em>
          </span>
        </MaskReveal>,
      );
      expect(screen.getByText('Italic')).toBeInTheDocument();
    });

    it('渲染数字 children', () => {
      render(<MaskReveal show={true}>{42}</MaskReveal>);
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('渲染空字符串 children', () => {
      const { container } = render(<MaskReveal show={true}>{''}</MaskReveal>);
      const span = container.querySelector('span');
      expect(span).toBeInTheDocument();
      expect(span?.textContent).toBe('');
    });

    it('渲染多个兄弟 children', () => {
      render(
        <MaskReveal show={true}>
          <span>A</span>
          <span>B</span>
          <span>C</span>
        </MaskReveal>,
      );
      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByText('B')).toBeInTheDocument();
      expect(screen.getByText('C')).toBeInTheDocument();
    });
  });

  // ─── 5. show 状态切换与样式联动 ──────────────────────

  describe('show 状态切换与样式联动', () => {
    it('切换 show 同时更新类名和 transitionDelay', () => {
      const { rerender } = render(
        <MaskReveal show={false} delay={200}>
          text
        </MaskReveal>,
      );
      const el = screen.getByText('text');
      expect(el).not.toHaveClass('in');
      expect(el).toHaveStyle({ transitionDelay: '0ms' });

      rerender(
        <MaskReveal show={true} delay={200}>
          text
        </MaskReveal>,
      );
      expect(el).toHaveClass('in');
      expect(el).toHaveStyle({ transitionDelay: '200ms' });
    });

    it('从 show=true 切换到 false 时 delay 被重置为 0ms', () => {
      const { rerender } = render(
        <MaskReveal show={true} delay={500}>
          text
        </MaskReveal>,
      );
      const el = screen.getByText('text');
      expect(el).toHaveStyle({ transitionDelay: '500ms' });

      rerender(
        <MaskReveal show={false} delay={500}>
          text
        </MaskReveal>,
      );
      expect(el).toHaveStyle({ transitionDelay: '0ms' });
    });

    it('同时切换 show 和 delay', () => {
      const { rerender } = render(
        <MaskReveal show={false} delay={100}>
          text
        </MaskReveal>,
      );

      rerender(
        <MaskReveal show={true} delay={300}>
          text
        </MaskReveal>,
      );
      const el = screen.getByText('text');
      expect(el).toHaveClass('in');
      expect(el).toHaveStyle({ transitionDelay: '300ms' });
    });

    it('切换 show 不影响 duration', () => {
      const { rerender } = render(
        <MaskReveal show={false} duration={600}>
          text
        </MaskReveal>,
      );
      const el = screen.getByText('text');
      expect(el).toHaveStyle({ transitionDuration: '600ms' });

      rerender(
        <MaskReveal show={true} duration={600}>
          text
        </MaskReveal>,
      );
      expect(el).toHaveStyle({ transitionDuration: '600ms' });
    });
  });

  // ─── 6. Props 默认值与边界 ──────────────────────────────

  describe('Props 默认值与边界', () => {
    it('不传 delay 时默认为 0', () => {
      render(<MaskReveal show={true}>text</MaskReveal>);
      expect(screen.getByText('text')).toHaveStyle({
        transitionDelay: '0ms',
      });
    });

    it('不传 duration 时不设置 transitionDuration', () => {
      const { container } = render(<MaskReveal show={true}>text</MaskReveal>);
      expect(container.querySelector('span')!.style.transitionDuration).toBe(
        '',
      );
    });

    it('不传 className 时类名仅 mask-reveal（+ in）', () => {
      render(<MaskReveal show={true}>text</MaskReveal>);
      const el = screen.getByText('text');
      const classes = el.className.split(' ').filter(Boolean);
      expect(classes).toEqual(['mask-reveal', 'in']);
    });

    it('delay 为负数时仍正常渲染', () => {
      render(
        <MaskReveal show={true} delay={-100}>
          text
        </MaskReveal>,
      );
      expect(screen.getByText('text')).toHaveStyle({
        transitionDelay: '-100ms',
      });
    });

    it('duration 为负数时仍正常渲染', () => {
      render(
        <MaskReveal show={true} duration={-200}>
          text
        </MaskReveal>,
      );
      expect(screen.getByText('text')).toHaveStyle({
        transitionDuration: '-200ms',
      });
    });

    it('大数值 delay 正常渲染', () => {
      render(
        <MaskReveal show={true} delay={99999}>
          text
        </MaskReveal>,
      );
      expect(screen.getByText('text')).toHaveStyle({
        transitionDelay: '99999ms',
      });
    });
  });

  // ─── 7. 快照测试 ──────────────────────────────────────

  describe('快照测试', () => {
    it('show=true 匹配快照', () => {
      const { asFragment } = render(<MaskReveal show={true}>text</MaskReveal>);
      expect(asFragment()).toMatchSnapshot();
    });

    it('show=false 匹配快照', () => {
      const { asFragment } = render(
        <MaskReveal show={false}>text</MaskReveal>,
      );
      expect(asFragment()).toMatchSnapshot();
    });

    it('完整 props 匹配快照', () => {
      const { asFragment } = render(
        <MaskReveal show={true} delay={200} duration={500} className="extra">
          content
        </MaskReveal>,
      );
      expect(asFragment()).toMatchSnapshot();
    });
  });

  // ─── 8. unmount 与 rerender 稳定性 ──────────────────

  describe('unmount 与 rerender 稳定性', () => {
    it('unmount 不抛出错误', () => {
      const { unmount } = render(<MaskReveal show={true}>text</MaskReveal>);
      expect(() => unmount()).not.toThrow();
    });

    it('show=false 时 unmount 不抛出错误', () => {
      const { unmount } = render(<MaskReveal show={false}>text</MaskReveal>);
      expect(() => unmount()).not.toThrow();
    });

    it('快速切换 show 20 次不抛出错误', () => {
      const { rerender } = render(<MaskReveal show={false}>text</MaskReveal>);
      for (let i = 0; i < 20; i++) {
        expect(() =>
          rerender(<MaskReveal show={i % 2 === 0}>text</MaskReveal>),
        ).not.toThrow();
      }
    });

    it('重复 rerender 同样的 props 不抛出错误', () => {
      const { rerender } = render(<MaskReveal show={true}>text</MaskReveal>);
      for (let i = 0; i < 10; i++) {
        expect(() =>
          rerender(<MaskReveal show={true}>text</MaskReveal>),
        ).not.toThrow();
      }
    });

    it('同时切换所有 props 不抛出错误', () => {
      const { rerender } = render(
        <MaskReveal show={false} delay={0} duration={100} className="a">
          text
        </MaskReveal>,
      );
      for (let i = 0; i < 10; i++) {
        expect(() =>
          rerender(
            <MaskReveal
              show={i % 2 === 0}
              delay={i * 100}
              duration={i * 200}
              className={`cls-${i}`}
            >
              text
            </MaskReveal>,
          ),
        ).not.toThrow();
      }
    });
  });
});
