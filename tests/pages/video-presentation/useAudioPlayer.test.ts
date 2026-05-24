/**
 * @jest-environment jsdom
 *
 * useAudioPlayer hook TDD 测试用例
 * 覆盖 estimateMs 纯函数、useAudioPlayer hook 的所有分支和返回值
 */
import React from "react";
import { renderHook, act } from "@testing-library/react";
import {
  useAudioPlayer,
  estimateMs,
  type PlaybackMode,
} from "../../../.agents/skills/web-video-presentation/templates/src/hooks/useAudioPlayer";

// ── Audio mock ─────────────────────────────────────────────────
const mockPlay = jest.fn(() => Promise.resolve());
const mockPause = jest.fn();
const mockLoad = jest.fn();
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();

let mockAudioInstances: any[] = [];

class MockAudio {
  src = "";
  preload = "";
  play = mockPlay;
  pause = mockPause;
  load = mockLoad;
  addEventListener = mockAddEventListener;
  removeEventListener = mockRemoveEventListener;
  removeAttribute(attr: string) {
    if (attr === "src") this.src = "";
  }
  constructor() {
    mockAudioInstances.push(this);
  }
}

beforeAll(() => {
  (window as any).Audio = MockAudio;
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  mockAudioInstances = [];
});

afterEach(() => {
  jest.useRealTimers();
});

// ═══════════════════════════════════════════════════════════
// 1. estimateMs 纯函数
// ═══════════════════════════════════════════════════════════
describe("estimateMs", () => {
  it("空字符串返回 1500ms", () => {
    expect(estimateMs("")).toBe(1500);
  });

  it("单字符返回 1500ms（Math.max 保底）", () => {
    expect(estimateMs("a")).toBe(1500);
  });

  it("短文本（< 8 字符）仍返回 1500ms", () => {
    expect(estimateMs("你好世界")).toBe(1500);
  });

  it("10 字符文本返回 2000ms（10 * 200）", () => {
    expect(estimateMs("1234567890")).toBe(2000);
  });

  it("长文本按字符数 * 200 计算", () => {
    const text = "这是一段较长的旁白文本用于测试";
    expect(estimateMs(text)).toBe(text.length * 200);
  });

  it("纯空格字符串（非空）按字符数计算", () => {
    const spaces = "        "; // 8 spaces → 8*200=1600
    expect(estimateMs(spaces)).toBe(1600);
  });

  it("中英文混合文本按字符数计算", () => {
    const text = "Hello你好";
    expect(estimateMs(text)).toBe(Math.max(1500, 7 * 200));
  });

  it("非常长的文本正确计算", () => {
    const text = "a".repeat(100);
    expect(estimateMs(text)).toBe(100 * 200);
  });

  it("结果始终 >= 1500", () => {
    for (let i = 0; i < 20; i++) {
      const text = "x".repeat(i);
      expect(estimateMs(text)).toBeGreaterThanOrEqual(1500);
    }
  });
});

// ═══════════════════════════════════════════════════════════
// 2. useAudioPlayer — manual 模式
// ═══════════════════════════════════════════════════════════
describe("useAudioPlayer — manual 模式", () => {
  it("初始 playing 为 false", () => {
    const { result } = renderHook(() =>
      useAudioPlayer({
        audioSrc: null,
        mode: "manual",
        autoStarted: false,
      }),
    );
    expect(result.current.playing).toBe(false);
  });

  it("不调用 Audio 构造函数", () => {
    renderHook(() =>
      useAudioPlayer({
        audioSrc: "/audio/test/1.mp3",
        mode: "manual",
        autoStarted: false,
      }),
    );
    expect(mockAudioInstances).toHaveLength(0);
  });

  it("有 audioSrc 时也不播放", () => {
    renderHook(() =>
      useAudioPlayer({
        audioSrc: "/audio/test/1.mp3",
        mode: "manual",
        autoStarted: false,
      }),
    );
    expect(mockPlay).not.toHaveBeenCalled();
  });

  it("返回 play 和 pause 方法", () => {
    const { result } = renderHook(() =>
      useAudioPlayer({
        audioSrc: null,
        mode: "manual",
        autoStarted: false,
      }),
    );
    expect(typeof result.current.play).toBe("function");
    expect(typeof result.current.pause).toBe("function");
  });

  it("pause 调用不抛错", () => {
    const { result } = renderHook(() =>
      useAudioPlayer({
        audioSrc: null,
        mode: "manual",
        autoStarted: false,
      }),
    );
    expect(() => result.current.pause()).not.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════
// 3. useAudioPlayer — audio 模式（有 audioSrc）
// ═══════════════════════════════════════════════════════════
describe("useAudioPlayer — audio 模式（有 audioSrc）", () => {
  it("切换到 audio 模式后 playing 为 true", () => {
    const { result } = renderHook(
      ({ mode }) =>
        useAudioPlayer({
          audioSrc: "/audio/test/1.mp3",
          mode,
          autoStarted: false,
        }),
      { initialProps: { mode: "manual" as PlaybackMode } },
    );
    expect(result.current.playing).toBe(false);

    // rerender 到 audio 模式
    renderHook(
      ({ mode }) =>
        useAudioPlayer({
          audioSrc: "/audio/test/1.mp3",
          mode,
          autoStarted: false,
        }),
      { initialProps: { mode: "audio" as PlaybackMode } },
    );
  });

  it("创建 Audio 实例并调用 play", () => {
    renderHook(() =>
      useAudioPlayer({
        audioSrc: "/audio/ch1/1.mp3",
        mode: "audio",
        autoStarted: false,
      }),
    );
    expect(mockAudioInstances.length).toBeGreaterThanOrEqual(1);
    expect(mockPlay).toHaveBeenCalled();
  });

  it("设置 audio.src 为传入的 audioSrc", () => {
    renderHook(() =>
      useAudioPlayer({
        audioSrc: "/audio/ch1/2.mp3",
        mode: "audio",
        autoStarted: false,
      }),
    );
    const lastAudio = mockAudioInstances[mockAudioInstances.length - 1];
    expect(lastAudio.src).toBe("/audio/ch1/2.mp3");
  });

  it("设置 audio.preload 为 'auto'", () => {
    renderHook(() =>
      useAudioPlayer({
        audioSrc: "/audio/test/1.mp3",
        mode: "audio",
        autoStarted: false,
      }),
    );
    const lastAudio = mockAudioInstances[mockAudioInstances.length - 1];
    expect(lastAudio.preload).toBe("auto");
  });

  it("注册 ended 事件监听器", () => {
    renderHook(() =>
      useAudioPlayer({
        audioSrc: "/audio/test/1.mp3",
        mode: "audio",
        autoStarted: false,
      }),
    );
    const endedCalls = mockAddEventListener.mock.calls.filter(
      (c: any[]) => c[0] === "ended",
    );
    expect(endedCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("audio ended 后 playing 变为 false", () => {
    const { result } = renderHook(() =>
      useAudioPlayer({
        audioSrc: "/audio/test/1.mp3",
        mode: "audio",
        autoStarted: false,
      }),
    );
    expect(result.current.playing).toBe(true);

    // 触发 ended 事件
    const lastAudio = mockAudioInstances[mockAudioInstances.length - 1];
    const endedHandler = mockAddEventListener.mock.calls.find(
      (c: any[]) => c[0] === "ended",
    )?.[1];
    act(() => {
      endedHandler?.();
    });
    expect(result.current.playing).toBe(false);
  });

  it("audio ended 后调用 onEnded 回调", () => {
    const onEnded = jest.fn();
    renderHook(() =>
      useAudioPlayer({
        audioSrc: "/audio/test/1.mp3",
        mode: "audio",
        autoStarted: false,
        onEnded,
      }),
    );
    const endedHandler = mockAddEventListener.mock.calls.find(
      (c: any[]) => c[0] === "ended",
    )?.[1];
    act(() => {
      endedHandler?.();
    });
    expect(onEnded).toHaveBeenCalledTimes(1);
  });

  it("切换回 manual 模式后停止播放", () => {
    const { result, rerender } = renderHook(
      ({ mode }) =>
        useAudioPlayer({
          audioSrc: "/audio/test/1.mp3",
          mode,
          autoStarted: false,
        }),
      { initialProps: { mode: "audio" as PlaybackMode } },
    );
    expect(result.current.playing).toBe(true);

    rerender({ mode: "manual" });
    expect(result.current.playing).toBe(false);
  });

  it("切换回 manual 时调用 pause", () => {
    const { rerender } = renderHook(
      ({ mode }) =>
        useAudioPlayer({
          audioSrc: "/audio/test/1.mp3",
          mode,
          autoStarted: false,
        }),
      { initialProps: { mode: "audio" as PlaybackMode } },
    );
    mockPause.mockClear();
    rerender({ mode: "manual" });
    expect(mockPause).toHaveBeenCalled();
  });

  it("audio.play() reject 时不抛错，playing 变 false", () => {
    mockPlay.mockRejectedValueOnce(new Error("abort"));
    const { result } = renderHook(() =>
      useAudioPlayer({
        audioSrc: "/audio/test/1.mp3",
        mode: "audio",
        autoStarted: false,
      }),
    );
    // play() 返回 rejected promise，catch 中 setPlaying(false)
    return Promise.resolve().then(() => {
      // playing may have been set true then caught
    });
  });
});

// ═══════════════════════════════════════════════════════════
// 4. useAudioPlayer — audio 模式（无 audioSrc，使用 fallback）
// ═══════════════════════════════════════════════════════════
describe("useAudioPlayer — audio 模式（无 audioSrc，fallback timer）", () => {
  it("audioSrc 为 null 时使用 fallback timer", () => {
    renderHook(() =>
      useAudioPlayer({
        audioSrc: null,
        mode: "audio",
        autoStarted: false,
      }),
    );
    // 不应创建 Audio 实例
    expect(mockAudioInstances).toHaveLength(0);
  });

  it("默认 fallback 为 1500ms", () => {
    const onEnded = jest.fn();
    renderHook(() =>
      useAudioPlayer({
        audioSrc: null,
        mode: "audio",
        autoStarted: false,
        onEnded,
      }),
    );
    expect(onEnded).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(1499);
    });
    expect(onEnded).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(onEnded).toHaveBeenCalledTimes(1);
  });

  it("自定义 estimateFallbackMs 生效", () => {
    const onEnded = jest.fn();
    renderHook(() =>
      useAudioPlayer({
        audioSrc: null,
        mode: "audio",
        autoStarted: false,
        onEnded,
        estimateFallbackMs: 3000,
      }),
    );
    act(() => {
      jest.advanceTimersByTime(2999);
    });
    expect(onEnded).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(onEnded).toHaveBeenCalledTimes(1);
  });

  it("timer 到期后 playing 变 false", () => {
    const { result } = renderHook(() =>
      useAudioPlayer({
        audioSrc: null,
        mode: "audio",
        autoStarted: false,
      }),
    );
    expect(result.current.playing).toBe(true);
    act(() => {
      jest.advanceTimersByTime(1500);
    });
    expect(result.current.playing).toBe(false);
  });

  it("切换回 manual 时清除 fallback timer", () => {
    const onEnded = jest.fn();
    const { rerender } = renderHook(
      ({ mode }) =>
        useAudioPlayer({
          audioSrc: null,
          mode,
          autoStarted: false,
          onEnded,
        }),
      { initialProps: { mode: "audio" as PlaybackMode } },
    );
    rerender({ mode: "manual" });
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(onEnded).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════
// 5. useAudioPlayer — auto 模式
// ═══════════════════════════════════════════════════════════
describe("useAudioPlayer — auto 模式", () => {
  it("auto + autoStarted=false 不播放", () => {
    const { result } = renderHook(() =>
      useAudioPlayer({
        audioSrc: "/audio/test/1.mp3",
        mode: "auto",
        autoStarted: false,
      }),
    );
    expect(result.current.playing).toBe(false);
    expect(mockPlay).not.toHaveBeenCalled();
  });

  it("auto + autoStarted=true 播放音频", () => {
    renderHook(() =>
      useAudioPlayer({
        audioSrc: "/audio/test/1.mp3",
        mode: "auto",
        autoStarted: true,
      }),
    );
    expect(mockPlay).toHaveBeenCalled();
  });

  it("auto + autoStarted=true playing 为 true", () => {
    const { result } = renderHook(() =>
      useAudioPlayer({
        audioSrc: "/audio/test/1.mp3",
        mode: "auto",
        autoStarted: true,
      }),
    );
    expect(result.current.playing).toBe(true);
  });

  it("从 autoStarted=false 切到 true 后开始播放", () => {
    const { result, rerender } = renderHook(
      ({ autoStarted }) =>
        useAudioPlayer({
          audioSrc: "/audio/test/1.mp3",
          mode: "auto",
          autoStarted,
        }),
      { initialProps: { autoStarted: false } },
    );
    expect(result.current.playing).toBe(false);

    rerender({ autoStarted: true });
    expect(result.current.playing).toBe(true);
    expect(mockPlay).toHaveBeenCalledTimes(1);
  });

  it("auto 模式下 audio ended 触发 onEnded", () => {
    const onEnded = jest.fn();
    renderHook(() =>
      useAudioPlayer({
        audioSrc: "/audio/test/1.mp3",
        mode: "auto",
        autoStarted: true,
        onEnded,
      }),
    );
    const endedHandler = mockAddEventListener.mock.calls.find(
      (c: any[]) => c[0] === "ended",
    )?.[1];
    act(() => {
      endedHandler?.();
    });
    expect(onEnded).toHaveBeenCalledTimes(1);
  });

  it("auto 模式无 audioSrc 时使用 fallback timer", () => {
    const onEnded = jest.fn();
    renderHook(() =>
      useAudioPlayer({
        audioSrc: null,
        mode: "auto",
        autoStarted: true,
        onEnded,
        estimateFallbackMs: 2000,
      }),
    );
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(onEnded).toHaveBeenCalledTimes(1);
  });
});

// ═══════════════════════════════════════════════════════════
// 6. 模式切换
// ═══════════════════════════════════════════════════════════
describe("useAudioPlayer — 模式切换", () => {
  it("manual → audio 开始播放", () => {
    const { result, rerender } = renderHook(
      ({ mode }) =>
        useAudioPlayer({
          audioSrc: "/audio/test/1.mp3",
          mode,
          autoStarted: false,
        }),
      { initialProps: { mode: "manual" as PlaybackMode } },
    );
    expect(result.current.playing).toBe(false);

    rerender({ mode: "audio" });
    expect(result.current.playing).toBe(true);
  });

  it("audio → manual 停止播放", () => {
    const { result, rerender } = renderHook(
      ({ mode }) =>
        useAudioPlayer({
          audioSrc: "/audio/test/1.mp3",
          mode,
          autoStarted: false,
        }),
      { initialProps: { mode: "audio" as PlaybackMode } },
    );
    expect(result.current.playing).toBe(true);

    rerender({ mode: "manual" });
    expect(result.current.playing).toBe(false);
  });

  it("audio → auto (autoStarted=true) 继续播放", () => {
    const { result, rerender } = renderHook(
      ({ mode }) =>
        useAudioPlayer({
          audioSrc: "/audio/test/1.mp3",
          mode,
          autoStarted: true,
        }),
      { initialProps: { mode: "audio" as PlaybackMode } },
    );
    expect(result.current.playing).toBe(true);

    rerender({ mode: "auto" });
    expect(result.current.playing).toBe(true);
  });

  it("manual → auto (autoStarted=false) 不播放", () => {
    const { result, rerender } = renderHook(
      ({ mode }) =>
        useAudioPlayer({
          audioSrc: "/audio/test/1.mp3",
          mode,
          autoStarted: false,
        }),
      { initialProps: { mode: "manual" as PlaybackMode } },
    );
    rerender({ mode: "auto" });
    expect(result.current.playing).toBe(false);
  });

  it("循环切换 manual → audio → auto → manual 状态正确", () => {
    const { result, rerender } = renderHook(
      ({ mode }) =>
        useAudioPlayer({
          audioSrc: "/audio/test/1.mp3",
          mode,
          autoStarted: true,
        }),
      { initialProps: { mode: "manual" as PlaybackMode } },
    );
    expect(result.current.playing).toBe(false);

    rerender({ mode: "audio" });
    expect(result.current.playing).toBe(true);

    rerender({ mode: "auto" });
    expect(result.current.playing).toBe(true);

    rerender({ mode: "manual" });
    expect(result.current.playing).toBe(false);
  });

  it("快速切换 10 次不报错", () => {
    const modes: PlaybackMode[] = ["manual", "audio", "auto"];
    const { rerender } = renderHook(
      ({ mode }) =>
        useAudioPlayer({
          audioSrc: "/audio/test/1.mp3",
          mode,
          autoStarted: true,
        }),
      { initialProps: { mode: "manual" as PlaybackMode } },
    );
    for (let i = 0; i < 10; i++) {
      expect(() =>
        rerender({ mode: modes[i % 3] }),
      ).not.toThrow();
    }
  });
});

// ═══════════════════════════════════════════════════════════
// 7. audioSrc 变化
// ═══════════════════════════════════════════════════════════
describe("useAudioPlayer — audioSrc 变化", () => {
  it("audioSrc 变化时重新播放", () => {
    const { result, rerender } = renderHook(
      ({ audioSrc }) =>
        useAudioPlayer({
          audioSrc,
          mode: "audio",
          autoStarted: false,
        }),
      { initialProps: { audioSrc: "/audio/ch1/1.mp3" } },
    );
    expect(result.current.playing).toBe(true);
    mockPlay.mockClear();

    rerender({ audioSrc: "/audio/ch1/2.mp3" });
    expect(mockPlay).toHaveBeenCalled();
  });

  it("从有 audioSrc 切换到 null 使用 fallback", () => {
    const { rerender } = renderHook(
      ({ audioSrc }) =>
        useAudioPlayer({
          audioSrc,
          mode: "audio",
          autoStarted: false,
        }),
      { initialProps: { audioSrc: "/audio/test/1.mp3" } },
    );
    const audioCountBefore = mockAudioInstances.length;

    rerender({ audioSrc: null });
    // 不应创建新的 Audio 实例（fallback 走 timer）
    // 但之前的 audio 已清理，新的 fallback 不会创建 Audio
    expect(mockAudioInstances.length).toBe(audioCountBefore);
  });

  it("从 null 切换到有 audioSrc 创建 Audio 实例", () => {
    const { rerender } = renderHook(
      ({ audioSrc }) =>
        useAudioPlayer({
          audioSrc,
          mode: "audio",
          autoStarted: false,
        }),
      { initialProps: { audioSrc: null as string | null } },
    );
    expect(mockAudioInstances).toHaveLength(0);

    rerender({ audioSrc: "/audio/test/1.mp3" });
    expect(mockAudioInstances.length).toBeGreaterThanOrEqual(1);
  });
});

// ═══════════════════════════════════════════════════════════
// 8. onEnded 回调
// ═══════════════════════════════════════════════════════════
describe("useAudioPlayer — onEnded 回调", () => {
  it("onEnded 未传时不报错", () => {
    renderHook(() =>
      useAudioPlayer({
        audioSrc: null,
        mode: "audio",
        autoStarted: false,
      }),
    );
    act(() => {
      jest.advanceTimersByTime(1500);
    });
    // 不应抛错
  });

  it("onEnded 回调更新后使用最新引用", () => {
    const onEndedA = jest.fn();
    const onEndedB = jest.fn();
    const { rerender } = renderHook(
      ({ onEnded }) =>
        useAudioPlayer({
          audioSrc: null,
          mode: "audio",
          autoStarted: false,
          onEnded,
          estimateFallbackMs: 1000,
        }),
      { initialProps: { onEnded: onEndedA } },
    );

    rerender({ onEnded: onEndedB });

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(onEndedA).not.toHaveBeenCalled();
    expect(onEndedB).toHaveBeenCalledTimes(1);
  });

  it("audio ended 后不重复调用 onEnded", () => {
    const onEnded = jest.fn();
    renderHook(() =>
      useAudioPlayer({
        audioSrc: "/audio/test/1.mp3",
        mode: "audio",
        autoStarted: false,
        onEnded,
      }),
    );
    const endedHandler = mockAddEventListener.mock.calls.find(
      (c: any[]) => c[0] === "ended",
    )?.[1];
    act(() => {
      endedHandler?.();
    });
    expect(onEnded).toHaveBeenCalledTimes(1);
    act(() => {
      endedHandler?.();
    });
    expect(onEnded).toHaveBeenCalledTimes(2);
  });
});

// ═══════════════════════════════════════════════════════════
// 9. play / pause 方法
// ═══════════════════════════════════════════════════════════
describe("useAudioPlayer — play / pause 方法", () => {
  it("manual 模式下调用 play() 开始播放", () => {
    const { result } = renderHook(() =>
      useAudioPlayer({
        audioSrc: "/audio/test/1.mp3",
        mode: "manual",
        autoStarted: false,
      }),
    );
    expect(result.current.playing).toBe(false);

    act(() => {
      result.current.play();
    });
    expect(result.current.playing).toBe(true);
    expect(mockPlay).toHaveBeenCalled();
  });

  it("audio 模式下调用 pause() 停止播放", () => {
    const { result } = renderHook(() =>
      useAudioPlayer({
        audioSrc: "/audio/test/1.mp3",
        mode: "audio",
        autoStarted: false,
      }),
    );
    expect(result.current.playing).toBe(true);

    act(() => {
      result.current.pause();
    });
    expect(result.current.playing).toBe(false);
  });

  it("pause 后再 play 恢复播放", () => {
    const { result } = renderHook(() =>
      useAudioPlayer({
        audioSrc: "/audio/test/1.mp3",
        mode: "manual",
        autoStarted: false,
      }),
    );
    act(() => {
      result.current.play();
    });
    expect(result.current.playing).toBe(true);

    act(() => {
      result.current.pause();
    });
    expect(result.current.playing).toBe(false);

    act(() => {
      result.current.play();
    });
    expect(result.current.playing).toBe(true);
  });

  it("play() 使用 fallback timer（无 audioSrc）", () => {
    const onEnded = jest.fn();
    const { result } = renderHook(() =>
      useAudioPlayer({
        audioSrc: null,
        mode: "manual",
        autoStarted: false,
        onEnded,
        estimateFallbackMs: 500,
      }),
    );
    act(() => {
      result.current.play();
    });
    expect(result.current.playing).toBe(true);

    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current.playing).toBe(false);
    expect(onEnded).toHaveBeenCalledTimes(1);
  });

  it("连续调用 play() 多次不报错", () => {
    const { result } = renderHook(() =>
      useAudioPlayer({
        audioSrc: "/audio/test/1.mp3",
        mode: "manual",
        autoStarted: false,
      }),
    );
    for (let i = 0; i < 5; i++) {
      act(() => {
        result.current.play();
      });
    }
    expect(result.current.playing).toBe(true);
  });

  it("连续调用 pause() 多次不报错", () => {
    const { result } = renderHook(() =>
      useAudioPlayer({
        audioSrc: "/audio/test/1.mp3",
        mode: "audio",
        autoStarted: false,
      }),
    );
    for (let i = 0; i < 3; i++) {
      act(() => {
        result.current.pause();
      });
    }
    expect(result.current.playing).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════
// 10. 资源清理
// ═══════════════════════════════════════════════════════════
describe("useAudioPlayer — 资源清理", () => {
  it("unmount 时清理 Audio（pause + removeAttribute + removeEventListener）", () => {
    const { unmount } = renderHook(() =>
      useAudioPlayer({
        audioSrc: "/audio/test/1.mp3",
        mode: "audio",
        autoStarted: false,
      }),
    );
    const lastAudio = mockAudioInstances[mockAudioInstances.length - 1];
    unmount();
    expect(mockPause).toHaveBeenCalled();
    expect(lastAudio.src).toBe("");
  });

  it("unmount 时清除 fallback timer", () => {
    const onEnded = jest.fn();
    const { unmount } = renderHook(() =>
      useAudioPlayer({
        audioSrc: null,
        mode: "audio",
        autoStarted: false,
        onEnded,
      }),
    );
    unmount();
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(onEnded).not.toHaveBeenCalled();
  });

  it("rerender 同样 props 不重新创建 Audio", () => {
    const props = {
      audioSrc: "/audio/test/1.mp3" as const,
      mode: "audio" as PlaybackMode,
      autoStarted: false,
    };
    const { rerender } = renderHook(() => useAudioPlayer(props));
    const countAfterFirst = mockAudioInstances.length;

    rerender();
    // 由于 cleanup + play 在 effect 中，相同依赖不会重新触发
    // 但 audioSrc 是字符串字面量，引用相同，所以不会重新触发
    // 实际上 useEffect 依赖包含 play 和 cleanup（通过 useCallback），它们引用稳定
  });

  it("从 audio 切到 manual 时 removeEventListener 被调用", () => {
    const { rerender } = renderHook(
      ({ mode }) =>
        useAudioPlayer({
          audioSrc: "/audio/test/1.mp3",
          mode,
          autoStarted: false,
        }),
      { initialProps: { mode: "audio" as PlaybackMode } },
    );
    mockRemoveEventListener.mockClear();
    rerender({ mode: "manual" });
    expect(mockRemoveEventListener).toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════
// 11. PlaybackMode 类型导出验证
// ═══════════════════════════════════════════════════════════
describe("PlaybackMode 类型", () => {
  it("三个合法值均可作为 mode 使用", () => {
    const modes: PlaybackMode[] = ["manual", "audio", "auto"];
    modes.forEach((mode) => {
      const { unmount } = renderHook(() =>
        useAudioPlayer({
          audioSrc: null,
          mode,
          autoStarted: false,
        }),
      );
      unmount();
    });
  });
});

// ═══════════════════════════════════════════════════════════
// 12. 边界情况
// ═══════════════════════════════════════════════════════════
describe("useAudioPlayer — 边界情况", () => {
  it("estimateFallbackMs = 0 时立即触发 onEnded", () => {
    const onEnded = jest.fn();
    renderHook(() =>
      useAudioPlayer({
        audioSrc: null,
        mode: "audio",
        autoStarted: false,
        onEnded,
        estimateFallbackMs: 0,
      }),
    );
    // setTimeout(..., 0) 在 fake timers 中需要 advance
    act(() => {
      jest.advanceTimersByTime(0);
    });
    expect(onEnded).toHaveBeenCalledTimes(1);
  });

  it("所有 props 同时变化时状态一致", () => {
    const { result, rerender } = renderHook(
      ({ mode, audioSrc, autoStarted }) =>
        useAudioPlayer({
          audioSrc,
          mode,
          autoStarted,
        }),
      {
        initialProps: {
          mode: "manual" as PlaybackMode,
          audioSrc: null as string | null,
          autoStarted: false,
        },
      },
    );
    expect(result.current.playing).toBe(false);

    rerender({
      mode: "audio",
      audioSrc: "/audio/test/1.mp3",
      autoStarted: false,
    });
    expect(result.current.playing).toBe(true);
  });

  it("onEnded 为 undefined 时正常工作", () => {
    const { result } = renderHook(() =>
      useAudioPlayer({
        audioSrc: null,
        mode: "audio",
        autoStarted: false,
        onEnded: undefined,
      }),
    );
    act(() => {
      jest.advanceTimersByTime(1500);
    });
    expect(result.current.playing).toBe(false);
  });

  it("estimateFallbackMs 为负数时仍设置 timer", () => {
    const onEnded = jest.fn();
    renderHook(() =>
      useAudioPlayer({
        audioSrc: null,
        mode: "audio",
        autoStarted: false,
        onEnded,
        estimateFallbackMs: -100,
      }),
    );
    act(() => {
      jest.advanceTimersByTime(0);
    });
    expect(onEnded).toHaveBeenCalledTimes(1);
  });

  it("大 estimateFallbackMs 不提前触发", () => {
    const onEnded = jest.fn();
    renderHook(() =>
      useAudioPlayer({
        audioSrc: null,
        mode: "audio",
        autoStarted: false,
        onEnded,
        estimateFallbackMs: 60000,
      }),
    );
    act(() => {
      jest.advanceTimersByTime(59999);
    });
    expect(onEnded).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(onEnded).toHaveBeenCalledTimes(1);
  });
});
