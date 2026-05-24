# TDD 执行报告：Example.tsx（web-video-presentation）

## 测试文件
`tests/pages/video-presentation/Example.test.tsx`

## 被测文件
`.agents/skills/web-video-presentation/templates/src/chapters/01-example/Example.tsx`

## 测试结果

```
Test Suites: 1 passed
Tests:       81 passed, 81 total
Snapshots:   3 passed, 3 total
```

## 覆盖率

| 指标       | 覆盖率 |
|------------|--------|
| Statements | 100%   |
| Branch     | 100%   |
| Functions  | 100%   |
| Lines      | 100%   |

**未覆盖行**: 无

## 测试分类（10 组、81 项用例）

### 1. Step 0 — Magazine Cover（23 项）
- DOM 结构：ex-scene、scene-pad、masthead、hr、ex-cover-body、ex-cover-h、ex-cover-foot、dot-accent
- 文本内容：Your Presentation、Issue · 01、Chapter 01 — Example、这是、first step、Tap anywhere to advance
- CSS 类名：serif-cn、serif-it.ex-em、label-mono、kicker
- MaskReveal prop 验证：3 个实例的 show/delay/duration 参数

### 2. Step 1 — Split Layout（20 项）
- DOM 结构：ex-scene、masthead、ex-split、ex-split-num、ex-split-body、ex-split-h、ex-split-p
- 文本内容：Your Presentation、Issue · 01、02、每一步、独占、整个屏幕、theme
- CSS 类名：hero-num、serif-it.ex-em
- MaskReveal prop 验证：3 个实例的 show/delay/duration 参数

### 3. Step 2 — Pull-Quote Close（17 项）
- DOM 结构：ex-scene、ex-close、ex-close-inner、pull-quote、ex-quote、ex-close-foot
- 负向断言：不应渲染 masthead
- 文本内容：Now、Replace this with、your own、chapters.、SKILL.md
- CSS 类名：label-mono
- MaskReveal prop 验证：3 个实例的 show/delay/duration 参数（duration=1100, delay=400/760）

### 4. 边界 step 值（4 项）
- step=3 应回退到 default（close 布局）
- step=100 应回退到 default
- step=-1 应回退到 default
- step=999 应回退到 default

### 5. 快照测试（3 项）
- Step 0/1/2 各生成一个 snapshot，捕获 DOM 结构变化

### 6. Step 切换隔离（3 项）
- step 0→1 后封面内容消失
- step 1→2 后分割布局消失
- step 2→0 后 close 内容消失

### 7. rerender 稳定性（1 项）
- 10 次 rerender 循环（step 0/1/2）不抛出错误

### 8. 语义化 HTML（4 项）
- Step 0 使用 header + h1
- Step 1 使用 header + h2

### 9. unmount 清理（3 项）
- step 0/1/2 unmount 不抛出错误

### 10. CSS 类名完整性（3 项）
- 每个 step 的所有关键 CSS 选择器批量验证

## 技术要点

- **MaskReveal mock**: 通过 data-testid + data-* 属性透传 props，实现精确断言
- **nbsp 处理**: 源码中 `&nbsp;` 渲染为 U+00A0，`screen.getByText` 无法用正则匹配，改用 `querySelector` + `textContent`
- **CSS 变量 inline style**: jsdom 不解析 CSS 自定义属性（`var(--space-5)`），`style.marginTop` 返回空字符串，仅验证 DOM 节点存在
- **边界 step**: if-else 链无 else-if 约束，step !== 0 && step !== 1 时一律回退到 default 分支
