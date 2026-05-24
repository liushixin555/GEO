/**
 * @jest-environment jsdom
 *
 * hook-chapter · chapter.tsx 测试用例
 * 覆盖所有 step 分支（0–5+）的渲染逻辑
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import HookChapter from '../../.agents/skills/web-video-presentation/references/EXAMPLES/hook-chapter/chapter';

// Mock MaskReveal — 简化为透传 children + 标记 data-testid
jest.mock(
  '../../.agents/skills/web-video-presentation/templates/src/components/MaskReveal',
  () => {
    const React = require('react');
    const MaskReveal = (props: any) =>
      React.createElement(
        'span',
        {
          'data-testid': 'mask-reveal',
          'data-show': String(props.show),
          'data-delay': String(props.delay ?? ''),
          'data-duration': String(props.duration ?? ''),
        },
        props.children,
      );
    MaskReveal.displayName = 'MaskReveal';
    return { MaskReveal };
  },
);

// Mock CSS module
jest.mock(
  '../../.agents/skills/web-video-presentation/references/EXAMPLES/hook-chapter/chapter.css',
  () => ({}),
);

// ──────────────────────────────────────────────────────────────
describe('HookChapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── step 0: 三张 ghost + kicker ─────────────────────────────
  describe('step=0 — 三张 ghost 卡片', () => {
    it('应渲染 kicker 引子区域', () => {
      render(<HookChapter step={0} />);
      expect(screen.getByText('这几天')).toBeInTheDocument();
    });

    it('应渲染 3 个 ghost 占位卡片', () => {
      const { container } = render(<HookChapter step={0} />);
      const ghosts = container.querySelectorAll('.hk-ghost');
      expect(ghosts).toHaveLength(3);
    });

    it('ghost 编号依次为 01、02、03', () => {
      render(<HookChapter step={0} />);
      expect(screen.getByText('01')).toBeInTheDocument();
      expect(screen.getByText('02')).toBeInTheDocument();
      expect(screen.getByText('03')).toBeInTheDocument();
    });

    it('每个 ghost 内含 image 标签', () => {
      render(<HookChapter step={0} />);
      const labels = screen.getAllByText('image');
      expect(labels).toHaveLength(3);
    });

    it('应包含 3 个 MaskReveal 组件', () => {
      render(<HookChapter step={0} />);
      const reveals = screen.getAllByTestId('mask-reveal');
      expect(reveals).toHaveLength(3);
    });

    it('MaskReveal 依次带 0/200/400ms 延迟', () => {
      render(<HookChapter step={0} />);
      const reveals = screen.getAllByTestId('mask-reveal');
      expect(reveals[0]).toHaveAttribute('data-delay', '0');
      expect(reveals[1]).toHaveAttribute('data-delay', '200');
      expect(reveals[2]).toHaveAttribute('data-delay', '400');
    });

    it('kicker 区域包含 accent 红条', () => {
      const { container } = render(<HookChapter step={0} />);
      expect(container.querySelector('.hk-kicker-line')).toBeTruthy();
    });
  });

  // ── step 1–3: 单图独占 ─────────────────────────────────────
  describe('step=1/2/3 — 单图独占', () => {
    const steps = [1, 2, 3] as const;
    const expectedLabels = ['01 / 03', '02 / 03', '03 / 03'];

    steps.forEach((step, idx) => {
      describe(`step=${step}`, () => {
        it(`应渲染图片（alt 包含反例 caption）`, () => {
          render(<HookChapter step={step} />);
          const img = screen.getByRole('img');
          expect(img).toBeTruthy();
          expect(img.getAttribute('alt')).toContain('反例');
        });

        it(`应显示编号标签 ${expectedLabels[idx]}`, () => {
          render(<HookChapter step={step} />);
          expect(screen.getByText(expectedLabels[idx])).toBeInTheDocument();
        });

        it('应显示 FAKE? 角章', () => {
          render(<HookChapter step={step} />);
          expect(screen.getByText('FAKE?')).toBeInTheDocument();
        });

        it('应包含 2 个 MaskReveal（图片 + 元信息）', () => {
          render(<HookChapter step={step} />);
          const reveals = screen.getAllByTestId('mask-reveal');
          expect(reveals).toHaveLength(2);
        });

        it('第二个 MaskReveal 延迟 400ms', () => {
          render(<HookChapter step={step} />);
          const reveals = screen.getAllByTestId('mask-reveal');
          expect(reveals[1]).toHaveAttribute('data-delay', '400');
        });

        it('外层应有 hk-solo-frame 容器', () => {
          const { container } = render(<HookChapter step={step} />);
          expect(container.querySelector('.hk-solo-frame')).toBeTruthy();
        });
      });
    });

    it('三个 step 的图片 src 各不相同', () => {
      const srcs = steps.map((step) => {
        const { unmount } = render(<HookChapter step={step} />);
        const src = screen.getByRole('img').getAttribute('src');
        unmount();
        return src;
      });
      expect(new Set(srcs).size).toBe(3);
    });
  });

  // ── step 4: takeover ────────────────────────────────────────
  describe('step=4 — takeover（三张缩入 + 巨字爆出）', () => {
    it('应渲染 3 张缩略图', () => {
      const { container } = render(<HookChapter step={4} />);
      const minis = container.querySelectorAll('.hk-mini');
      expect(minis).toHaveLength(3);
    });

    it('应包含 accent 红条', () => {
      const { container } = render(<HookChapter step={4} />);
      expect(container.querySelector('.hk-accent-bar')).toBeTruthy();
    });

    it('应包含 hero 大字区域', () => {
      const { container } = render(<HookChapter step={4} />);
      expect(container.querySelector('.hk-hero')).toBeTruthy();
    });

    it('应包含 MaskReveal 用于 hero 文字', () => {
      render(<HookChapter step={4} />);
      const reveals = screen.getAllByTestId('mask-reveal');
      expect(reveals.length).toBeGreaterThanOrEqual(1);
    });

    it('缩略图带动画延迟（animationDelay）', () => {
      const { container } = render(<HookChapter step={4} />);
      const minis = container.querySelectorAll('.hk-mini');
      expect(minis[0]).toHaveStyle({ animationDelay: '0ms' });
      expect(minis[1]).toHaveStyle({ animationDelay: '80ms' });
      expect(minis[2]).toHaveStyle({ animationDelay: '160ms' });
    });

    it('外层应有 hk-takeover 类名', () => {
      const { container } = render(<HookChapter step={4} />);
      expect(container.querySelector('.hk-takeover')).toBeTruthy();
    });
  });

  // ── step 5+: 收束（brush 划掉）───────────────────────────────
  describe('step>=5 — 钩子收束', () => {
    it('应渲染引用文字区域', () => {
      const { container } = render(<HookChapter step={5} />);
      expect(container.querySelector('.hk-quote')).toBeTruthy();
    });

    it('应包含 brush 划线元素', () => {
      const { container } = render(<HookChapter step={5} />);
      expect(container.querySelector('.hk-brush')).toBeTruthy();
    });

    it('brush 元素应有 aria-hidden 属性', () => {
      const { container } = render(<HookChapter step={5} />);
      const brush = container.querySelector('.hk-brush');
      expect(brush?.hasAttribute('aria-hidden')).toBe(true);
    });

    it('外层应有 hk-close 类名', () => {
      const { container } = render(<HookChapter step={5} />);
      expect(container.querySelector('.hk-close')).toBeTruthy();
    });

    it('step=6 同样渲染收束（兜底分支）', () => {
      const { container } = render(<HookChapter step={6} />);
      expect(container.querySelector('.hk-close')).toBeTruthy();
      expect(container.querySelector('.hk-quote')).toBeTruthy();
    });

    it('step=100 极端值仍走收束分支', () => {
      const { container } = render(<HookChapter step={100} />);
      expect(container.querySelector('.hk-brush')).toBeTruthy();
    });
  });

  // ── 负数 step 兜底 ─────────────────────────────────────────
  describe('step < 0 边界', () => {
    it('step=-1 不应匹配 step===0，应走收束分支', () => {
      const { container } = render(<HookChapter step={-1} />);
      expect(container.querySelector('.hk-close')).toBeTruthy();
    });
  });

  // ── key 属性验证（帮助 React 动画切换）──────────────────────
  describe('key 属性与场景切换', () => {
    it('step=0 外层不设 key（使用默认）', () => {
      const { container } = render(<HookChapter step={0} />);
      expect(container.querySelector('.hk-grid')).toBeTruthy();
    });

    it('step=1–3 外层设 key={step}（强制 remount）', () => {
      const { container, rerender } = render(<HookChapter step={1} />);
      expect(container.querySelector('.hk-solo-frame')).toBeTruthy();

      rerender(<HookChapter step={2} />);
      expect(screen.getByText('02 / 03')).toBeInTheDocument();
    });

    it('从 step=4 切到 step=5 应从 takeover 变为 close', () => {
      const { container, rerender } = render(<HookChapter step={4} />);
      expect(container.querySelector('.hk-takeover')).toBeTruthy();

      rerender(<HookChapter step={5} />);
      expect(container.querySelector('.hk-close')).toBeTruthy();
      expect(container.querySelector('.hk-takeover')).toBeFalsy();
    });
  });
});
