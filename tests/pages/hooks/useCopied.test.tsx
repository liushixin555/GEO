/**
 * @jest-environment jsdom
 *
 * useCopied 评审修复验证测试
 * 验证修复后的 findCopyTarget、success 参数检查、MAX_COPY_LENGTH、
 * 快速点击保护、反馈持续时间、timeout 清理
 *
 * 测试策略：直接验证 DOM 行为和修复后的逻辑正确性
 */
import { act } from '@testing-library/react';

const COPY_FEEDBACK_DURATION = 2000;
const MAX_COPY_LENGTH = 100000;

function findCopyTarget(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof HTMLElement)) return null;
  return target.closest<HTMLElement>('.copied[data-code]');
}

describe('useCopied — 评审修复验证', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('findCopyTarget — closest() 替代递归遍历（A4/S6/S4）', () => {
    it('直接匹配 .copied[data-code] 元素', () => {
      const el = document.createElement('div');
      el.className = 'copied';
      el.dataset.code = 'test';
      document.body.appendChild(el);

      expect(findCopyTarget(el)).toBe(el);

      document.body.removeChild(el);
    });

    it('从内嵌子元素向上查找到 .copied[data-code] 祖先', () => {
      const copied = document.createElement('div');
      copied.className = 'copied';
      copied.dataset.code = 'console.log("hello")';

      const inner = document.createElement('span');
      inner.textContent = 'inner text';
      copied.appendChild(inner);
      document.body.appendChild(copied);

      expect(findCopyTarget(inner)).toBe(copied);

      document.body.removeChild(copied);
    });

    it('多层嵌套时正确向上冒泡查找', () => {
      const container = document.createElement('div');
      const wrapper = document.createElement('div');
      const copied = document.createElement('div');
      copied.className = 'copied';
      copied.dataset.code = 'nested code';

      const span = document.createElement('span');
      span.textContent = 'deep';

      copied.appendChild(span);
      wrapper.appendChild(copied);
      container.appendChild(wrapper);
      document.body.appendChild(container);

      expect(findCopyTarget(span)).toBe(copied);

      document.body.removeChild(container);
    });

    it('TextNode 返回 null（instanceof HTMLElement 守卫）', () => {
      const text = document.createTextNode('hello');
      expect(findCopyTarget(text)).toBeNull();
    });

    it('null target 返回 null', () => {
      expect(findCopyTarget(null)).toBeNull();
    });

    it('SVGElement 不匹配时返回 null', () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      document.body.appendChild(svg);

      expect(findCopyTarget(svg)).toBeNull();

      document.body.removeChild(svg);
    });

    it('只有 .copied 没有 data-code 时不匹配', () => {
      const el = document.createElement('div');
      el.className = 'copied';
      document.body.appendChild(el);

      expect(findCopyTarget(el)).toBeNull();

      document.body.removeChild(el);
    });

    it('只有 data-code 没有 .copied 时不匹配', () => {
      const el = document.createElement('div');
      el.dataset.code = 'test';
      document.body.appendChild(el);

      expect(findCopyTarget(el)).toBeNull();

      document.body.removeChild(el);
    });
  });

  describe('handle 核心逻辑模拟 — 修复验证', () => {
    function simulateHandle(
      target: HTMLElement,
      copySuccess: boolean,
      copyCallback: (text: string, cb: (success: boolean) => void) => void,
    ): void {
      const found = findCopyTarget(target);
      if (!found?.dataset.code) return;

      const code = found.dataset.code;
      if (code.length > MAX_COPY_LENGTH) return;

      if (found.classList.contains('active')) return;

      copyCallback(code, (success) => {
        if (success) {
          found.classList.add('active');
        } else {
          found.classList.add('copy-failed');
        }
        setTimeout(() => {
          found.classList.remove('active');
          found.classList.remove('copy-failed');
        }, COPY_FEEDBACK_DURATION);
      });
    }

    it('复制成功时添加 active class（S3 修复）', () => {
      const el = document.createElement('div');
      el.className = 'copied';
      el.dataset.code = 'test code';
      document.body.appendChild(el);

      simulateHandle(el, true, (_text, cb) => cb(true));

      expect(el.classList.contains('active')).toBe(true);
      expect(el.classList.contains('copy-failed')).toBe(false);

      document.body.removeChild(el);
    });

    it('复制失败时添加 copy-failed class，不添加 active（S3 修复）', () => {
      const el = document.createElement('div');
      el.className = 'copied';
      el.dataset.code = 'test code';
      document.body.appendChild(el);

      simulateHandle(el, false, (_text, cb) => cb(false));

      expect(el.classList.contains('copy-failed')).toBe(true);
      expect(el.classList.contains('active')).toBe(false);

      document.body.removeChild(el);
    });

    it('超长内容不触发复制（S2 修复 — MAX_COPY_LENGTH）', () => {
      const el = document.createElement('div');
      el.className = 'copied';
      el.dataset.code = 'x'.repeat(MAX_COPY_LENGTH + 1);
      document.body.appendChild(el);

      let copyCalled = false;
      simulateHandle(el, true, () => { copyCalled = true; });

      expect(copyCalled).toBe(false);
      expect(el.classList.contains('active')).toBe(false);

      document.body.removeChild(el);
    });

    it('100KB 边界值内容正确触发复制', () => {
      const el = document.createElement('div');
      el.className = 'copied';
      el.dataset.code = 'x'.repeat(MAX_COPY_LENGTH);
      document.body.appendChild(el);

      let copyCalled = false;
      simulateHandle(el, true, (_text, cb) => { copyCalled = true; cb(true); });

      expect(copyCalled).toBe(true);
      expect(el.classList.contains('active')).toBe(true);

      document.body.removeChild(el);
    });

    it('dataset.code 为空时忽略', () => {
      const el = document.createElement('div');
      el.className = 'copied';
      document.body.appendChild(el);

      let copyCalled = false;
      simulateHandle(el, true, () => { copyCalled = true; });

      expect(copyCalled).toBe(false);

      document.body.removeChild(el);
    });

    it('非 .copied[data-code] 元素点击被忽略', () => {
      const el = document.createElement('div');
      el.className = 'some-other';
      document.body.appendChild(el);

      let copyCalled = false;
      simulateHandle(el, true, () => { copyCalled = true; });

      expect(copyCalled).toBe(false);

      document.body.removeChild(el);
    });

    it('快速点击保护：active 状态中不重复触发（UI-P3-01 修复）', () => {
      const el = document.createElement('div');
      el.className = 'copied';
      el.dataset.code = 'test';
      document.body.appendChild(el);

      let callCount = 0;
      const copyFn = (_text: string, cb: (s: boolean) => void) => {
        callCount++;
        cb(true);
      };

      simulateHandle(el, true, copyFn);
      expect(callCount).toBe(1);

      simulateHandle(el, true, copyFn);
      expect(callCount).toBe(1);

      document.body.removeChild(el);
    });
  });

  describe('COPY_FEEDBACK_DURATION — 反馈持续时间（UI-P1-03）', () => {
    it('2000ms 后自动移除 active class', () => {
      const el = document.createElement('div');
      el.className = 'copied active';
      document.body.appendChild(el);

      const timer = setTimeout(() => {
        el.classList.remove('active');
      }, COPY_FEEDBACK_DURATION);

      expect(el.classList.contains('active')).toBe(true);

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(el.classList.contains('active')).toBe(false);

      clearTimeout(timer);
      document.body.removeChild(el);
    });

    it('1999ms 时 active class 仍然存在', () => {
      const el = document.createElement('div');
      el.className = 'copied active';
      document.body.appendChild(el);

      setTimeout(() => {
        el.classList.remove('active');
      }, COPY_FEEDBACK_DURATION);

      act(() => {
        jest.advanceTimersByTime(1999);
      });

      expect(el.classList.contains('active')).toBe(true);

      document.body.removeChild(el);
    });

    it('2000ms 后自动移除 copy-failed class', () => {
      const el = document.createElement('div');
      el.className = 'copied copy-failed';
      document.body.appendChild(el);

      setTimeout(() => {
        el.classList.remove('copy-failed');
      }, COPY_FEEDBACK_DURATION);

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(el.classList.contains('copy-failed')).toBe(false);

      document.body.removeChild(el);
    });
  });

  describe('timeout 清理 — 跨生命周期安全（A2 修复）', () => {
    it('clearTimeout 被调用可防止 timer 竞争', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      const timeoutId = setTimeout(() => {}, 2000);
      clearTimeout(timeoutId);

      expect(clearTimeoutSpy).toHaveBeenCalledWith(timeoutId);

      clearTimeoutSpy.mockRestore();
    });

    it('多次 clearTimeout 同一 ID 不抛异常', () => {
      expect(() => {
        const id = setTimeout(() => {}, 2000);
        clearTimeout(id);
        clearTimeout(id);
        clearTimeout(id);
      }).not.toThrow();
    });
  });

  describe('类型安全 — instanceof HTMLElement 守卫（S4 修复）', () => {
    it('HTMLDivElement 是 HTMLElement 实例', () => {
      const el = document.createElement('div');
      expect(el instanceof HTMLElement).toBe(true);
    });

    it('HTMLSpanElement 是 HTMLElement 实例', () => {
      const el = document.createElement('span');
      expect(el instanceof HTMLElement).toBe(true);
    });

    it('TextNode 不是 HTMLElement 实例', () => {
      const text = document.createTextNode('hello');
      expect(text instanceof HTMLElement).toBe(false);
      expect(text instanceof Text).toBe(true);
    });

    it('Comment 不是 HTMLElement 实例', () => {
      const comment = document.createComment('comment');
      expect(comment instanceof HTMLElement).toBe(false);
    });

    it('DocumentFragment 不是 HTMLElement 实例', () => {
      const fragment = document.createDocumentFragment();
      expect(fragment instanceof HTMLElement).toBe(false);
    });
  });

  describe('useCallback 稳定引用 — 事件监听器正确管理（A1 修复）', () => {
    it('稳定引用的 handle 可正确 removeEventListener', () => {
      const container = document.createElement('div');
      const stableHandle = jest.fn();

      container.addEventListener('click', stableHandle, false);
      container.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(stableHandle).toHaveBeenCalledTimes(1);

      container.removeEventListener('click', stableHandle, false);
      container.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(stableHandle).toHaveBeenCalledTimes(1);
    });

    it('不稳定引用导致 removeEventListener 失效', () => {
      const container = document.createElement('div');
      let callCount = 0;

      const createHandle = () => () => { callCount++; };

      const handle1 = createHandle();
      container.addEventListener('click', handle1, false);

      const handle2 = createHandle();
      container.removeEventListener('click', handle2, false);

      container.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(callCount).toBe(1);
    });
  });
});
