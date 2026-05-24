/**
 * @jest-environment jsdom
 *
 * useStepper hook TDD 测试用例
 * 覆盖初始化、导航、跳跃、键盘、localStorage 持久化、chapter 变化 re-sanitize、computed values、边界情况
 */
import React from "react";
import { renderHook, act } from "@testing-library/react";
import {
  useStepper,
  type StepperState,
  type Cursor,
} from "../../../.agents/skills/web-video-presentation/templates/src/hooks/useStepper";
import type { ChapterDef } from "../../../.agents/skills/web-video-presentation/templates/src/registry/types";

// ── Helpers ─────────────────────────────────────────────────
const STORAGE_KEY = "presentation-cursor-v4";

/** 创建一个最简 ChapterDef */
function makeChapter(
  id: string,
  narrationCount: number,
  title = id,
): ChapterDef {
  return {
    id,
    title,
    narrations: Array.from({ length: narrationCount }, (_, i) => `n${i}`),
    Component: () => null,
  };
}

/** 创建 chapters 列表 */
function makeChapters(...counts: [string, number][]): ChapterDef[] {
  return counts.map(([id, n]) => makeChapter(id, n));
}

/** 模拟键盘事件 */
function fireKey(
  key: string,
  target: EventTarget | null = null,
  opts: Partial<KeyboardEventInit> = {},
) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    ...opts,
  });
  if (target) {
    Object.defineProperty(event, "target", { value: target });
  }
  window.dispatchEvent(event);
}

beforeEach(() => {
  localStorage.clear();
});

// ═══════════════════════════════════════════════════════════
// 1. 初始状态
// ═══════════════════════════════════════════════════════════
describe("1. 初始状态", () => {
  it("默认 cursor 为 {chapter:0, step:0}", () => {
    const chapters = makeChapters(["ch1", 3], ["ch2", 2]);
    const { result } = renderHook(() => useStepper(chapters));
    expect(result.current.cursor).toEqual({ chapter: 0, step: 0 });
  });

  it("从 localStorage 恢复有效 cursor", () => {
    const chapters = makeChapters(["ch1", 3], ["ch2", 2]);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ chapter: 1, step: 1 }),
    );
    const { result } = renderHook(() => useStepper(chapters));
    expect(result.current.cursor).toEqual({ chapter: 1, step: 1 });
  });

  it("localStorage 数据 cursor.chapter 越界时 sanitize 到最后一个 chapter", () => {
    const chapters = makeChapters(["ch1", 3]);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ chapter: 99, step: 0 }),
    );
    const { result } = renderHook(() => useStepper(chapters));
    expect(result.current.cursor).toEqual({ chapter: 0, step: 0 });
  });

  it("localStorage 数据 cursor.step 越界时 sanitize 到 chapter 内最大 step", () => {
    const chapters = makeChapters(["ch1", 3]);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ chapter: 0, step: 99 }),
    );
    const { result } = renderHook(() => useStepper(chapters));
    expect(result.current.cursor).toEqual({ chapter: 0, step: 2 });
  });

  it("localStorage 数据为非法 JSON 时回退到默认值", () => {
    const chapters = makeChapters(["ch1", 3]);
    localStorage.setItem(STORAGE_KEY, "not-json{{{");
    const { result } = renderHook(() => useStepper(chapters));
    expect(result.current.cursor).toEqual({ chapter: 0, step: 0 });
  });

  it("localStorage 数据为 null 时回退到默认值", () => {
    const chapters = makeChapters(["ch1", 3]);
    localStorage.setItem(STORAGE_KEY, "null");
    const { result } = renderHook(() => useStepper(chapters));
    expect(result.current.cursor).toEqual({ chapter: 0, step: 0 });
  });

  it("空 chapters 返回 cursor {0,0}", () => {
    const { result } = renderHook(() => useStepper([]));
    expect(result.current.cursor).toEqual({ chapter: 0, step: 0 });
    expect(result.current.totalChapters).toBe(0);
  });

  it("cursor 的 chapter/step 为非整数时 sanitize 到最近整数", () => {
    const chapters = makeChapters(["ch1", 3], ["ch2", 2]);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ chapter: 1.7, step: 0.9 }),
    );
    const { result } = renderHook(() => useStepper(chapters));
    // 1.7 | 0 === 1, 0.9 | 0 === 0
    expect(result.current.cursor).toEqual({ chapter: 1, step: 0 });
  });
});

// ═══════════════════════════════════════════════════════════
// 2. next() 导航
// ═══════════════════════════════════════════════════════════
describe("2. next() 导航", () => {
  it("在 chapter 内前进 step", () => {
    const chapters = makeChapters(["ch1", 3], ["ch2", 2]);
    const { result } = renderHook(() => useStepper(chapters));
    act(() => result.current.next());
    expect(result.current.cursor).toEqual({ chapter: 0, step: 1 });
  });

  it("step 到达 chapter 末尾时跳到下一个 chapter 的 step 0", () => {
    const chapters = makeChapters(["ch1", 2], ["ch2", 3]);
    const { result } = renderHook(() => useStepper(chapters));
    act(() => result.current.next()); // step 0→1
    act(() => result.current.next()); // cross chapter → ch2 step 0
    expect(result.current.cursor).toEqual({ chapter: 1, step: 0 });
  });

  it("在最后一个 chapter 最后一个 step 时不变", () => {
    const chapters = makeChapters(["ch1", 2], ["ch2", 2]);
    const { result } = renderHook(() => useStepper(chapters));
    act(() => result.current.jumpToChapter(1, 1));
    act(() => result.current.next());
    expect(result.current.cursor).toEqual({ chapter: 1, step: 1 });
  });

  it("单 chapter 单 step 不变", () => {
    const chapters = makeChapters(["ch1", 1]);
    const { result } = renderHook(() => useStepper(chapters));
    act(() => result.current.next());
    expect(result.current.cursor).toEqual({ chapter: 0, step: 0 });
  });

  it("连续 next 跨越多 chapter", () => {
    const chapters = makeChapters(["ch1", 1], ["ch2", 1], ["ch3", 1]);
    const { result } = renderHook(() => useStepper(chapters));
    act(() => result.current.next()); // ch2
    act(() => result.current.next()); // ch3
    expect(result.current.cursor).toEqual({ chapter: 2, step: 0 });
  });

  it("连续 next 到最后保持不动", () => {
    const chapters = makeChapters(["ch1", 1], ["ch2", 1], ["ch3", 1]);
    const { result } = renderHook(() => useStepper(chapters));
    act(() => result.current.next());
    act(() => result.current.next());
    act(() => result.current.next()); // no-op
    act(() => result.current.next()); // no-op
    expect(result.current.cursor).toEqual({ chapter: 2, step: 0 });
  });
});

// ═══════════════════════════════════════════════════════════
// 3. prev() 导航
// ═══════════════════════════════════════════════════════════
describe("3. prev() 导航", () => {
  it("在 chapter 内后退 step", () => {
    const chapters = makeChapters(["ch1", 3]);
    const { result } = renderHook(() => useStepper(chapters));
    act(() => result.current.jumpToChapter(0, 2));
    act(() => result.current.prev());
    expect(result.current.cursor).toEqual({ chapter: 0, step: 1 });
  });

  it("step 在 0 时跳到上一个 chapter 的最后一个 step", () => {
    const chapters = makeChapters(["ch1", 3], ["ch2", 2]);
    const { result } = renderHook(() => useStepper(chapters));
    act(() => result.current.jumpToChapter(1, 0));
    act(() => result.current.prev());
    expect(result.current.cursor).toEqual({ chapter: 0, step: 2 });
  });

  it("在第一个 chapter step 0 时不变", () => {
    const chapters = makeChapters(["ch1", 3]);
    const { result } = renderHook(() => useStepper(chapters));
    act(() => result.current.prev());
    expect(result.current.cursor).toEqual({ chapter: 0, step: 0 });
  });

  it("连续 prev 跨越多 chapter", () => {
    const chapters = makeChapters(["ch1", 1], ["ch2", 1], ["ch3", 1]);
    const { result } = renderHook(() => useStepper(chapters));
    act(() => result.current.jumpToChapter(2, 0));
    act(() => result.current.prev()); // ch2
    act(() => result.current.prev()); // ch1
    expect(result.current.cursor).toEqual({ chapter: 0, step: 0 });
  });

  it("连续 prev 到开头保持不动", () => {
    const chapters = makeChapters(["ch1", 2], ["ch2", 2]);
    const { result } = renderHook(() => useStepper(chapters));
    act(() => result.current.prev());
    act(() => result.current.prev());
    expect(result.current.cursor).toEqual({ chapter: 0, step: 0 });
  });
});

// ═══════════════════════════════════════════════════════════
// 4. jumpToChapter()
// ═══════════════════════════════════════════════════════════
describe("4. jumpToChapter()", () => {
  it("跳转到指定 chapter 和 step", () => {
    const chapters = makeChapters(["ch1", 3], ["ch2", 2]);
    const { result } = renderHook(() => useStepper(chapters));
    act(() => result.current.jumpToChapter(1, 1));
    expect(result.current.cursor).toEqual({ chapter: 1, step: 1 });
  });

  it("默认 step 为 0", () => {
    const chapters = makeChapters(["ch1", 3], ["ch2", 2]);
    const { result } = renderHook(() => useStepper(chapters));
    act(() => result.current.jumpToChapter(1));
    expect(result.current.cursor).toEqual({ chapter: 1, step: 0 });
  });

  it("idx 越界（负数）时 clamp 到 0", () => {
    const chapters = makeChapters(["ch1", 3], ["ch2", 2]);
    const { result } = renderHook(() => useStepper(chapters));
    act(() => result.current.jumpToChapter(-5, 0));
    expect(result.current.cursor).toEqual({ chapter: 0, step: 0 });
  });

  it("idx 越界（超最大）时 clamp 到最后一个 chapter", () => {
    const chapters = makeChapters(["ch1", 3], ["ch2", 2]);
    const { result } = renderHook(() => useStepper(chapters));
    act(() => result.current.jumpToChapter(99));
    expect(result.current.cursor).toEqual({ chapter: 1, step: 0 });
  });

  it("step 越界时 clamp 到 chapter 内最大 step", () => {
    const chapters = makeChapters(["ch1", 3]);
    const { result } = renderHook(() => useStepper(chapters));
    act(() => result.current.jumpToChapter(0, 99));
    expect(result.current.cursor).toEqual({ chapter: 0, step: 2 });
  });

  it("step 为负数时 clamp 到 0", () => {
    const chapters = makeChapters(["ch1", 3]);
    const { result } = renderHook(() => useStepper(chapters));
    act(() => result.current.jumpToChapter(0, -1));
    expect(result.current.cursor).toEqual({ chapter: 0, step: 0 });
  });
});

// ═══════════════════════════════════════════════════════════
// 5. jumpToGlobal()
// ═══════════════════════════════════════════════════════════
describe("5. jumpToGlobal()", () => {
  it("跳转到第一个全局位置", () => {
    const chapters = makeChapters(["ch1", 3], ["ch2", 2]);
    const { result } = renderHook(() => useStepper(chapters));
    act(() => result.current.jumpToGlobal(0));
    expect(result.current.cursor).toEqual({ chapter: 0, step: 0 });
  });

  it("跳转到 chapter 1 的第一个 step（跨 chapter）", () => {
    const chapters = makeChapters(["ch1", 3], ["ch2", 2]);
    const { result } = renderHook(() => useStepper(chapters));
    act(() => result.current.jumpToGlobal(3));
    expect(result.current.cursor).toEqual({ chapter: 1, step: 0 });
  });

  it("跳转到 chapter 内中间 step", () => {
    const chapters = makeChapters(["ch1", 3], ["ch2", 2]);
    const { result } = renderHook(() => useStepper(chapters));
    act(() => result.current.jumpToGlobal(4));
    expect(result.current.cursor).toEqual({ chapter: 1, step: 1 });
  });

  it("跳转到最后一个全局位置", () => {
    const chapters = makeChapters(["ch1", 3], ["ch2", 2]);
    const { result } = renderHook(() => useStepper(chapters));
    act(() => result.current.jumpToGlobal(4)); // last = 3+2-1 = 4
    expect(result.current.cursor).toEqual({ chapter: 1, step: 1 });
  });

  it("g 越界（负数）时 clamp 到 0", () => {
    const chapters = makeChapters(["ch1", 3], ["ch2", 2]);
    const { result } = renderHook(() => useStepper(chapters));
    act(() => result.current.jumpToGlobal(-10));
    expect(result.current.cursor).toEqual({ chapter: 0, step: 0 });
  });

  it("g 越界（超最大）时 clamp 到最后一个位置", () => {
    const chapters = makeChapters(["ch1", 3], ["ch2", 2]);
    const { result } = renderHook(() => useStepper(chapters));
    act(() => result.current.jumpToGlobal(999));
    expect(result.current.cursor).toEqual({ chapter: 1, step: 1 });
  });

  it("全局索引在单 chapter 单 step 时只能为 0", () => {
    const chapters = makeChapters(["ch1", 1]);
    const { result } = renderHook(() => useStepper(chapters));
    act(() => result.current.jumpToGlobal(0));
    expect(result.current.cursor).toEqual({ chapter: 0, step: 0 });
  });

  it("3 个 chapter 各 2 步时 globalIndex 5 映射到 ch3 step1", () => {
    const chapters = makeChapters(["ch1", 2], ["ch2", 2], ["ch3", 2]);
    const { result } = renderHook(() => useStepper(chapters));
    act(() => result.current.jumpToGlobal(5));
    expect(result.current.cursor).toEqual({ chapter: 2, step: 1 });
  });
});

// ═══════════════════════════════════════════════════════════
// 6. computed values
// ═══════════════════════════════════════════════════════════
describe("6. computed values", () => {
  it("totalChapters 返回 chapters 数量", () => {
    const chapters = makeChapters(["ch1", 3], ["ch2", 2], ["ch3", 4]);
    const { result } = renderHook(() => useStepper(chapters));
    expect(result.current.totalChapters).toBe(3);
  });

  it("chapterTotalSteps 返回当前 chapter 的 narrations 数量", () => {
    const chapters = makeChapters(["ch1", 3], ["ch2", 5]);
    const { result } = renderHook(() => useStepper(chapters));
    expect(result.current.chapterTotalSteps).toBe(3);
    act(() => result.current.jumpToChapter(1));
    expect(result.current.chapterTotalSteps).toBe(5);
  });

  it("globalIndex 返回全局线性索引", () => {
    const chapters = makeChapters(["ch1", 3], ["ch2", 2]);
    const { result } = renderHook(() => useStepper(chapters));
    expect(result.current.globalIndex).toBe(0);
    act(() => result.current.next()); // step 1
    expect(result.current.globalIndex).toBe(1);
    act(() => result.current.next()); // step 2
    expect(result.current.globalIndex).toBe(2);
    act(() => result.current.next()); // ch2 step 0
    expect(result.current.globalIndex).toBe(3);
    act(() => result.current.next()); // ch2 step 1
    expect(result.current.globalIndex).toBe(4);
  });

  it("totalGlobal 返回所有 narrations 总数", () => {
    const chapters = makeChapters(["ch1", 3], ["ch2", 2], ["ch3", 4]);
    const { result } = renderHook(() => useStepper(chapters));
    expect(result.current.totalGlobal).toBe(9);
  });

  it("空 chapters 时 totalGlobal 为 0", () => {
    const { result } = renderHook(() => useStepper([]));
    expect(result.current.totalGlobal).toBe(0);
  });

  it("globalIndex 在空 chapters 时为 0", () => {
    const { result } = renderHook(() => useStepper([]));
    expect(result.current.globalIndex).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════
// 7. 键盘导航
// ═══════════════════════════════════════════════════════════
describe("7. 键盘导航", () => {
  it("ArrowRight 触发 next", () => {
    const chapters = makeChapters(["ch1", 3]);
    const { result } = renderHook(() => useStepper(chapters));
    act(() => fireKey("ArrowRight"));
    expect(result.current.cursor).toEqual({ chapter: 0, step: 1 });
  });

  it("Space 触发 next", () => {
    const chapters = makeChapters(["ch1", 3]);
    const { result } = renderHook(() => useStepper(chapters));
    act(() => fireKey(" "));
    expect(result.current.cursor).toEqual({ chapter: 0, step: 1 });
  });

  it("ArrowLeft 触发 prev", () => {
    const chapters = makeChapters(["ch1", 3]);
    const { result } = renderHook(() => useStepper(chapters));
    act(() => result.current.jumpToChapter(0, 2));
    act(() => fireKey("ArrowLeft"));
    expect(result.current.cursor).toEqual({ chapter: 0, step: 1 });
  });

  it("Backspace 触发 prev", () => {
    const chapters = makeChapters(["ch1", 3]);
    const { result } = renderHook(() => useStepper(chapters));
    act(() => result.current.jumpToChapter(0, 2));
    act(() => fireKey("Backspace"));
    expect(result.current.cursor).toEqual({ chapter: 0, step: 1 });
  });

  it("Home 跳转到第一个 chapter 第一个 step", () => {
    const chapters = makeChapters(["ch1", 3], ["ch2", 2]);
    const { result } = renderHook(() => useStepper(chapters));
    act(() => result.current.jumpToChapter(1, 1));
    act(() => fireKey("Home"));
    expect(result.current.cursor).toEqual({ chapter: 0, step: 0 });
  });

  it("End 跳转到最后一个 chapter 最后一个 step", () => {
    const chapters = makeChapters(["ch1", 3], ["ch2", 2]);
    const { result } = renderHook(() => useStepper(chapters));
    act(() => fireKey("End"));
    expect(result.current.cursor).toEqual({ chapter: 1, step: 1 });
  });

  it("数字键 1 跳转到 chapter 0", () => {
    const chapters = makeChapters(["ch1", 2], ["ch2", 2], ["ch3", 2]);
    const { result } = renderHook(() => useStepper(chapters));
    act(() => result.current.jumpToChapter(2, 0));
    act(() => fireKey("1"));
    expect(result.current.cursor).toEqual({ chapter: 0, step: 0 });
  });

  it("数字键 3 跳转到 chapter 2", () => {
    const chapters = makeChapters(["ch1", 2], ["ch2", 2], ["ch3", 2]);
    const { result } = renderHook(() => useStepper(chapters));
    act(() => fireKey("3"));
    expect(result.current.cursor).toEqual({ chapter: 2, step: 0 });
  });

  it("数字键超出 chapters 数量时不跳转", () => {
    const chapters = makeChapters(["ch1", 2]);
    const { result } = renderHook(() => useStepper(chapters));
    act(() => result.current.jumpToChapter(0, 1));
    act(() => fireKey("9"));
    expect(result.current.cursor).toEqual({ chapter: 0, step: 1 });
  });

  it("target 为 HTMLInputElement 时不触发导航", () => {
    const chapters = makeChapters(["ch1", 3]);
    const { result } = renderHook(() => useStepper(chapters));
    const input = document.createElement("input");
    act(() => fireKey("ArrowRight", input));
    expect(result.current.cursor).toEqual({ chapter: 0, step: 0 });
  });

  it("unmount 后不再响应键盘事件", () => {
    const chapters = makeChapters(["ch1", 3]);
    const { result, unmount } = renderHook(() => useStepper(chapters));
    unmount();
    act(() => fireKey("ArrowRight"));
    // cursor stays at 0 since hook is unmounted
    expect(result.current.cursor).toEqual({ chapter: 0, step: 0 });
  });

  it("不相关的键不触发任何操作", () => {
    const chapters = makeChapters(["ch1", 3]);
    const { result } = renderHook(() => useStepper(chapters));
    act(() => fireKey("a"));
    act(() => fireKey("Enter"));
    act(() => fireKey("Tab"));
    expect(result.current.cursor).toEqual({ chapter: 0, step: 0 });
  });
});

// ═══════════════════════════════════════════════════════════
// 8. localStorage 持久化
// ═══════════════════════════════════════════════════════════
describe("8. localStorage 持久化", () => {
  it("cursor 变化后写入 localStorage", () => {
    const chapters = makeChapters(["ch1", 3]);
    const { result } = renderHook(() => useStepper(chapters));
    act(() => result.current.next());
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored).toEqual({ chapter: 0, step: 1 });
  });

  it("jumpToChapter 后 localStorage 更新", () => {
    const chapters = makeChapters(["ch1", 3], ["ch2", 2]);
    const { result } = renderHook(() => useStepper(chapters));
    act(() => result.current.jumpToChapter(1, 1));
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored).toEqual({ chapter: 1, step: 1 });
  });

  it("新 hook 实例从 localStorage 恢复上次的 cursor", () => {
    const chapters = makeChapters(["ch1", 3], ["ch2", 2]);
    const { result: r1 } = renderHook(() => useStepper(chapters));
    act(() => r1.current.jumpToChapter(1, 1));
    r1.current.next(); // no act needed — state didn't change if already at end

    const { result: r2 } = renderHook(() => useStepper(chapters));
    expect(r2.current.cursor).toEqual({ chapter: 1, step: 1 });
  });

  it("localStorage 写入错误不抛异常", () => {
    const chapters = makeChapters(["ch1", 3]);
    const orig = localStorage.setItem;
    localStorage.setItem = () => {
      throw new Error("quota exceeded");
    };
    const { result } = renderHook(() => useStepper(chapters));
    expect(() => act(() => result.current.next())).not.toThrow();
    localStorage.setItem = orig;
  });
});

// ═══════════════════════════════════════════════════════════
// 9. chapters 变化时 re-sanitize
// ═══════════════════════════════════════════════════════════
describe("9. chapters 变化时 re-sanitize", () => {
  it("chapters 减少时 cursor 被 sanitize 到有效范围", () => {
    const chapters3 = makeChapters(["ch1", 3], ["ch2", 2], ["ch3", 4]);
    const chapters1 = makeChapters(["ch1", 3]);
    const { result, rerender } = renderHook(
      (ch) => useStepper(ch),
      { initialProps: chapters3 },
    );
    act(() => result.current.jumpToChapter(2, 3));
    rerender(chapters1);
    expect(result.current.cursor).toEqual({ chapter: 0, step: 2 });
  });

  it("chapters 的 narrations 减少时 step 被 sanitize", () => {
    const chA = makeChapters(["ch1", 5]);
    const chB = makeChapters(["ch1", 2]);
    const { result, rerender } = renderHook(
      (ch) => useStepper(ch),
      { initialProps: chA },
    );
    act(() => result.current.jumpToChapter(0, 4));
    rerender(chB);
    expect(result.current.cursor).toEqual({ chapter: 0, step: 1 });
  });

  it("cursor 在有效范围内时 chapters 变化不修改 cursor", () => {
    const chA = makeChapters(["ch1", 5], ["ch2", 3]);
    const chB = makeChapters(["ch1", 5], ["ch2", 3]);
    const { result, rerender } = renderHook(
      (ch) => useStepper(ch),
      { initialProps: chA },
    );
    act(() => result.current.jumpToChapter(1, 1));
    const prevCursor = { ...result.current.cursor };
    rerender(chB);
    expect(result.current.cursor).toEqual(prevCursor);
  });

  it("从空 chapters 切换到有 chapters 时 cursor 更新", () => {
    const chapters = makeChapters(["ch1", 3]);
    const { result, rerender } = renderHook(
      (ch) => useStepper(ch),
      { initialProps: [] as ChapterDef[] },
    );
    expect(result.current.cursor).toEqual({ chapter: 0, step: 0 });
    rerender(chapters);
    expect(result.current.cursor).toEqual({ chapter: 0, step: 0 });
    expect(result.current.totalChapters).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════
// 10. 边界情况
// ═══════════════════════════════════════════════════════════
describe("10. 边界情况", () => {
  it("单 chapter 单 step — next/prev 都不变", () => {
    const chapters = makeChapters(["ch1", 1]);
    const { result } = renderHook(() => useStepper(chapters));
    act(() => result.current.next());
    expect(result.current.cursor).toEqual({ chapter: 0, step: 0 });
    act(() => result.current.prev());
    expect(result.current.cursor).toEqual({ chapter: 0, step: 0 });
  });

  it("单 chapter 多 step — next/prev 在范围内正常", () => {
    const chapters = makeChapters(["ch1", 5]);
    const { result } = renderHook(() => useStepper(chapters));
    act(() => result.current.next()); // 1
    act(() => result.current.next()); // 2
    act(() => result.current.prev()); // 1
    expect(result.current.cursor).toEqual({ chapter: 0, step: 1 });
    expect(result.current.globalIndex).toBe(1);
  });

  it("jumpToGlobal 在 totalGlobal=0 时不崩溃", () => {
    const { result } = renderHook(() => useStepper([]));
    // totalGlobal=0, clamp(0, 0, -1) → 0, loop doesn't execute
    act(() => result.current.jumpToGlobal(0));
    expect(result.current.cursor).toEqual({ chapter: 0, step: 0 });
  });

  it("hook 返回的所有方法为函数", () => {
    const chapters = makeChapters(["ch1", 2]);
    const { result } = renderHook(() => useStepper(chapters));
    expect(typeof result.current.next).toBe("function");
    expect(typeof result.current.prev).toBe("function");
    expect(typeof result.current.jumpToChapter).toBe("function");
    expect(typeof result.current.jumpToGlobal).toBe("function");
  });

  it("Cursor 类型导出正确", () => {
    const c: Cursor = { chapter: 0, step: 0 };
    expect(c.chapter).toBe(0);
    expect(c.step).toBe(0);
  });

  it("StepperState 类型包含所有必要字段", () => {
    const chapters = makeChapters(["ch1", 2]);
    const { result } = renderHook(() => useStepper(chapters));
    const state: StepperState = result.current;
    expect(state).toHaveProperty("cursor");
    expect(state).toHaveProperty("totalChapters");
    expect(state).toHaveProperty("chapterTotalSteps");
    expect(state).toHaveProperty("globalIndex");
    expect(state).toHaveProperty("totalGlobal");
    expect(state).toHaveProperty("next");
    expect(state).toHaveProperty("prev");
    expect(state).toHaveProperty("jumpToChapter");
    expect(state).toHaveProperty("jumpToGlobal");
  });

  it("大量 chapters 时 computed values 正确", () => {
    const counts: [string, number][] = [];
    for (let i = 0; i < 50; i++) {
      counts.push([`ch${i}`, 3]);
    }
    const chapters = makeChapters(...counts);
    const { result } = renderHook(() => useStepper(chapters));
    expect(result.current.totalChapters).toBe(50);
    expect(result.current.totalGlobal).toBe(150);
    act(() => result.current.jumpToGlobal(75));
    expect(result.current.cursor).toEqual({ chapter: 25, step: 0 });
  });

  it("键盘 Space 阻止默认行为", () => {
    const chapters = makeChapters(["ch1", 3]);
    renderHook(() => useStepper(chapters));
    const event = new KeyboardEvent("keydown", { key: " ", bubbles: true });
    const spy = jest.spyOn(event, "preventDefault");
    window.dispatchEvent(event);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("localStorage 读取错误不抛异常", () => {
    const chapters = makeChapters(["ch1", 3]);
    const origGetItem = localStorage.getItem;
    localStorage.getItem = () => {
      throw new Error("access denied");
    };
    const { result } = renderHook(() => useStepper(chapters));
    expect(result.current.cursor).toEqual({ chapter: 0, step: 0 });
    localStorage.getItem = origGetItem;
  });
});
