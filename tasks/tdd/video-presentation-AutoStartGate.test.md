# TDD 执行报告：AutoStartGate.tsx（web-video-presentation）

## 测试文件
`tests/pages/video-presentation/AutoStartGate.test.tsx`

## 被测文件
`.agents/skills/web-video-presentation/templates/src/components/AutoStartGate.tsx`

## 测试结果

```
Test Suites: 1 passed
Tests:       38 passed, 38 total
Snapshots:   2 passed, 2 total
```

## 覆盖率

| 指标       | 覆盖率 |
|------------|--------|
| Statements | 100%   |
| Branch     | 100%   |
| Functions  | 100%   |
| Lines      | 100%   |

**未覆盖行**: 无

## 测试分类（10 组、38 项用例）

### 1. 渲染逻辑（4 项）
- visible=true 时渲染全屏遮罩
- visible=false 时返回 null
- 从 visible=false 切换到 visible=true 时正确显示
- 从 visible=true 切换到 visible=false 时正确隐藏

### 2. 文本内容（5 项）
- 显示 "AUTO PLAYBACK" kicker
- 显示 "Press SPACE to start" 标题
- 包含 "Audio plays per step" 描述文本
- 包含 M 键快捷键提示
- 包含 "Press ... any time to switch modes" 提示

### 3. 事件处理（4 项）
- 点击遮罩调用 onStart
- 多次点击多次调用 onStart
- visible=false 时点击不触发 onStart（组件不渲染）
- 点击内部 card 区域同样触发 onStart（事件冒泡）

### 4. 键盘交互（3 项）
- tabIndex=0 使组件可聚焦
- Enter 键触发 click 事件
- Space 键在 click handler 中被触发

### 5. A11y 属性（4 项）
- 根元素 role="button"
- 根元素具有 tabIndex=0
- 根元素具有 data-no-advance 属性
- data-no-advance 属性值为 "true"（React 将布尔属性序列化为字符串）

### 6. CSS 类名（6 项）
- 根元素具有 auto-gate 类
- 内部卡片具有 auto-gate-card 类
- kicker 具有 auto-gate-kicker 类
- 标题具有 auto-gate-title 类
- 描述区域具有 auto-gate-sub 类
- kbd 元素存在于描述区域中

### 7. DOM 结构（4 项）
- 根元素 > card 容器（嵌套关系）
- card 内包含 kicker + title + sub 三个子元素
- sub 区域包含 `<br>` 元素
- sub 区域包含 `<kbd>` 元素

### 8. 快照测试（2 项）
- visible=true 匹配快照
- visible=false 匹配快照（空渲染）

### 9. Props 验证（2 项）
- onStart 回调被正确引用（不会覆盖）
- visible 类型边界：truthy 值触发渲染

### 10. unmount 与 rerender 稳定性（4 项）
- unmount 不抛出错误
- visible=false 时 unmount 不抛出错误
- 快速切换 visible 10 次不抛出错误
- 重复 rerender 同样的 props 不抛出错误

## 技术要点

- **CSS mock**: 使用 `identity-obj-proxy` 自动映射 CSS 模块，通过 `jest.mock` 拦截 `.css` 导入
- **data-no-advance 属性**: JSX 中写为 `data-no-advance`（无值），React 将其序列化为 `data-no-advance="true"`，而非 HTML 的空字符串
- **early return 模式**: 组件在 `!visible` 时直接 return null，测试需要覆盖这个分支
- **事件冒泡验证**: 点击 card 内部区域应冒泡到根元素触发 onClick
