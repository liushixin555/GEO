/**
 * @jest-environment jsdom
 *
 * Example.tsx TDD 测试用例
 * 覆盖三个 step 的渲染、MaskReveal prop 传递、CSS 类名、
 * DOM 结构完整性、边界 step 值、快照稳定性等
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import ExampleChapter from "../../../.agents/skills/web-video-presentation/templates/src/chapters/01-example/Example";

// ── CSS mock（identity-obj-proxy 代理类名，但显式 mock 更稳定）──
jest.mock(
  "../../../.agents/skills/web-video-presentation/templates/src/chapters/01-example/Example.css",
  () => ({}),
);

// ── MaskReveal mock — 通过 data 属性透传 prop 以便断言 ──────────
jest.mock(
  "../../../.agents/skills/web-video-presentation/templates/src/components/MaskReveal",
  () => {
    const React = require("react");
    const MaskReveal = (props: any) =>
      React.createElement(
        "span",
        {
          "data-testid": "mask-reveal",
          "data-show": String(props.show),
          "data-delay": String(props.delay ?? ""),
          "data-duration": String(props.duration ?? ""),
          "data-class": props.className ?? "",
        },
        props.children,
      );
    MaskReveal.displayName = "MaskReveal";
    return { MaskReveal };
  },
);

// ── 辅助函数 ──────────────────────────────────────────────────────
/** 渲染 ExampleChapter 并返回 container */
function renderStep(step: number) {
  return render(<ExampleChapter step={step} />);
}

/** 获取所有 MaskReveal mock 元素 */
function getMaskReveals(container: HTMLElement) {
  return container.querySelectorAll('[data-testid="mask-reveal"]');
}

// ══════════════════════════════════════════════════════════════════
// 测试
// ══════════════════════════════════════════════════════════════════
describe("ExampleChapter", () => {
  // ────────────────────────────────────────────────────────────────
  // 1. Step 0 — Magazine Cover
  // ────────────────────────────────────────────────────────────────
  describe("Step 0 — Magazine Cover", () => {
    let container: HTMLElement;

    beforeEach(() => {
      ({ container } = renderStep(0));
    });

    // DOM 结构
    it("应渲染 ex-scene 场景容器", () => {
      expect(container.querySelector(".ex-scene")).toBeTruthy();
    });

    it("应渲染 scene-pad 类", () => {
      expect(container.querySelector(".scene-pad")).toBeTruthy();
    });

    it("应渲染 masthead 头部", () => {
      expect(container.querySelector(".masthead")).toBeTruthy();
    });

    it("应显示品牌名 'Your Presentation'", () => {
      expect(screen.getByText("Your Presentation")).toBeInTheDocument();
    });

    it("应显示期号 'Issue · 01 — Replace this'", () => {
      expect(screen.getByText("Issue · 01 — Replace this")).toBeInTheDocument();
    });

    it("应渲染分隔线 hr", () => {
      expect(container.querySelector("hr.rule")).toBeTruthy();
    });

    it("hr 应存在并带有 rule 类（inline style 含 CSS 变量，jsdom 不解析）", () => {
      const hr = container.querySelector("hr.rule") as HTMLElement;
      expect(hr).toBeTruthy();
      // jsdom 无法解析 CSS 变量的 inline style，仅验证 DOM 节点存在
    });

    it("应渲染 ex-cover-body 容器", () => {
      expect(container.querySelector(".ex-cover-body")).toBeTruthy();
    });

    it("应显示 kicker 'Chapter 01 — Example'", () => {
      expect(screen.getByText("Chapter 01 — Example")).toBeInTheDocument();
    });

    it("应渲染 ex-cover-h 标题", () => {
      expect(container.querySelector(".ex-cover-h")).toBeTruthy();
    });

    it("标题内应包含中文文本 '这是'", () => {
      expect(screen.getByText(/这是/)).toBeInTheDocument();
    });

    it("标题内应包含强调文本 first step（含 nbsp）", () => {
      const emSpan = container.querySelector(".serif-it.ex-em");
      expect(emSpan?.textContent).toContain("first");
      expect(emSpan?.textContent).toContain("step");
    });

    it("强调文本应有 serif-it 和 ex-em 类", () => {
      const emSpan = container.querySelector(".serif-it.ex-em");
      expect(emSpan).toBeTruthy();
    });

    it("标题内有 serif-cn 类的 span", () => {
      const serifCn = container.querySelectorAll(".ex-cover-h .serif-cn");
      expect(serifCn.length).toBeGreaterThanOrEqual(2);
    });

    it("应渲染 ex-cover-foot 底部", () => {
      expect(container.querySelector(".ex-cover-foot")).toBeTruthy();
    });

    it("底部应显示 'Tap anywhere to advance'", () => {
      expect(screen.getByText(/Tap anywhere to advance/)).toBeInTheDocument();
    });

    it("应渲染 dot-accent 装饰点", () => {
      expect(container.querySelector(".dot-accent")).toBeTruthy();
    });

    it("底部应有 label-mono 类", () => {
      expect(container.querySelector(".ex-cover-foot.label-mono")).toBeTruthy();
    });

    it("kicker 应有 .kicker 类", () => {
      const kicker = screen.getByText("Chapter 01 — Example");
      expect(kicker.closest(".kicker")).toBeTruthy();
    });

    // MaskReveal prop 验证
    it("应渲染 3 个 MaskReveal 组件", () => {
      const reveals = getMaskReveals(container);
      expect(reveals).toHaveLength(3);
    });

    it("第 1 个 MaskReveal: show=true, duration=900, 无 delay", () => {
      const reveals = getMaskReveals(container);
      const first = reveals[0];
      expect(first.getAttribute("data-show")).toBe("true");
      expect(first.getAttribute("data-duration")).toBe("900");
      expect(first.getAttribute("data-delay")).toBe("");
    });

    it("第 2 个 MaskReveal: show=true, delay=300, duration=900", () => {
      const reveals = getMaskReveals(container);
      const second = reveals[1];
      expect(second.getAttribute("data-show")).toBe("true");
      expect(second.getAttribute("data-delay")).toBe("300");
      expect(second.getAttribute("data-duration")).toBe("900");
    });

    it("第 3 个 MaskReveal: show=true, delay=650, duration=900", () => {
      const reveals = getMaskReveals(container);
      const third = reveals[2];
      expect(third.getAttribute("data-show")).toBe("true");
      expect(third.getAttribute("data-delay")).toBe("650");
      expect(third.getAttribute("data-duration")).toBe("900");
    });
  });

  // ────────────────────────────────────────────────────────────────
  // 2. Step 1 — Split Layout
  // ────────────────────────────────────────────────────────────────
  describe("Step 1 — Split Layout", () => {
    let container: HTMLElement;

    beforeEach(() => {
      ({ container } = renderStep(1));
    });

    // DOM 结构
    it("应渲染 ex-scene 场景容器", () => {
      expect(container.querySelector(".ex-scene")).toBeTruthy();
    });

    it("应渲染 masthead 头部", () => {
      expect(container.querySelector(".masthead")).toBeTruthy();
    });

    it("应显示品牌名 'Your Presentation'", () => {
      expect(screen.getByText("Your Presentation")).toBeInTheDocument();
    });

    it("应显示期号 'Issue · 01'（无 'Replace this'）", () => {
      expect(screen.getByText("Issue · 01")).toBeInTheDocument();
    });

    it("应渲染分隔线 hr", () => {
      expect(container.querySelector("hr.rule")).toBeTruthy();
    });

    it("应渲染 ex-split 布局容器", () => {
      expect(container.querySelector(".ex-split")).toBeTruthy();
    });

    it("应显示英雄数字 '02'", () => {
      expect(screen.getByText("02")).toBeInTheDocument();
    });

    it("英雄数字应有 ex-split-num 和 hero-num 类", () => {
      const num = container.querySelector(".ex-split-num.hero-num");
      expect(num).toBeTruthy();
      expect(num?.textContent).toBe("02");
    });

    it("应显示 kicker '每一步'", () => {
      expect(screen.getByText("每一步")).toBeInTheDocument();
    });

    it("应渲染 ex-split-body 内容区", () => {
      expect(container.querySelector(".ex-split-body")).toBeTruthy();
    });

    it("应渲染 ex-split-h 标题", () => {
      expect(container.querySelector(".ex-split-h")).toBeTruthy();
    });

    it("标题应包含 '独占' 文本", () => {
      expect(screen.getByText(/独占/)).toBeInTheDocument();
    });

    it("标题应包含 '整个屏幕' 文本", () => {
      expect(screen.getByText(/整个屏幕/)).toBeInTheDocument();
    });

    it("应渲染段落文本包含 'theme' 关键词", () => {
      expect(screen.getByText(/theme controls every visual detail/)).toBeInTheDocument();
    });

    it("段落应有 ex-split-p 类", () => {
      expect(container.querySelector(".ex-split-p")).toBeTruthy();
    });

    it("标题内应有 serif-it 和 ex-em 类的强调文本", () => {
      expect(container.querySelector(".serif-it.ex-em")).toBeTruthy();
    });

    // MaskReveal prop 验证
    it("应渲染 3 个 MaskReveal 组件", () => {
      const reveals = getMaskReveals(container);
      expect(reveals).toHaveLength(3);
    });

    it("第 1 个 MaskReveal: show=true, duration=900, 无 delay", () => {
      const reveals = getMaskReveals(container);
      expect(reveals[0].getAttribute("data-show")).toBe("true");
      expect(reveals[0].getAttribute("data-duration")).toBe("900");
      expect(reveals[0].getAttribute("data-delay")).toBe("");
    });

    it("第 2 个 MaskReveal: show=true, delay=300, duration=900", () => {
      const reveals = getMaskReveals(container);
      expect(reveals[1].getAttribute("data-show")).toBe("true");
      expect(reveals[1].getAttribute("data-delay")).toBe("300");
      expect(reveals[1].getAttribute("data-duration")).toBe("900");
    });

    it("第 3 个 MaskReveal: show=true, delay=650, duration=900", () => {
      const reveals = getMaskReveals(container);
      expect(reveals[2].getAttribute("data-show")).toBe("true");
      expect(reveals[2].getAttribute("data-delay")).toBe("650");
      expect(reveals[2].getAttribute("data-duration")).toBe("900");
    });
  });

  // ────────────────────────────────────────────────────────────────
  // 3. Step 2 (default) — Pull-Quote Close
  // ────────────────────────────────────────────────────────────────
  describe("Step 2 — Pull-Quote Close", () => {
    let container: HTMLElement;

    beforeEach(() => {
      ({ container } = renderStep(2));
    });

    it("应渲染 ex-scene 场景容器", () => {
      expect(container.querySelector(".ex-scene")).toBeTruthy();
    });

    it("应有 ex-close 类", () => {
      expect(container.querySelector(".ex-close")).toBeTruthy();
    });

    it("不应渲染 masthead（close step 无 masthead）", () => {
      expect(container.querySelector(".masthead")).toBeNull();
    });

    it("应渲染 ex-close-inner 容器", () => {
      expect(container.querySelector(".ex-close-inner")).toBeTruthy();
    });

    it("应显示 kicker 'Now'", () => {
      expect(screen.getByText("Now")).toBeInTheDocument();
    });

    it("应渲染 pull-quote 容器", () => {
      expect(container.querySelector(".pull-quote")).toBeTruthy();
    });

    it("pull-quote 应有 ex-quote 类", () => {
      expect(container.querySelector(".pull-quote.ex-quote")).toBeTruthy();
    });

    it("引文应包含 'Replace this with' 文本", () => {
      expect(screen.getByText(/Replace this with/)).toBeInTheDocument();
    });

    it("引文应包含 'your own' 文本", () => {
      expect(screen.getByText(/your own/)).toBeInTheDocument();
    });

    it("引文应包含 'chapters.' 文本", () => {
      expect(screen.getByText(/chapters\./)).toBeInTheDocument();
    });

    it("应渲染 ex-close-foot 底部", () => {
      expect(container.querySelector(".ex-close-foot")).toBeTruthy();
    });

    it("底部应显示 SKILL.md 引用文本", () => {
      expect(screen.getByText(/SKILL\.md/)).toBeInTheDocument();
    });

    it("底部应有 label-mono 类", () => {
      expect(container.querySelector(".ex-close-foot.label-mono")).toBeTruthy();
    });

    // MaskReveal prop 验证
    it("应渲染 3 个 MaskReveal 组件", () => {
      const reveals = getMaskReveals(container);
      expect(reveals).toHaveLength(3);
    });

    it("第 1 个 MaskReveal: show=true, duration=1100, 无 delay", () => {
      const reveals = getMaskReveals(container);
      expect(reveals[0].getAttribute("data-show")).toBe("true");
      expect(reveals[0].getAttribute("data-duration")).toBe("1100");
      expect(reveals[0].getAttribute("data-delay")).toBe("");
    });

    it("第 2 个 MaskReveal: show=true, delay=400, duration=1100", () => {
      const reveals = getMaskReveals(container);
      expect(reveals[1].getAttribute("data-show")).toBe("true");
      expect(reveals[1].getAttribute("data-delay")).toBe("400");
      expect(reveals[1].getAttribute("data-duration")).toBe("1100");
    });

    it("第 3 个 MaskReveal: show=true, delay=760, duration=1100", () => {
      const reveals = getMaskReveals(container);
      expect(reveals[2].getAttribute("data-show")).toBe("true");
      expect(reveals[2].getAttribute("data-delay")).toBe("760");
      expect(reveals[2].getAttribute("data-duration")).toBe("1100");
    });
  });

  // ────────────────────────────────────────────────────────────────
  // 4. 边界 step 值 — 回退到 default 分支
  // ────────────────────────────────────────────────────────────────
  describe("边界 step 值", () => {
    it("step=3 应回退到 default（close 布局）", () => {
      const { container } = renderStep(3);
      expect(container.querySelector(".ex-close")).toBeTruthy();
      expect(screen.getByText("Now")).toBeInTheDocument();
    });

    it("step=100 应回退到 default", () => {
      const { container } = renderStep(100);
      expect(container.querySelector(".ex-close")).toBeTruthy();
    });

    it("step=-1 应回退到 default", () => {
      const { container } = renderStep(-1);
      expect(container.querySelector(".ex-close")).toBeTruthy();
    });

    it("step=999 应回退到 default", () => {
      const { container } = renderStep(999);
      expect(container.querySelector(".ex-close")).toBeTruthy();
      expect(screen.getByText(/Replace this with/)).toBeInTheDocument();
    });
  });

  // ────────────────────────────────────────────────────────────────
  // 5. 快照测试 — 确保结构有意变更时能被捕获
  // ────────────────────────────────────────────────────────────────
  describe("快照测试", () => {
    it("Step 0 快照应匹配", () => {
      const { container } = renderStep(0);
      expect(container).toMatchSnapshot();
    });

    it("Step 1 快照应匹配", () => {
      const { container } = renderStep(1);
      expect(container).toMatchSnapshot();
    });

    it("Step 2 快照应匹配", () => {
      const { container } = renderStep(2);
      expect(container).toMatchSnapshot();
    });
  });

  // ────────────────────────────────────────────────────────────────
  // 6. 交叉验证 — 确保 step 切换时内容不残留
  // ────────────────────────────────────────────────────────────────
  describe("Step 切换隔离", () => {
    it("从 step 0 切换到 step 1 后封面内容消失", () => {
      const { rerender } = renderStep(0);
      expect(screen.getByText("Chapter 01 — Example")).toBeInTheDocument();

      rerender(<ExampleChapter step={1} />);
      expect(screen.queryByText("Chapter 01 — Example")).not.toBeInTheDocument();
      expect(screen.getByText("02")).toBeInTheDocument();
    });

    it("从 step 1 切换到 step 2 后分割布局消失", () => {
      const { rerender } = renderStep(1);
      expect(screen.getByText("02")).toBeInTheDocument();

      rerender(<ExampleChapter step={2} />);
      expect(screen.queryByText("02")).not.toBeInTheDocument();
      expect(screen.getByText("Now")).toBeInTheDocument();
    });

    it("从 step 2 切换回 step 0 后 close 内容消失", () => {
      const { rerender } = renderStep(2);
      expect(screen.getByText("Now")).toBeInTheDocument();

      rerender(<ExampleChapter step={0} />);
      expect(screen.queryByText("Now")).not.toBeInTheDocument();
      expect(screen.getByText("Chapter 01 — Example")).toBeInTheDocument();
    });
  });

  // ────────────────────────────────────────────────────────────────
  // 7. rerender 稳定性
  // ────────────────────────────────────────────────────────────────
  describe("rerender 稳定性", () => {
    it("多次 rerender 不应抛出错误", () => {
      const { rerender } = renderStep(0);
      for (let i = 0; i < 10; i++) {
        expect(() => rerender(<ExampleChapter step={i % 3} />)).not.toThrow();
      }
    });
  });

  // ────────────────────────────────────────────────────────────────
  // 8. 无障碍 — 语义化 HTML
  // ────────────────────────────────────────────────────────────────
  describe("语义化 HTML", () => {
    it("Step 0 应使用 header 元素作为 masthead", () => {
      const { container } = renderStep(0);
      expect(container.querySelector("header.masthead")).toBeTruthy();
    });

    it("Step 0 应使用 h1 元素作为主标题", () => {
      const { container } = renderStep(0);
      expect(container.querySelector("h1.ex-cover-h")).toBeTruthy();
    });

    it("Step 1 应使用 header 元素作为 masthead", () => {
      const { container } = renderStep(1);
      expect(container.querySelector("header.masthead")).toBeTruthy();
    });

    it("Step 1 应使用 h2 元素作为标题", () => {
      const { container } = renderStep(1);
      expect(container.querySelector("h2.ex-split-h")).toBeTruthy();
    });
  });

  // ────────────────────────────────────────────────────────────────
  // 9. 组件 unmount
  // ────────────────────────────────────────────────────────────────
  describe("unmount 清理", () => {
    it("unmount 不应抛出错误", () => {
      const { unmount } = renderStep(0);
      expect(() => unmount()).not.toThrow();
    });

    it("unmount step 1 不应抛出错误", () => {
      const { unmount } = renderStep(1);
      expect(() => unmount()).not.toThrow();
    });

    it("unmount step 2 不应抛出错误", () => {
      const { unmount } = renderStep(2);
      expect(() => unmount()).not.toThrow();
    });
  });

  // ────────────────────────────────────────────────────────────────
  // 10. CSS 类名完整性 — 每个 step 的关键类名
  // ────────────────────────────────────────────────────────────────
  describe("CSS 类名完整性", () => {
    it("Step 0 应包含所有关键类名", () => {
      const { container } = renderStep(0);
      const required = [
        ".ex-scene", ".scene-pad", ".masthead", ".brand", ".issue",
        ".rule", ".ex-cover-body", ".kicker", ".ex-cover-h",
        ".ex-cover-foot", ".label-mono", ".dot-accent",
      ];
      for (const sel of required) {
        expect(container.querySelector(sel)).toBeTruthy();
      }
    });

    it("Step 1 应包含所有关键类名", () => {
      const { container } = renderStep(1);
      const required = [
        ".ex-scene", ".scene-pad", ".masthead", ".brand", ".issue",
        ".rule", ".ex-split", ".ex-split-num", ".hero-num",
        ".ex-split-body", ".kicker", ".ex-split-h", ".ex-split-p",
      ];
      for (const sel of required) {
        expect(container.querySelector(sel)).toBeTruthy();
      }
    });

    it("Step 2 应包含所有关键类名", () => {
      const { container } = renderStep(2);
      const required = [
        ".ex-scene", ".scene-pad", ".ex-close", ".ex-close-inner",
        ".kicker", ".pull-quote", ".ex-quote", ".ex-close-foot", ".label-mono",
      ];
      for (const sel of required) {
        expect(container.querySelector(sel)).toBeTruthy();
      }
    });
  });
});
