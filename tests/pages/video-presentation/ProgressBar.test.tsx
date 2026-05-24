/**
 * @jest-environment jsdom
 *
 * ProgressBar.tsx TDD 测试用例
 * 覆盖：章节按钮渲染、活跃状态、步骤 pips、点击事件、
 * stopPropagation、GitHub 链接、scrollIntoView useEffect、
 * 边界场景、rerender 稳定性、unmount、无障碍、快照
 */
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ProgressBar } from "../../../.agents/skills/web-video-presentation/templates/src/components/ProgressBar";

// ── CSS mock ──────────────────────────────────────────────────────────────
jest.mock(
  "../../../.agents/skills/web-video-presentation/templates/src/components/ProgressBar.css",
  () => ({}),
);

// ── scrollIntoView mock（jsdom 未实现）──────────────────────────────────
const scrollIntoViewMock = jest.fn();
HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

// ── Mock 数据 ─────────────────────────────────────────────────────────────
function makeChapter(id: string, title: string, narrationCount: number) {
  return {
    id,
    title,
    narrations: Array.from({ length: narrationCount }, (_, i) => `narration-${i}`),
    Component: () => null,
  };
}

const MOCK_CHAPTERS = [
  makeChapter("ch-1", "Introduction", 3),
  makeChapter("ch-2", "Deep Dive", 5),
  makeChapter("ch-3", "Conclusion", 2),
];

// ── 辅助函数 ──────────────────────────────────────────────────────────────
function renderProgressBar(
  overrides: {
    chapters?: any[];
    cursor?: { chapter: number; step: number };
    onJumpChapter?: (idx: number, step?: number) => void;
    githubUrl?: string | null;
  } = {},
) {
  const onJumpChapter = overrides.onJumpChapter ?? jest.fn();
  const result = render(
    <ProgressBar
      chapters={overrides.chapters ?? MOCK_CHAPTERS}
      cursor={overrides.cursor ?? { chapter: 0, step: 0 }}
      onJumpChapter={onJumpChapter}
      githubUrl={overrides.githubUrl}
    />,
  );
  return { ...result, onJumpChapter };
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 测试
// ════════════════════════════════════════════════════════════════════════════════════════
describe("ProgressBar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // ───────────────────────────────────────────────────────────────────────────────
  // 1. 基础渲染 — DOM 结构
  // ───────────────────────────────────────────────────────────────────────────────
  describe("基础渲染", () => {
    it("应渲染 pb-hover 外层容器", () => {
      const { container } = renderProgressBar();
      expect(container.querySelector(".pb-hover")).toBeTruthy();
    });

    it("外层容器应有 data-no-advance 属性", () => {
      const { container } = renderProgressBar();
      expect(container.querySelector('[data-no-advance]')).toBeTruthy();
    });

    it("应渲染 pb 进度条容器", () => {
      const { container } = renderProgressBar();
      expect(container.querySelector(".pb")).toBeTruthy();
    });

    it("应渲染正确数量的章节按钮（3 个）", () => {
      const { container } = renderProgressBar();
      const buttons = container.querySelectorAll(".pb-chapter");
      expect(buttons).toHaveLength(3);
    });

    it("所有章节按钮应为 button 元素", () => {
      const { container } = renderProgressBar();
      const buttons = container.querySelectorAll("button.pb-chapter");
      expect(buttons).toHaveLength(3);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────────
  // 2. 章节按钮内容
  // ───────────────────────────────────────────────────────────────────────────────
  describe("章节按钮内容", () => {
    it("第 1 章编号应为 '01'", () => {
      const { container } = renderProgressBar();
      const nums = container.querySelectorAll(".pb-num");
      expect(nums[0].textContent).toBe("01");
    });

    it("第 2 章编号应为 '02'", () => {
      const { container } = renderProgressBar();
      const nums = container.querySelectorAll(".pb-num");
      expect(nums[1].textContent).toBe("02");
    });

    it("第 3 章编号应为 '03'", () => {
      const { container } = renderProgressBar();
      const nums = container.querySelectorAll(".pb-num");
      expect(nums[2].textContent).toBe("03");
    });

    it("第 1 章标题应为 'Introduction'", () => {
      const { container } = renderProgressBar();
      const titles = container.querySelectorAll(".pb-title");
      expect(titles[0].textContent).toBe("Introduction");
    });

    it("第 2 章标题应为 'Deep Dive'", () => {
      const { container } = renderProgressBar();
      const titles = container.querySelectorAll(".pb-title");
      expect(titles[1].textContent).toBe("Deep Dive");
    });

    it("第 3 章标题应为 'Conclusion'", () => {
      const { container } = renderProgressBar();
      const titles = container.querySelectorAll(".pb-title");
      expect(titles[2].textContent).toBe("Conclusion");
    });

    it("章节编号超过 9 时应保持两位数（如 '10'）", () => {
      const chapters = Array.from({ length: 12 }, (_, i) =>
        makeChapter(`ch-${i}`, `Chapter ${i}`, 1),
      );
      const { container } = renderProgressBar({
        chapters,
        cursor: { chapter: 9, step: 0 },
      });
      const nums = container.querySelectorAll(".pb-num");
      expect(nums[9].textContent).toBe("10");
      expect(nums[11].textContent).toBe("12");
    });
  });

  // ───────────────────────────────────────────────────────────────────────────────
  // 3. 活跃章节高亮
  // ───────────────────────────────────────────────────────────────────────────────
  describe("活跃章节高亮", () => {
    it("当前章节应有 pb-active 类", () => {
      const { container } = renderProgressBar({
        cursor: { chapter: 0, step: 0 },
      });
      const active = container.querySelectorAll(".pb-active");
      expect(active).toHaveLength(1);
      expect(active[0].querySelector(".pb-title")?.textContent).toBe("Introduction");
    });

    it("cursor.chapter=1 时第 2 章应为活跃", () => {
      const { container } = renderProgressBar({
        cursor: { chapter: 1, step: 0 },
      });
      const active = container.querySelector(".pb-active");
      expect(active?.querySelector(".pb-title")?.textContent).toBe("Deep Dive");
    });

    it("cursor.chapter=2 时第 3 章应为活跃", () => {
      const { container } = renderProgressBar({
        cursor: { chapter: 2, step: 0 },
      });
      const active = container.querySelector(".pb-active");
      expect(active?.querySelector(".pb-title")?.textContent).toBe("Conclusion");
    });

    it("同时只有一个活跃章节", () => {
      const { container } = renderProgressBar({
        cursor: { chapter: 1, step: 0 },
      });
      expect(container.querySelectorAll(".pb-active")).toHaveLength(1);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────────
  // 4. 步骤 pips
  // ───────────────────────────────────────────────────────────────────────────────
  describe("步骤 pips", () => {
    it("只有活跃章节才显示 pips 容器", () => {
      const { container } = renderProgressBar({
        cursor: { chapter: 0, step: 0 },
      });
      expect(container.querySelectorAll(".pb-pips")).toHaveLength(1);
    });

    it("活跃章节的 pip 数量应等于 narrations.length", () => {
      const { container } = renderProgressBar({
        cursor: { chapter: 0, step: 0 },
      });
      // ch-1 有 3 个 narrations
      expect(container.querySelectorAll(".pb-pip")).toHaveLength(3);
    });

    it("cursor.step=0 时第 1 个 pip 应有 pb-pip-on 类", () => {
      const { container } = renderProgressBar({
        cursor: { chapter: 0, step: 0 },
      });
      const pips = container.querySelectorAll(".pb-pip");
      expect(pips[0].classList.contains("pb-pip-on")).toBe(true);
      expect(pips[1].classList.contains("pb-pip-on")).toBe(false);
      expect(pips[2].classList.contains("pb-pip-on")).toBe(false);
    });

    it("cursor.step=1 时前 2 个 pip 应亮", () => {
      const { container } = renderProgressBar({
        cursor: { chapter: 0, step: 1 },
      });
      const pips = container.querySelectorAll(".pb-pip");
      expect(pips[0].classList.contains("pb-pip-on")).toBe(true);
      expect(pips[1].classList.contains("pb-pip-on")).toBe(true);
      expect(pips[2].classList.contains("pb-pip-on")).toBe(false);
    });

    it("cursor.step=2 时全部 pip 应亮", () => {
      const { container } = renderProgressBar({
        cursor: { chapter: 0, step: 2 },
      });
      const pips = container.querySelectorAll(".pb-pip");
      expect(pips[0].classList.contains("pb-pip-on")).toBe(true);
      expect(pips[1].classList.contains("pb-pip-on")).toBe(true);
      expect(pips[2].classList.contains("pb-pip-on")).toBe(true);
    });

    it("切换活跃章节后 pips 数量更新", () => {
      const { container } = renderProgressBar({
        cursor: { chapter: 1, step: 0 },
      });
      // ch-2 有 5 个 narrations
      expect(container.querySelectorAll(".pb-pip")).toHaveLength(5);
    });

    it("非活跃章节不应渲染 pips", () => {
      const { container } = renderProgressBar({
        cursor: { chapter: 0, step: 0 },
      });
      const chapters = container.querySelectorAll(".pb-chapter");
      // 第 2 和第 3 章不应有 pips
      expect(chapters[1].querySelector(".pb-pips")).toBeNull();
      expect(chapters[2].querySelector(".pb-pips")).toBeNull();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────────
  // 5. 章节点击事件
  // ───────────────────────────────────────────────────────────────────────────────
  describe("章节点击事件", () => {
    it("点击第 1 章按钮应调用 onJumpChapter(0, 0)", () => {
      const onJumpChapter = jest.fn();
      const { container } = renderProgressBar({ onJumpChapter });
      const buttons = container.querySelectorAll(".pb-chapter");
      fireEvent.click(buttons[0]);
      expect(onJumpChapter).toHaveBeenCalledWith(0, 0);
    });

    it("点击第 2 章按钮应调用 onJumpChapter(1, 0)", () => {
      const onJumpChapter = jest.fn();
      const { container } = renderProgressBar({ onJumpChapter });
      const buttons = container.querySelectorAll(".pb-chapter");
      fireEvent.click(buttons[1]);
      expect(onJumpChapter).toHaveBeenCalledWith(1, 0);
    });

    it("点击第 3 章按钮应调用 onJumpChapter(2, 0)", () => {
      const onJumpChapter = jest.fn();
      const { container } = renderProgressBar({ onJumpChapter });
      const buttons = container.querySelectorAll(".pb-chapter");
      fireEvent.click(buttons[2]);
      expect(onJumpChapter).toHaveBeenCalledWith(2, 0);
    });

    it("点击章节按钮应 stopPropagation", () => {
      const onJumpChapter = jest.fn();
      const { container } = renderProgressBar({ onJumpChapter });
      const button = container.querySelectorAll(".pb-chapter")[0];
      const clickEvt = new MouseEvent("click", { bubbles: true });
      const spy = jest.spyOn(clickEvt, "stopPropagation");
      fireEvent(button, clickEvt);
      expect(spy).toHaveBeenCalled();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────────
  // 6. Pip 点击事件
  // ───────────────────────────────────────────────────────────────────────────────
  describe("Pip 点击事件", () => {
    it("点击第 0 个 pip 应调用 onJumpChapter(0, 0)", () => {
      const onJumpChapter = jest.fn();
      const { container } = renderProgressBar({
        cursor: { chapter: 0, step: 0 },
        onJumpChapter,
      });
      const pips = container.querySelectorAll(".pb-pip");
      fireEvent.click(pips[0]);
      expect(onJumpChapter).toHaveBeenCalledWith(0, 0);
    });

    it("点击第 1 个 pip 应调用 onJumpChapter(0, 1)", () => {
      const onJumpChapter = jest.fn();
      const { container } = renderProgressBar({
        cursor: { chapter: 0, step: 0 },
        onJumpChapter,
      });
      const pips = container.querySelectorAll(".pb-pip");
      fireEvent.click(pips[1]);
      expect(onJumpChapter).toHaveBeenCalledWith(0, 1);
    });

    it("点击第 2 个 pip 应调用 onJumpChapter(0, 2)", () => {
      const onJumpChapter = jest.fn();
      const { container } = renderProgressBar({
        cursor: { chapter: 0, step: 0 },
        onJumpChapter,
      });
      const pips = container.querySelectorAll(".pb-pip");
      fireEvent.click(pips[2]);
      expect(onJumpChapter).toHaveBeenCalledWith(0, 2);
    });

    it("点击 pip 应 stopPropagation", () => {
      const onJumpChapter = jest.fn();
      const { container } = renderProgressBar({
        cursor: { chapter: 0, step: 0 },
        onJumpChapter,
      });
      const pip = container.querySelectorAll(".pb-pip")[0];
      const clickEvt = new MouseEvent("click", { bubbles: true });
      const spy = jest.spyOn(clickEvt, "stopPropagation");
      fireEvent(pip, clickEvt);
      expect(spy).toHaveBeenCalled();
    });

    it("点击非活跃章节的 pip 区域不应触发（无 pips 存在）", () => {
      const onJumpChapter = jest.fn();
      const { container } = renderProgressBar({
        cursor: { chapter: 0, step: 0 },
        onJumpChapter,
      });
      // 第 2 章不活跃，无 pips
      const chapter2 = container.querySelectorAll(".pb-chapter")[1];
      expect(chapter2.querySelector(".pb-pip")).toBeNull();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────────
  // 7. GitHub 链接
  // ───────────────────────────────────────────────────────────────────────────────
  describe("GitHub 链接", () => {
    it("未传 githubUrl 时应使用默认 URL 渲染链接", () => {
      const { container } = renderProgressBar();
      const link = container.querySelector(".pb-github") as HTMLAnchorElement;
      expect(link).toBeTruthy();
      expect(link.href).toBe("https://github.com/ConardLi/garden-skills");
    });

    it("传入自定义 githubUrl 时应渲染对应链接", () => {
      const { container } = renderProgressBar({
        githubUrl: "https://github.com/custom/repo",
      });
      const link = container.querySelector(".pb-github") as HTMLAnchorElement;
      expect(link).toBeTruthy();
      expect(link.href).toBe("https://github.com/custom/repo");
    });

    it("githubUrl=null 时不渲染链接", () => {
      const { container } = renderProgressBar({ githubUrl: null });
      expect(container.querySelector(".pb-github")).toBeNull();
    });

    it("githubUrl='' 空字符串时不应渲染链接", () => {
      const { container } = renderProgressBar({ githubUrl: "" });
      expect(container.querySelector(".pb-github")).toBeNull();
    });

    it("链接应有 target='_blank'", () => {
      const { container } = renderProgressBar();
      const link = container.querySelector(".pb-github") as HTMLAnchorElement;
      expect(link.getAttribute("target")).toBe("_blank");
    });

    it("链接应有 rel='noopener noreferrer'", () => {
      const { container } = renderProgressBar();
      const link = container.querySelector(".pb-github") as HTMLAnchorElement;
      expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    });

    it("链接应有 aria-label", () => {
      const { container } = renderProgressBar();
      const link = container.querySelector(".pb-github") as HTMLAnchorElement;
      expect(link.getAttribute("aria-label")).toBe("View source on GitHub");
    });

    it("链接点击应 stopPropagation", () => {
      const { container } = renderProgressBar();
      const link = container.querySelector(".pb-github") as HTMLAnchorElement;
      const clickEvt = new MouseEvent("click", { bubbles: true });
      const spy = jest.spyOn(clickEvt, "stopPropagation");
      fireEvent(link, clickEvt);
      expect(spy).toHaveBeenCalled();
    });

    it("应渲染 GitHub SVG 图标", () => {
      const { container } = renderProgressBar();
      const svg = container.querySelector(".pb-github svg");
      expect(svg).toBeTruthy();
      expect(svg?.getAttribute("viewBox")).toBe("0 0 24 24");
    });

    it("SVG 应有 aria-hidden='true'", () => {
      const { container } = renderProgressBar();
      const svg = container.querySelector(".pb-github svg");
      expect(svg?.getAttribute("aria-hidden")).toBe("true");
    });

    it("SVG 应有 focusable='false'", () => {
      const { container } = renderProgressBar();
      const svg = container.querySelector(".pb-github svg");
      expect(svg?.getAttribute("focusable")).toBe("false");
    });

    it("SVG 应有 width 和 height 属性", () => {
      const { container } = renderProgressBar();
      const svg = container.querySelector(".pb-github svg");
      expect(svg?.getAttribute("width")).toBe("20");
      expect(svg?.getAttribute("height")).toBe("20");
    });
  });

  // ───────────────────────────────────────────────────────────────────────────────
  // 8. scrollIntoView useEffect
  // ───────────────────────────────────────────────────────────────────────────────
  describe("scrollIntoView useEffect", () => {
    it("初始渲染时应调用 scrollIntoView", () => {
      renderProgressBar({ cursor: { chapter: 0, step: 0 } });
      expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
    });

    it("scrollIntoView 应使用 smooth、nearest、center 参数", () => {
      renderProgressBar({ cursor: { chapter: 0, step: 0 } });
      expect(scrollIntoViewMock).toHaveBeenCalledWith({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    });

    it("切换 cursor.chapter 时应再次调用 scrollIntoView", () => {
      const { rerender } = renderProgressBar({
        cursor: { chapter: 0, step: 0 },
      });
      scrollIntoViewMock.mockClear();

      rerender(
        <ProgressBar
          chapters={MOCK_CHAPTERS}
          cursor={{ chapter: 1, step: 0 }}
          onJumpChapter={jest.fn()}
        />,
      );
      expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
    });

    it("cursor.step 变化不应触发 scrollIntoView", () => {
      const onJumpChapter = jest.fn();
      const { rerender } = renderProgressBar({
        cursor: { chapter: 0, step: 0 },
        onJumpChapter,
      });
      scrollIntoViewMock.mockClear();

      rerender(
        <ProgressBar
          chapters={MOCK_CHAPTERS}
          cursor={{ chapter: 0, step: 2 }}
          onJumpChapter={onJumpChapter}
        />,
      );
      expect(scrollIntoViewMock).not.toHaveBeenCalled();
    });

    it("连续切换章节应分别触发 scrollIntoView", () => {
      const onJumpChapter = jest.fn();
      const { rerender } = renderProgressBar({
        cursor: { chapter: 0, step: 0 },
        onJumpChapter,
      });
      scrollIntoViewMock.mockClear();

      rerender(
        <ProgressBar
          chapters={MOCK_CHAPTERS}
          cursor={{ chapter: 1, step: 0 }}
          onJumpChapter={onJumpChapter}
        />,
      );
      rerender(
        <ProgressBar
          chapters={MOCK_CHAPTERS}
          cursor={{ chapter: 2, step: 0 }}
          onJumpChapter={onJumpChapter}
        />,
      );
      expect(scrollIntoViewMock).toHaveBeenCalledTimes(2);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────────
  // 9. 边界场景
  // ───────────────────────────────────────────────────────────────────────────────
  describe("边界场景", () => {
    it("空章节数组应正常渲染（无章节按钮）", () => {
      const { container } = renderProgressBar({ chapters: [] });
      expect(container.querySelectorAll(".pb-chapter")).toHaveLength(0);
      expect(container.querySelector(".pb")).toBeTruthy();
    });

    it("单个章节应正常渲染", () => {
      const { container } = renderProgressBar({
        chapters: [makeChapter("only", "Solo", 1)],
        cursor: { chapter: 0, step: 0 },
      });
      expect(container.querySelectorAll(".pb-chapter")).toHaveLength(1);
    });

    it("cursor.step 超出 narrations 范围时所有 pip 仍可亮（s <= cursor.step）", () => {
      const { container } = renderProgressBar({
        cursor: { chapter: 0, step: 100 },
      });
      const pips = container.querySelectorAll(".pb-pip");
      pips.forEach((pip) => {
        expect(pip.classList.contains("pb-pip-on")).toBe(true);
      });
    });

    it("cursor.step 为负数时所有 pip 不应亮", () => {
      const { container } = renderProgressBar({
        cursor: { chapter: 0, step: -1 },
      });
      const pips = container.querySelectorAll(".pb-pip");
      pips.forEach((pip) => {
        expect(pip.classList.contains("pb-pip-on")).toBe(false);
      });
    });

    it("单个 narration 的章节应有 1 个 pip", () => {
      const { container } = renderProgressBar({
        chapters: [makeChapter("ch-1", "One Step", 1)],
        cursor: { chapter: 0, step: 0 },
      });
      expect(container.querySelectorAll(".pb-pip")).toHaveLength(1);
    });

    it("0 个 narration 的章节不应渲染 pips", () => {
      const { container } = renderProgressBar({
        chapters: [makeChapter("ch-1", "Empty", 0)],
        cursor: { chapter: 0, step: 0 },
      });
      expect(container.querySelectorAll(".pb-pip")).toHaveLength(0);
    });

    it("大量章节（50 个）应正常渲染", () => {
      const chapters = Array.from({ length: 50 }, (_, i) =>
        makeChapter(`ch-${i}`, `Chapter ${i}`, 2),
      );
      const { container } = renderProgressBar({
        chapters,
        cursor: { chapter: 25, step: 0 },
      });
      expect(container.querySelectorAll(".pb-chapter")).toHaveLength(50);
      expect(container.querySelectorAll(".pb-pip")).toHaveLength(2);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────────
  // 10. rerender 稳定性
  // ───────────────────────────────────────────────────────────────────────────────
  describe("rerender 稳定性", () => {
    it("从 chapter 0 切换到 chapter 1 后活跃状态更新", () => {
      const onJumpChapter = jest.fn();
      const { container, rerender } = renderProgressBar({
        cursor: { chapter: 0, step: 0 },
        onJumpChapter,
      });
      expect(container.querySelector(".pb-active .pb-title")?.textContent).toBe("Introduction");

      rerender(
        <ProgressBar
          chapters={MOCK_CHAPTERS}
          cursor={{ chapter: 1, step: 0 }}
          onJumpChapter={onJumpChapter}
        />,
      );
      expect(container.querySelector(".pb-active .pb-title")?.textContent).toBe("Deep Dive");
    });

    it("step 变化后 pip 状态更新", () => {
      const onJumpChapter = jest.fn();
      const { container, rerender } = renderProgressBar({
        cursor: { chapter: 0, step: 0 },
        onJumpChapter,
      });
      let pips = container.querySelectorAll(".pb-pip");
      expect(pips[0].classList.contains("pb-pip-on")).toBe(true);
      expect(pips[1].classList.contains("pb-pip-on")).toBe(false);

      rerender(
        <ProgressBar
          chapters={MOCK_CHAPTERS}
          cursor={{ chapter: 0, step: 2 }}
          onJumpChapter={onJumpChapter}
        />,
      );
      pips = container.querySelectorAll(".pb-pip");
      expect(pips[0].classList.contains("pb-pip-on")).toBe(true);
      expect(pips[1].classList.contains("pb-pip-on")).toBe(true);
      expect(pips[2].classList.contains("pb-pip-on")).toBe(true);
    });

    it("多次 rerender 不应抛出错误", () => {
      const onJumpChapter = jest.fn();
      const { rerender } = renderProgressBar({
        cursor: { chapter: 0, step: 0 },
        onJumpChapter,
      });
      for (let i = 0; i < 20; i++) {
        expect(() =>
          rerender(
            <ProgressBar
              chapters={MOCK_CHAPTERS}
              cursor={{ chapter: i % 3, step: i % 5 }}
              onJumpChapter={onJumpChapter}
            />,
          ),
        ).not.toThrow();
      }
    });

    it("章节数组变化后应正确更新", () => {
      const onJumpChapter = jest.fn();
      const { container, rerender } = renderProgressBar({
        cursor: { chapter: 0, step: 0 },
        onJumpChapter,
      });
      expect(container.querySelectorAll(".pb-chapter")).toHaveLength(3);

      const newChapters = [makeChapter("a", "Alpha", 2), makeChapter("b", "Beta", 3)];
      rerender(
        <ProgressBar
          chapters={newChapters}
          cursor={{ chapter: 0, step: 0 }}
          onJumpChapter={onJumpChapter}
        />,
      );
      expect(container.querySelectorAll(".pb-chapter")).toHaveLength(2);
      expect(container.querySelectorAll(".pb-pip")).toHaveLength(2);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────────
  // 11. unmount 清理
  // ───────────────────────────────────────────────────────────────────────────────
  describe("unmount 清理", () => {
    it("unmount 不应抛出错误", () => {
      const { unmount } = renderProgressBar();
      expect(() => unmount()).not.toThrow();
    });

    it("活跃章节状态下 unmount 不应抛出错误", () => {
      const { unmount } = renderProgressBar({
        cursor: { chapter: 1, step: 3 },
      });
      expect(() => unmount()).not.toThrow();
    });

    it("大量章节 unmount 不应抛出错误", () => {
      const chapters = Array.from({ length: 50 }, (_, i) =>
        makeChapter(`ch-${i}`, `Chapter ${i}`, 5),
      );
      const { unmount } = renderProgressBar({
        chapters,
        cursor: { chapter: 25, step: 3 },
      });
      expect(() => unmount()).not.toThrow();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────────
  // 12. 无障碍
  // ───────────────────────────────────────────────────────────────────────────────
  describe("无障碍", () => {
    it("章节按钮可通过 role 查询", () => {
      renderProgressBar();
      const buttons = screen.getAllByRole("button");
      // 3 章节按钮（GitHub 链接是 <a> 不是 button）
      expect(buttons).toHaveLength(3);
    });

    it("GitHub 链接可通过 aria-label 查询", () => {
      renderProgressBar();
      const link = screen.getByLabelText("View source on GitHub");
      expect(link).toBeTruthy();
    });

    it("GitHub 链接无 aria-label 时不应被匹配（svg hidden）", () => {
      renderProgressBar();
      const svg = document.querySelector(".pb-github svg");
      expect(svg?.getAttribute("aria-hidden")).toBe("true");
    });
  });

  // ───────────────────────────────────────────────────────────────────────────────
  // 13. 快照测试
  // ───────────────────────────────────────────────────────────────────────────────
  describe("快照测试", () => {
    it("cursor={chapter:0, step:0} 快照应匹配", () => {
      const { container } = renderProgressBar({
        cursor: { chapter: 0, step: 0 },
      });
      expect(container).toMatchSnapshot();
    });

    it("cursor={chapter:1, step:2} 快照应匹配", () => {
      const { container } = renderProgressBar({
        cursor: { chapter: 1, step: 2 },
      });
      expect(container).toMatchSnapshot();
    });

    it("cursor={chapter:2, step:1} 快照应匹配", () => {
      const { container } = renderProgressBar({
        cursor: { chapter: 2, step: 1 },
      });
      expect(container).toMatchSnapshot();
    });

    it("githubUrl=null 快照应匹配（无链接）", () => {
      const { container } = renderProgressBar({ githubUrl: null });
      expect(container).toMatchSnapshot();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────────
  // 14. CSS 类名完整性
  // ───────────────────────────────────────────────────────────────────────────────
  describe("CSS 类名完整性", () => {
    it("应包含所有关键外层类名", () => {
      const { container } = renderProgressBar();
      const required = [".pb-hover", ".pb", ".pb-chapter", ".pb-num", ".pb-title"];
      for (const sel of required) {
        expect(container.querySelector(sel)).toBeTruthy();
      }
    });

    it("活跃章节应包含 pb-active 和 pb-pips 类", () => {
      const { container } = renderProgressBar({
        cursor: { chapter: 0, step: 0 },
      });
      expect(container.querySelector(".pb-active")).toBeTruthy();
      expect(container.querySelector(".pb-pips")).toBeTruthy();
      expect(container.querySelector(".pb-pip")).toBeTruthy();
      expect(container.querySelector(".pb-pip-on")).toBeTruthy();
    });

    it("GitHub 链接应包含 pb-github 类", () => {
      const { container } = renderProgressBar();
      expect(container.querySelector(".pb-github")).toBeTruthy();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────────
  // 15. ref 行为验证
  // ───────────────────────────────────────────────────────────────────────────────
  describe("ref 行为", () => {
    it("只有活跃章节按钮被 scrollIntoView", () => {
      renderProgressBar({ cursor: { chapter: 1, step: 0 } });
      // scrollIntoView 应被调用，说明 activeRef 被设置了
      expect(scrollIntoViewMock).toHaveBeenCalled();
    });

    it("活跃章节变化后 scrollIntoView 调用的是新章节按钮", () => {
      const onJumpChapter = jest.fn();
      const { rerender } = renderProgressBar({
        cursor: { chapter: 0, step: 0 },
        onJumpChapter,
      });
      scrollIntoViewMock.mockClear();

      rerender(
        <ProgressBar
          chapters={MOCK_CHAPTERS}
          cursor={{ chapter: 2, step: 0 }}
          onJumpChapter={onJumpChapter}
        />,
      );
      expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
    });
  });
});
