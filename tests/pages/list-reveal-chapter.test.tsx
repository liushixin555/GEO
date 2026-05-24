/**
 * @jest-environment jsdom
 *
 * list-reveal · chapter.tsx 测试用例
 * 覆盖所有 step 分支（0–4+）、Slot 三种状态（ghost/active/past）、
 * MaskReveal 调用参数、场景切换
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import ListRevealChapter from '../../.agents/skills/web-video-presentation/references/EXAMPLES/list-reveal/chapter';

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
  '../../.agents/skills/web-video-presentation/references/EXAMPLES/list-reveal/chapter.css',
  () => ({}),
);

// ──────────────────────────────────────────────────────────────
describe('ListRevealChapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── step 0: 引子（intro）────────────────────────────────────
  describe('step=0 — 引子', () => {
    it('应渲染 lr-intro 场景容器', () => {
      const { container } = render(<ListRevealChapter step={0} />);
      expect(container.querySelector('.lr-intro')).toBeTruthy();
    });

    it('应渲染 lr-scene 基础类名', () => {
      const { container } = render(<ListRevealChapter step={0} />);
      expect(container.querySelector('.lr-scene')).toBeTruthy();
    });

    it('应渲染 masthead 区域', () => {
      const { container } = render(<ListRevealChapter step={0} />);
      expect(container.querySelector('.lr-masthead')).toBeTruthy();
    });

    it('masthead 包含 kicker "第一部分"', () => {
      render(<ListRevealChapter step={0} />);
      expect(screen.getByText('第一部分')).toBeInTheDocument();
    });

    it('masthead 包含 2 条 rule 分割线', () => {
      const { container } = render(<ListRevealChapter step={0} />);
      const rules = container.querySelectorAll('.lr-rule');
      expect(rules).toHaveLength(2);
    });

    it('应渲染 h1 标题 "强在哪"', () => {
      const { container } = render(<ListRevealChapter step={0} />);
      const h1 = container.querySelector('.lr-intro-h');
      expect(h1).toBeTruthy();
      expect(h1?.textContent).toBe('强在哪');
    });

    it('"哪" 字应带 accent 强调类名', () => {
      const { container } = render(<ListRevealChapter step={0} />);
      expect(container.querySelector('.lr-em')?.textContent).toBe('哪');
    });

    it('应渲染副标题 "三件事 —— 一个个看"', () => {
      render(<ListRevealChapter step={0} />);
      expect(screen.getByText('三件事 —— 一个个看')).toBeInTheDocument();
    });

    it('h1 标题被 MaskReveal 包裹（duration=1100）', () => {
      const { container } = render(<ListRevealChapter step={0} />);
      const h1Reveal = container.querySelector('.lr-intro-h')?.closest('[data-testid="mask-reveal"]');
      expect(h1Reveal).toBeTruthy();
      expect(h1Reveal).toHaveAttribute('data-duration', '1100');
      expect(h1Reveal).toHaveAttribute('data-show', 'true');
    });

    it('副标题被 MaskReveal 包裹（delay=400, duration=900）', () => {
      const { container } = render(<ListRevealChapter step={0} />);
      const subReveal = screen.getByText('三件事 —— 一个个看').closest('[data-testid="mask-reveal"]');
      expect(subReveal).toBeTruthy();
      expect(subReveal).toHaveAttribute('data-delay', '400');
      expect(subReveal).toHaveAttribute('data-duration', '900');
    });

    it('应渲染 3 个 ghost 槽位', () => {
      const { container } = render(<ListRevealChapter step={0} />);
      const ghosts = container.querySelectorAll('.lr-slot-ghost');
      expect(ghosts).toHaveLength(3);
    });

    it('ghost 槽位编号依次为 01、02、03', () => {
      render(<ListRevealChapter step={0} />);
      expect(screen.getByText('01')).toBeInTheDocument();
      expect(screen.getByText('02')).toBeInTheDocument();
      expect(screen.getByText('03')).toBeInTheDocument();
    });

    it('ghost 槽位不显示标题和正文', () => {
      const { container } = render(<ListRevealChapter step={0} />);
      expect(container.querySelector('.lr-slot-title')).toBeFalsy();
      expect(container.querySelector('.lr-slot-body')).toBeFalsy();
    });

    it('应包含 2 个 MaskReveal（标题 + 副标题）', () => {
      render(<ListRevealChapter step={0} />);
      const reveals = screen.getAllByTestId('mask-reveal');
      expect(reveals).toHaveLength(2);
    });
  });

  // ── step 1: 第一项 active ──────────────────────────────────
  describe('step=1 — 第一项 active', () => {
    it('slot 0 应为 active 状态', () => {
      const { container } = render(<ListRevealChapter step={1} />);
      const slots = container.querySelectorAll('.lr-slot');
      expect(slots[0].classList.contains('lr-slot-active')).toBe(true);
    });

    it('slot 1、2 应为 ghost 状态', () => {
      const { container } = render(<ListRevealChapter step={1} />);
      const slots = container.querySelectorAll('.lr-slot');
      expect(slots[1].classList.contains('lr-slot-ghost')).toBe(true);
      expect(slots[2].classList.contains('lr-slot-ghost')).toBe(true);
    });

    it('active 槽位应显示标题 "文字渲染"', () => {
      render(<ListRevealChapter step={1} />);
      expect(screen.getByText('文字渲染')).toBeInTheDocument();
    });

    it('active 槽位应显示正文 "图里的文字也能正确写出来"', () => {
      render(<ListRevealChapter step={1} />);
      expect(screen.getByText('图里的文字也能正确写出来')).toBeInTheDocument();
    });

    it('ghost 槽位不应显示标题', () => {
      const { container } = render(<ListRevealChapter step={1} />);
      const ghosts = container.querySelectorAll('.lr-slot-ghost');
      ghosts.forEach((g) => {
        expect(g.querySelector('.lr-slot-title')).toBeFalsy();
      });
    });

    it('kicker 应显示 "第一部分 · 强在哪"', () => {
      render(<ListRevealChapter step={1} />);
      expect(screen.getByText('第一部分 · 强在哪')).toBeInTheDocument();
    });

    it('不应渲染 lr-intro 类名', () => {
      const { container } = render(<ListRevealChapter step={1} />);
      expect(container.querySelector('.lr-intro')).toBeFalsy();
    });
  });

  // ── step 2: 第二项 active ──────────────────────────────────
  describe('step=2 — 第二项 active', () => {
    it('slot 0 应为 past 状态', () => {
      const { container } = render(<ListRevealChapter step={2} />);
      const slots = container.querySelectorAll('.lr-slot');
      expect(slots[0].classList.contains('lr-slot-past')).toBe(true);
    });

    it('slot 1 应为 active 状态', () => {
      const { container } = render(<ListRevealChapter step={2} />);
      const slots = container.querySelectorAll('.lr-slot');
      expect(slots[1].classList.contains('lr-slot-active')).toBe(true);
    });

    it('slot 2 应为 ghost 状态', () => {
      const { container } = render(<ListRevealChapter step={2} />);
      const slots = container.querySelectorAll('.lr-slot');
      expect(slots[2].classList.contains('lr-slot-ghost')).toBe(true);
    });

    it('active 槽位标题 "指令遵循"', () => {
      render(<ListRevealChapter step={2} />);
      expect(screen.getByText('指令遵循')).toBeInTheDocument();
    });

    it('active 槽位正文 "可以给到非常具体的要求"', () => {
      render(<ListRevealChapter step={2} />);
      expect(screen.getByText('可以给到非常具体的要求')).toBeInTheDocument();
    });

    it('past 槽位显示标题但不显示正文', () => {
      const { container } = render(<ListRevealChapter step={2} />);
      const pastSlot = container.querySelector('.lr-slot-past');
      expect(pastSlot?.querySelector('.lr-slot-title')).toBeTruthy();
      expect(pastSlot?.querySelector('.lr-slot-body')).toBeFalsy();
    });
  });

  // ── step 3: 第三项 active ──────────────────────────────────
  describe('step=3 — 第三项 active', () => {
    it('slot 0、1 应为 past 状态', () => {
      const { container } = render(<ListRevealChapter step={3} />);
      const slots = container.querySelectorAll('.lr-slot');
      expect(slots[0].classList.contains('lr-slot-past')).toBe(true);
      expect(slots[1].classList.contains('lr-slot-past')).toBe(true);
    });

    it('slot 2 应为 active 状态', () => {
      const { container } = render(<ListRevealChapter step={3} />);
      const slots = container.querySelectorAll('.lr-slot');
      expect(slots[2].classList.contains('lr-slot-active')).toBe(true);
    });

    it('active 槽位标题 "照片真实感"', () => {
      render(<ListRevealChapter step={3} />);
      expect(screen.getByText('照片真实感')).toBeInTheDocument();
    });

    it('active 槽位正文 "光影 / 材质 / 人物接近真实"', () => {
      render(<ListRevealChapter step={3} />);
      expect(screen.getByText('光影 / 材质 / 人物接近真实')).toBeInTheDocument();
    });

    it('所有 past 槽位只显示标题不显示正文', () => {
      const { container } = render(<ListRevealChapter step={3} />);
      const pastSlots = container.querySelectorAll('.lr-slot-past');
      expect(pastSlots).toHaveLength(2);
      pastSlots.forEach((s) => {
        expect(s.querySelector('.lr-slot-title')).toBeTruthy();
        expect(s.querySelector('.lr-slot-body')).toBeFalsy();
      });
    });
  });

  // ── step 4+: 全部 past ─────────────────────────────────────
  describe('step>=4 — 全部 past', () => {
    it('step=4 时所有 3 个槽位为 past', () => {
      const { container } = render(<ListRevealChapter step={4} />);
      const pastSlots = container.querySelectorAll('.lr-slot-past');
      expect(pastSlots).toHaveLength(3);
    });

    it('step=4 所有 past 槽位显示标题但不显示正文', () => {
      const { container } = render(<ListRevealChapter step={4} />);
      const pastSlots = container.querySelectorAll('.lr-slot-past');
      pastSlots.forEach((s) => {
        expect(s.querySelector('.lr-slot-title')).toBeTruthy();
        expect(s.querySelector('.lr-slot-body')).toBeFalsy();
      });
    });

    it('step=5 极端值仍全部 past', () => {
      const { container } = render(<ListRevealChapter step={5} />);
      const pastSlots = container.querySelectorAll('.lr-slot-past');
      expect(pastSlots).toHaveLength(3);
    });

    it('step=100 极端值仍全部 past', () => {
      const { container } = render(<ListRevealChapter step={100} />);
      const pastSlots = container.querySelectorAll('.lr-slot-past');
      expect(pastSlots).toHaveLength(3);
    });
  });

  // ── 负数 step ──────────────────────────────────────────────
  describe('step < 0 边界', () => {
    it('step=-1 时所有槽位为 ghost（activeIdx=-2）', () => {
      const { container } = render(<ListRevealChapter step={-1} />);
      const ghosts = container.querySelectorAll('.lr-slot-ghost');
      expect(ghosts).toHaveLength(3);
    });

    it('step=-1 不渲染 lr-intro（不等于 step===0）', () => {
      const { container } = render(<ListRevealChapter step={-1} />);
      expect(container.querySelector('.lr-intro')).toBeFalsy();
    });
  });

  // ── Slot 组件细节 ──────────────────────────────────────────
  describe('Slot 组件内部结构', () => {
    it('每个槽位包含 lr-slot-num 编号区', () => {
      const { container } = render(<ListRevealChapter step={1} />);
      const nums = container.querySelectorAll('.lr-slot-num');
      expect(nums).toHaveLength(3);
    });

    it('每个槽位包含 lr-slot-content 内容区', () => {
      const { container } = render(<ListRevealChapter step={1} />);
      const contents = container.querySelectorAll('.lr-slot-content');
      expect(contents).toHaveLength(3);
    });

    it('active 槽位的 title 被 MaskReveal 包裹（duration=900）', () => {
      const { container } = render(<ListRevealChapter step={1} />);
      const titleEl = screen.getByText('文字渲染');
      const reveal = titleEl.closest('[data-testid="mask-reveal"]');
      expect(reveal).toBeTruthy();
      expect(reveal).toHaveAttribute('data-duration', '900');
      expect(reveal).toHaveAttribute('data-show', 'true');
    });

    it('active 槽位的 body 被 MaskReveal 包裹（delay=350, duration=900）', () => {
      const { container } = render(<ListRevealChapter step={1} />);
      const bodyEl = screen.getByText('图里的文字也能正确写出来');
      const reveal = bodyEl.closest('[data-testid="mask-reveal"]');
      expect(reveal).toBeTruthy();
      expect(reveal).toHaveAttribute('data-delay', '350');
      expect(reveal).toHaveAttribute('data-duration', '900');
    });

    it('past 槽位的 title 被 MaskReveal 包裹', () => {
      const { container } = render(<ListRevealChapter step={2} />);
      const pastSlot = container.querySelector('.lr-slot-past');
      const titleEl = pastSlot?.querySelector('.lr-slot-title');
      expect(titleEl).toBeTruthy();
      const reveal = titleEl?.closest('[data-testid="mask-reveal"]');
      expect(reveal).toBeTruthy();
    });
  });

  // ── MaskReveal 调用次数 ─────────────────────────────────────
  describe('MaskReveal 调用统计', () => {
    it('step=0: 2 个 MaskReveal（h1 + 副标题）', () => {
      render(<ListRevealChapter step={0} />);
      const reveals = screen.getAllByTestId('mask-reveal');
      expect(reveals).toHaveLength(2);
    });

    it('step=1: 1 个 active(title+body=2) + 0 past = 2 个 MaskReveal', () => {
      render(<ListRevealChapter step={1} />);
      const reveals = screen.getAllByTestId('mask-reveal');
      expect(reveals).toHaveLength(2);
    });

    it('step=2: 1 past(title=1) + 1 active(title+body=2) = 3 个 MaskReveal', () => {
      render(<ListRevealChapter step={2} />);
      const reveals = screen.getAllByTestId('mask-reveal');
      expect(reveals).toHaveLength(3);
    });

    it('step=3: 2 past(title×2) + 1 active(title+body) = 4 个 MaskReveal', () => {
      render(<ListRevealChapter step={3} />);
      const reveals = screen.getAllByTestId('mask-reveal');
      expect(reveals).toHaveLength(4);
    });

    it('step=4: 3 past(title×3) = 3 个 MaskReveal', () => {
      render(<ListRevealChapter step={4} />);
      const reveals = screen.getAllByTestId('mask-reveal');
      expect(reveals).toHaveLength(3);
    });
  });

  // ── 场景切换（rerender）─────────────────────────────────────
  describe('场景切换', () => {
    it('从 step=0 切到 step=1: intro 消失，slot 状态变化', () => {
      const { container, rerender } = render(<ListRevealChapter step={0} />);
      expect(container.querySelector('.lr-intro')).toBeTruthy();

      rerender(<ListRevealChapter step={1} />);
      expect(container.querySelector('.lr-intro')).toBeFalsy();
      expect(container.querySelector('.lr-slot-active')).toBeTruthy();
    });

    it('从 step=1 切到 step=2: active 槽位变化', () => {
      const { container, rerender } = render(<ListRevealChapter step={1} />);
      const slots = container.querySelectorAll('.lr-slot');
      expect(slots[0].classList.contains('lr-slot-active')).toBe(true);

      rerender(<ListRevealChapter step={2} />);
      const updatedSlots = container.querySelectorAll('.lr-slot');
      expect(updatedSlots[0].classList.contains('lr-slot-past')).toBe(true);
      expect(updatedSlots[1].classList.contains('lr-slot-active')).toBe(true);
    });

    it('从 step=3 切到 step=4: 最后一个 slot 变 past', () => {
      const { container, rerender } = render(<ListRevealChapter step={3} />);
      const slots = container.querySelectorAll('.lr-slot');
      expect(slots[2].classList.contains('lr-slot-active')).toBe(true);

      rerender(<ListRevealChapter step={4} />);
      const updatedSlots = container.querySelectorAll('.lr-slot');
      expect(updatedSlots[2].classList.contains('lr-slot-past')).toBe(true);
    });

    it('kicker 文字随 step 变化', () => {
      const { rerender } = render(<ListRevealChapter step={0} />);
      expect(screen.getByText('第一部分')).toBeInTheDocument();

      rerender(<ListRevealChapter step={1} />);
      expect(screen.getByText('第一部分 · 强在哪')).toBeInTheDocument();

      rerender(<ListRevealChapter step={0} />);
      expect(screen.getByText('第一部分')).toBeInTheDocument();
    });
  });

  // ── 槽位编号保持不变 ────────────────────────────────────────
  describe('槽位编号', () => {
    [0, 1, 2, 3, 4].forEach((step) => {
      it(`step=${step} 时 3 个编号 01/02/03 始终存在`, () => {
        render(<ListRevealChapter step={step} />);
        expect(screen.getByText('01')).toBeInTheDocument();
        expect(screen.getByText('02')).toBeInTheDocument();
        expect(screen.getByText('03')).toBeInTheDocument();
      });
    });
  });

  // ── grid 布局验证 ───────────────────────────────────────────
  describe('grid 布局', () => {
    it('step=0 存在 lr-grid', () => {
      const { container } = render(<ListRevealChapter step={0} />);
      expect(container.querySelector('.lr-grid')).toBeTruthy();
    });

    it('step>=1 也存在 lr-grid', () => {
      const { container } = render(<ListRevealChapter step={2} />);
      expect(container.querySelector('.lr-grid')).toBeTruthy();
    });

    it('grid 内始终有 3 个 lr-slot', () => {
      const { container } = render(<ListRevealChapter step={2} />);
      const grid = container.querySelector('.lr-grid');
      const slots = grid?.querySelectorAll('.lr-slot');
      expect(slots).toHaveLength(3);
    });
  });
});
