# TDD 执行报告：useStepper.ts（web-video-presentation）

## 测试文件
`tests/pages/video-presentation/useStepper.test.ts`

## 被测文件
`.agents/skills/web-video-presentation/templates/src/hooks/useStepper.ts`

## 测试结果

```
Test Suites: 1 passed
Tests:       68 passed, 68 total
```

## 覆盖率

| 指标       | 覆盖率 |
|------------|--------|
| Statements | 98.91% |
| Branch     | 97.05% |
| Functions  | 100%   |
| Lines      | 100%   |

**未覆盖分支**: 行 44 `if (typeof window === "undefined") return fallback;` 的 true 分支（SSR 守卫，jsdom 环境下 window 始终存在，无法触发）

## TDD 发现的 Bug 修复

1. **空 chapters 崩溃**: `chapters[cursor.chapter]!.narrations.length` 在空 chapters 时抛出 `Cannot read properties of undefined`。修复为 `ch ? ch.narrations.length : 0`。

## 测试分类（10 组、68 项用例）

### 1. 初始状态（8 项）
- 默认 cursor 为 {chapter:0, step:0}
- 从 localStorage 恢复有效 cursor
- localStorage 数据 cursor.chapter 越界时 sanitize 到最后一个 chapter
- localStorage 数据 cursor.step 越界时 sanitize 到 chapter 内最大 step
- localStorage 数据为非法 JSON 时回退到默认值
- localStorage 数据为 null 时回退到默认值
- 空 chapters 返回 cursor {0,0}
- cursor 的 chapter/step 为非整数时 sanitize 到最近整数

### 2. next() 导航（6 项）
- 在 chapter 内前进 step
- step 到达 chapter 末尾时跳到下一个 chapter 的 step 0
- 在最后一个 chapter 最后一个 step 时不变
- 单 chapter 单 step 不变
- 连续 next 跨越多 chapter
- 连续 next 到最后保持不动

### 3. prev() 导航（5 项）
- 在 chapter 内后退 step
- step 在 0 时跳到上一个 chapter 的最后一个 step
- 在第一个 chapter step 0 时不变
- 连续 prev 跨越多 chapter
- 连续 prev 到开头保持不动

### 4. jumpToChapter()（6 项）
- 跳转到指定 chapter 和 step
- 默认 step 为 0
- idx 越界（负数）时 clamp 到 0
- idx 越界（超最大）时 clamp 到最后一个 chapter
- step 越界时 clamp 到 chapter 内最大 step
- step 为负数时 clamp 到 0

### 5. jumpToGlobal()（8 项）
- 跳转到第一个全局位置
- 跳转到 chapter 1 的第一个 step（跨 chapter）
- 跳转到 chapter 内中间 step
- 跳转到最后一个全局位置
- g 越界（负数）时 clamp 到 0
- g 越界（超最大）时 clamp 到最后一个位置
- 全局索引在单 chapter 单 step 时只能为 0
- 3 个 chapter 各 2 步时 globalIndex 5 映射到 ch3 step1

### 6. computed values（6 项）
- totalChapters 返回 chapters 数量
- chapterTotalSteps 返回当前 chapter 的 narrations 数量
- globalIndex 返回全局线性索引
- totalGlobal 返回所有 narrations 总数
- 空 chapters 时 totalGlobal 为 0
- globalIndex 在空 chapters 时为 0

### 7. 键盘导航（12 项）
- ArrowRight 触发 next
- Space 触发 next
- ArrowLeft 触发 prev
- Backspace 触发 prev
- Home 跳转到第一个 chapter 第一个 step
- End 跳转到最后一个 chapter 最后一个 step
- 数字键 1 跳转到 chapter 0
- 数字键 3 跳转到 chapter 2
- 数字键超出 chapters 数量时不跳转
- target 为 HTMLInputElement 时不触发导航
- unmount 后不再响应键盘事件
- 不相关的键不触发任何操作

### 8. localStorage 持久化（4 项）
- cursor 变化后写入 localStorage
- jumpToChapter 后 localStorage 更新
- 新 hook 实例从 localStorage 恢复上次的 cursor
- localStorage 写入错误不抛异常

### 9. chapters 变化时 re-sanitize（4 项）
- chapters 减少时 cursor 被 sanitize 到有效范围
- chapters 的 narrations 减少时 step 被 sanitize
- cursor 在有效范围内时 chapters 变化不修改 cursor
- 从空 chapters 切换到有 chapters 时 cursor 更新

### 10. 边界情况（9 项）
- 单 chapter 单 step — next/prev 都不变
- 单 chapter 多 step — next/prev 在范围内正常
- jumpToGlobal 在 totalGlobal=0 时不崩溃
- hook 返回的所有方法为函数
- Cursor 类型导出正确
- StepperState 类型包含所有必要字段
- 大量 chapters 时 computed values 正确（50 chapters × 3 steps）
- 键盘 Space 阻止默认行为
- localStorage 读取错误不抛异常

## 技术要点

- **renderHook + act**: 使用 `@testing-library/react` 的 `renderHook` 测试自定义 hook，`act` 包裹状态变更
- **rerender**: 通过 `renderHook` 的 `rerender` 方法测试 chapters 变化时的 re-sanitize 行为
- **localStorage mock**: 利用 jsdom 提供的 localStorage 直接操作，`beforeEach` 中 `localStorage.clear()` 清理
- **键盘事件模拟**: 自定义 `fireKey` 辅助函数创建 `KeyboardEvent` 并 `dispatchEvent`
- **HTMLInputElement 过滤**: 通过 `Object.defineProperty(event, 'target', ...)` 模拟事件来源为 input 元素
- **sanitize 间接口测试**: 通过 localStorage 初始值 + rerender 间接验证 `sanitize` 函数的所有分支
- **空 chapters 防护**: TDD 发现空 chapters 时 `chapters[0]` 崩溃 bug，已在源码中修复
